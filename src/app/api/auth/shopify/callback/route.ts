import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { logger } from "@/lib/logger";

/**
 * Shopify OAuth Callback Handler
 *
 * This handles OAuth callbacks for Shopify authentication:
 * - New installations → creates shop record, redirects to /welcome?step=social
 * - Re-authentication → updates tokens, redirects to /dashboard
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
    } = await import("@/lib/security/oauth-validation");

    // SECURITY: Verify stored state to prevent replay attacks
    logger.info("[Shopify Callback] Verifying OAuth state", {
      component: "callback",
      shop,
      statePrefix: state.substring(0, 20),
    });

    const stateMatchesStored = await verifyStoredOAuthState(state, "shopify");
    if (!stateMatchesStored) {
      logger.error(
        "[Shopify Callback] State replay attack detected - state does not match stored value",
        undefined,
        {
          component: "callback",
          shop,
          hint: "Cookie may not have been set or was cleared.",
        },
      );
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/auth/error?error=invalid_state`,
      );
    }

    // SECURITY: Clear the stored state immediately (single-use)
    await clearStoredOAuthState("shopify");

    // Validate state parameter format and contents (CSRF protection)
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

    // Get the current user session (if logged in via email/password signup)
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    // Check if shop already exists by Shopify domain
    const { data: existingShop } = await supabaseAdmin
      .from("shops")
      .select("id")
      .eq("shop_domain", fullShopDomain)
      .single();

    // Also check for a pending shop record for this user (created during email/password signup)
    // Pending shop domains follow the pattern: pending-{timestamp}.{any-domain}
    let pendingShop = null;
    if (userId && !existingShop) {
      const { data: pendingRecord } = await supabaseAdmin
        .from("shops")
        .select(
          "id, email, store_name, owner_name, owner_phone, city, state, store_type, years_in_business, industry_niche, advertising_goals",
        )
        .eq("id", userId)
        .like("shop_domain", "pending-%")
        .single();

      if (pendingRecord) {
        pendingShop = pendingRecord;
        logger.info("[Shopify Callback] Found pending shop record for user", {
          component: "callback",
          userId,
          pendingShopId: pendingRecord.id,
          shop: fullShopDomain,
        });
      }
    }

    let shopId: string;
    let isNewInstallation = false;
    let hasCompletedStoreInfo = false;

    if (existingShop) {
      shopId = existingShop.id;

      // Update existing shop with new tokens
      await supabaseAdmin
        .from("shops")
        .update({
          shopify_access_token: access_token,
          shopify_scope: scope || "",
          shop_type: "shopify",
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", shopId);

      logger.info("[Shopify Callback] Updated existing shop", {
        component: "callback",
        shop: fullShopDomain,
      });
    } else if (pendingShop) {
      // User signed up via email/password and now connecting Shopify
      // Update the pending shop record with real Shopify domain
      shopId = pendingShop.id;
      isNewInstallation = true;

      // Check if user already filled in store info during welcome flow
      // If store_name exists, they've completed the store info step
      hasCompletedStoreInfo = !!(
        pendingShop.store_name && pendingShop.owner_name
      );

      await supabaseAdmin
        .from("shops")
        .update({
          shop_domain: fullShopDomain,
          shopify_access_token: access_token,
          shopify_scope: scope || "",
          shop_type: "shopify",
          is_active: true,
          installed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", shopId);

      logger.info("[Shopify Callback] Merged pending shop with Shopify store", {
        component: "callback",
        shop: fullShopDomain,
        pendingShopId: shopId,
        hasCompletedStoreInfo,
        preservedData: {
          email: pendingShop.email,
          store_name: pendingShop.store_name,
          owner_name: pendingShop.owner_name,
        },
      });
    } else {
      // Create new shop (direct Shopify OAuth without prior signup)
      isNewInstallation = true;

      const { data: newShop, error: insertError } = await supabaseAdmin
        .from("shops")
        .insert({
          shop_domain: fullShopDomain,
          shopify_access_token: access_token,
          shopify_scope: scope || "",
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
    }

    // For new installations (both fresh and pending shop merges), set up subscription and prompts
    if (isNewInstallation) {
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
    // - Existing shops (re-auth) → dashboard
    // - New installation with store info already filled → dashboard
    // - New installation without store info → welcome flow
    let redirectUrl: string;

    if (!isNewInstallation) {
      // Re-authentication of existing shop
      redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?shop=${fullShopDomain}&authenticated=true`;
    } else if (hasCompletedStoreInfo) {
      // User already filled in store info during welcome, now connected Shopify → go to dashboard
      redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?shop=${fullShopDomain}&authenticated=true`;
    } else {
      // Fresh installation without prior store info → welcome flow
      redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/welcome?step=social&shop=${fullShopDomain}`;
    }

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
      hasCompletedStoreInfo,
      redirectTo: redirectUrl.includes("/dashboard") ? "dashboard" : "welcome",
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
