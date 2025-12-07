import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { logger } from "@/lib/logger";

/**
 * Unified Shopify OAuth Callback Handler
 *
 * This handles OAuth callbacks for all Shopify authentication flows:
 * - Welcome page flow (new installations) → redirects to /welcome?step=social
 * - Embedded app flow (re-authentication) → redirects to /dashboard
 *
 * Security features:
 * - State parameter validation (CSRF protection)
 * - Stored state verification (replay attack prevention)
 * - HMAC verification (Shopify security)
 * - Single-use state tokens
 */
export async function GET(req: NextRequest) {
  // Check if we're in a build environment without proper configuration
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co"
  ) {
    return NextResponse.json(
      { error: "Application not properly configured" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const shop = searchParams.get("shop");
  const state = searchParams.get("state");
  const hmac = searchParams.get("hmac");

  if (!code || !shop || !state) {
    logger.error("[Shopify Callback] Missing required parameters", undefined, {
      component: "callback",
      hasCode: !!code,
      hasShop: !!shop,
      hasState: !!state,
    });
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/auth/error?error=oauth_failed`,
    );
  }

  try {
    // Dynamic imports to avoid loading during build
    const { supabaseAdmin } = await import("@/lib/supabase/admin");
    const {
      validateShopifyOAuthState,
      verifyStoredOAuthState,
      clearStoredOAuthState,
      isStandaloneShopifyLinkState,
      validateStandaloneShopifyLinkState,
    } = await import("@/lib/security/oauth-validation");

    // SECURITY: Verify stored state to prevent replay attacks
    // This checks that the returned state matches exactly what we generated
    // Check both regular "shopify" and "shopify_link" state types
    const isLinkState = isStandaloneShopifyLinkState(state);
    const stateType = isLinkState ? "shopify_link" : "shopify";

    logger.info("[Shopify Callback] Verifying OAuth state", {
      component: "callback",
      shop,
      stateType,
      isLinkState,
      statePrefix: state.substring(0, 20),
    });

    const stateMatchesStored = await verifyStoredOAuthState(state, stateType);
    if (!stateMatchesStored) {
      logger.error(
        "[Shopify Callback] State replay attack detected - state does not match stored value",
        undefined,
        {
          component: "callback",
          shop,
          stateType,
          hint: "Cookie may not have been set or was cleared. Check link route logs.",
        },
      );
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/auth/error?error=invalid_state`,
      );
    }

    // SECURITY: Clear the stored state immediately (single-use)
    await clearStoredOAuthState(stateType);

    // Validate state parameter format and contents (CSRF protection)
    // Skip this for link states - they use a different schema and are validated later
    if (!isLinkState) {
      try {
        validateShopifyOAuthState(state, shop);
      } catch (error) {
        logger.error(
          "[Shopify Callback] State validation failed",
          error as Error,
          {
            component: "callback",
            shop,
          },
        );
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/auth/error?error=invalid_state`,
        );
      }
    }

    // Verify HMAC if present (Shopify security check)
    if (hmac) {
      const params = new URLSearchParams(searchParams);
      params.delete("hmac");
      params.delete("signature");
      const message = params.toString();

      const generatedHash = crypto
        .createHmac("sha256", process.env.SHOPIFY_API_SECRET!)
        .update(message)
        .digest("hex");

      if (generatedHash !== hmac) {
        logger.error("[Shopify Callback] HMAC verification failed", undefined, {
          component: "callback",
          shop,
        });
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/auth/error?error=invalid_hmac`,
        );
      }
    }

    // Exchange code for access token
    const tokenResponse = await fetch(
      `https://${shop}/admin/oauth/access_token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: process.env.SHOPIFY_API_KEY,
          client_secret: process.env.SHOPIFY_API_SECRET,
          code,
        }),
      },
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      logger.error("[Shopify Callback] Token exchange failed", undefined, {
        component: "callback",
        shop,
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        errorText,
      });
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/auth/error?error=token_exchange_failed`,
      );
    }

    const { access_token, scope } = await tokenResponse.json();

    // Normalize shop domain
    const fullShopDomain = shop.includes(".myshopify.com")
      ? shop
      : `${shop}.myshopify.com`;

    // ============================================================
    // STANDALONE USER SHOPIFY LINK FLOW
    // ============================================================
    // Check if this is a standalone user linking to a Shopify store
    if (isStandaloneShopifyLinkState(state)) {
      try {
        // Validate the standalone link state
        const linkState = validateStandaloneShopifyLinkState(
          state,
          fullShopDomain,
        );

        logger.info("[Shopify Callback] Processing standalone user link", {
          component: "callback",
          standaloneUserId: linkState.standalone_user_id,
          targetShop: fullShopDomain,
        });

        // Verify the standalone user still exists
        const { data: standaloneUser, error: userError } = await supabaseAdmin
          .from("shops")
          .select("id, shop_domain, shop_type, email")
          .eq("id", linkState.standalone_user_id)
          .eq("shop_type", "standalone")
          .single();

        if (userError || !standaloneUser) {
          logger.error(
            "[Shopify Callback] Standalone user not found during link",
            undefined,
            {
              component: "callback",
              standaloneUserId: linkState.standalone_user_id,
              error: userError?.message,
            },
          );
          return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/auth/error?error=user_not_found`,
          );
        }

        // Update the standalone user with the linked Shopify domain and access token
        const { error: updateError } = await supabaseAdmin
          .from("shops")
          .update({
            linked_shopify_domain: fullShopDomain,
            shopify_access_token: access_token,
            shopify_scope: scope || "",
            updated_at: new Date().toISOString(),
          })
          .eq("id", standaloneUser.id);

        if (updateError) {
          logger.error(
            "[Shopify Callback] Failed to link Shopify domain",
            updateError as Error,
            {
              component: "callback",
              standaloneUserId: standaloneUser.id,
              targetShop: fullShopDomain,
            },
          );
          return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/auth/error?error=link_failed`,
          );
        }

        logger.info(
          "[Shopify Callback] Successfully linked standalone user to Shopify",
          {
            component: "callback",
            standaloneUserId: standaloneUser.id,
            standaloneEmail: standaloneUser.email,
            linkedShop: fullShopDomain,
          },
        );

        // Redirect back to connections page with success message
        // Use the linked Shopify domain for the shop param (not email)
        const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/settings/connections?shop=${encodeURIComponent(fullShopDomain)}&shopify_linked=true&message=${encodeURIComponent(`Successfully linked to ${fullShopDomain}`)}`;

        return NextResponse.redirect(redirectUrl);
      } catch (linkError) {
        logger.error(
          "[Shopify Callback] Standalone link validation failed",
          linkError as Error,
          {
            component: "callback",
            shop: fullShopDomain,
          },
        );
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/auth/error?error=invalid_link_state`,
        );
      }
    }

    // ============================================================
    // STANDARD SHOPIFY OAUTH FLOW (New installations or re-auth)
    // ============================================================

    // Check if shop already exists
    const { data: existingShop } = await supabaseAdmin
      .from("shops")
      .select("id")
      .eq("shop_domain", fullShopDomain)
      .single();

    let shopId: string;
    let isNewInstallation = false;

    if (existingShop) {
      shopId = existingShop.id;

      // Update existing shop
      await supabaseAdmin
        .from("shops")
        .update({
          access_token,
          scope: scope || "",
          shop_type: "shopify",
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", shopId);

      logger.info("[Shopify Callback] Updated existing shop", {
        component: "callback",
        shop: fullShopDomain,
      });
    } else {
      // Create new shop
      isNewInstallation = true;

      const { data: newShop, error: insertError } = await supabaseAdmin
        .from("shops")
        .insert({
          shop_domain: fullShopDomain,
          access_token,
          scope: scope || "",
          shop_type: "shopify",
          is_active: true,
          installed_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertError || !newShop) {
        logger.error(
          "[Shopify Callback] Error creating shop:",
          insertError as Error,
          {
            component: "callback",
            shop: fullShopDomain,
          },
        );
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/auth/error?error=database_error`,
        );
      }

      shopId = newShop.id;

      // Grant Default Trial Subscription (14 Days) for new installations
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 14);

      const { error: subError } = await supabaseAdmin
        .from("subscriptions")
        .insert({
          shop_id: shopId,
          product: "bundle_all", // Grant access to everything during trial
          status: "trialing",
          current_period_start: new Date().toISOString(),
          current_period_end: trialEndDate.toISOString(),
        });

      if (subError) {
        logger.error(
          "[Shopify Callback] Failed to create trial subscription:",
          subError as Error,
          {
            component: "callback",
            shop: fullShopDomain,
          },
        );
        // Don't fail - user just won't have trial access
      } else {
        logger.info("[Shopify Callback] Granted 14-day trial subscription", {
          component: "callback",
          shop: fullShopDomain,
        });
      }

      // Initialize default prompts for new installations
      try {
        const { initializeDefaultPrompts } = await import("@/lib/prompts");
        await initializeDefaultPrompts(shopId);
        logger.info("[Shopify Callback] Initialized default prompts", {
          component: "callback",
          shop: fullShopDomain,
        });
      } catch (promptError) {
        logger.error(
          "[Shopify Callback] Failed to initialize default prompts:",
          promptError as Error,
          {
            component: "callback",
            shop: fullShopDomain,
          },
        );
        // Don't fail - prompts can be initialized later
      }
    }

    // Determine redirect destination based on flow
    // New installations go to welcome flow, existing shops go to dashboard
    const redirectUrl = isNewInstallation
      ? `${process.env.NEXT_PUBLIC_APP_URL}/welcome?step=social&shop=${fullShopDomain}`
      : `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?shop=${fullShopDomain}&authenticated=true`;

    // Set session cookie and redirect
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set("shopify_shop", fullShopDomain, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    logger.info("[Shopify Callback] Authentication successful", {
      component: "callback",
      shop: fullShopDomain,
      isNewInstallation,
      redirectTo: isNewInstallation ? "welcome" : "dashboard",
    });

    return response;
  } catch (error) {
    logger.error("[Shopify Callback] Unexpected error:", error as Error, {
      component: "callback",
      shop,
    });
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/auth/error?error=server_error`,
    );
  }
}
