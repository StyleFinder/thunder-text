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

    logger.info("[Shopify Callback] Processing OAuth callback", {
      component: "callback",
      shop,
      hasHmac: !!hmac,
      statePrefix: state.substring(0, 20),
    });

    // SECURITY: Verify HMAC FIRST - this proves request came from Shopify
    // This is REQUIRED for Shopify's hosted OAuth flow which bypasses our state cookie
    let hmacValid = false;
    if (hmac) {
      const params = new URLSearchParams(searchParams);
      params.delete("hmac");
      params.delete("signature");
      const message = params.toString();

      const generatedHash = crypto
        .createHmac("sha256", process.env.SHOPIFY_API_SECRET!)
        .update(message)
        .digest("hex");

      if (generatedHash === hmac) {
        hmacValid = true;
        logger.info("[Shopify Callback] HMAC verification passed", {
          component: "callback",
          shop,
        });
      } else {
        logger.error("[Shopify Callback] HMAC verification failed", undefined, {
          component: "callback",
          shop,
        });
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/auth/error?error=invalid_hmac`,
        );
      }
    }

    // Check if we have a stored state cookie (from our /api/auth/shopify flow)
    const stateMatchesStored = await verifyStoredOAuthState(state, "shopify");

    // SECURITY FLOW DETERMINATION:
    // 1. If state cookie exists and matches → our custom OAuth flow (full validation)
    // 2. If no state cookie BUT HMAC is valid → Shopify hosted OAuth flow (trust Shopify)
    // 3. If neither → reject the request

    if (stateMatchesStored) {
      // OUR CUSTOM OAUTH FLOW: Full state validation
      logger.info(
        "[Shopify Callback] Using custom OAuth flow with state cookie",
        {
          component: "callback",
          shop,
        },
      );

      // Clear the stored state immediately (single-use)
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
    } else if (hmacValid) {
      // SHOPIFY HOSTED OAUTH FLOW: Trust HMAC verification
      // When users install via Shopify App Store or hosted OAuth URL, they don't go
      // through our /api/auth/shopify route, so no state cookie is set.
      // Shopify's HMAC verification proves this request came from Shopify.
      logger.info(
        "[Shopify Callback] Using Shopify hosted OAuth flow (HMAC verified, no state cookie)",
        {
          component: "callback",
          shop,
          note: "User likely installed via Shopify App Store or direct hosted OAuth URL",
        },
      );
    } else {
      // INVALID: No state cookie AND no valid HMAC
      logger.error(
        "[Shopify Callback] Security validation failed - no state cookie and no valid HMAC",
        undefined,
        {
          component: "callback",
          shop,
          hint: "Request may be a replay attack or from unknown source",
        },
      );
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/auth/error?error=invalid_state`,
      );
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
    const userEmail = session?.user?.email;

    logger.info("[Shopify Callback] Session state", {
      component: "callback",
      shop: fullShopDomain,
      hasSession: !!session,
      hasUserId: !!userId,
      hasUserEmail: !!userEmail,
    });

    // Check if shop already exists by Shopify domain
    const { data: existingShop } = await supabaseAdmin
      .from("shops")
      .select("id")
      .eq("shop_domain", fullShopDomain)
      .single();

    // Also check for a pending shop record for this user (created during email/password signup)
    // Pending shop domains follow the pattern: pending-{timestamp}.{any-domain}
    //
    // IMPORTANT: Session may not be preserved across Shopify OAuth redirect (different domain).
    // We use multiple fallback strategies to find the pending shop:
    // 1. By userId (if session is preserved)
    // 2. By email (fallback if userId not available but email is)
    // 3. Most recent pending shop created in last 30 min (last resort fallback)
    let pendingShop = null;
    if (!existingShop) {
      // Strategy 1: Try to find by userId
      if (userId) {
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
          logger.info("[Shopify Callback] Found pending shop by userId", {
            component: "callback",
            userId,
            pendingShopId: pendingRecord.id,
            shop: fullShopDomain,
          });
        }
      }

      // Strategy 2: Try to find by email (fallback if session userId not available)
      if (!pendingShop && userEmail) {
        const { data: pendingByEmail } = await supabaseAdmin
          .from("shops")
          .select(
            "id, email, store_name, owner_name, owner_phone, city, state, store_type, years_in_business, industry_niche, advertising_goals",
          )
          .eq("email", userEmail.toLowerCase())
          .like("shop_domain", "pending-%")
          .single();

        if (pendingByEmail) {
          pendingShop = pendingByEmail;
          logger.info("[Shopify Callback] Found pending shop by email", {
            component: "callback",
            email: userEmail,
            pendingShopId: pendingByEmail.id,
            shop: fullShopDomain,
          });
        }
      }

      // Strategy 3: Last resort - find the most recent pending shop created in last 30 minutes
      // This handles cases where session cookies aren't preserved across OAuth redirect
      if (!pendingShop) {
        const thirtyMinutesAgo = new Date(
          Date.now() - 30 * 60 * 1000,
        ).toISOString();
        const { data: recentPending } = await supabaseAdmin
          .from("shops")
          .select(
            "id, email, store_name, owner_name, owner_phone, city, state, store_type, years_in_business, industry_niche, advertising_goals, created_at",
          )
          .like("shop_domain", "pending-%")
          .gte("created_at", thirtyMinutesAgo)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (recentPending) {
          pendingShop = recentPending;
          logger.info(
            "[Shopify Callback] Found pending shop by recent timestamp (fallback)",
            {
              component: "callback",
              pendingShopId: recentPending.id,
              pendingEmail: recentPending.email,
              createdAt: recentPending.created_at,
              shop: fullShopDomain,
            },
          );
        }
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
    // - New installation with store info filled → welcome step 3 (social/Add platforms)
    // - New installation without store info → welcome step 1 (start from beginning)
    let redirectUrl: string;

    if (!isNewInstallation) {
      // Re-authentication of existing shop
      redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?shop=${fullShopDomain}&authenticated=true`;
    } else if (hasCompletedStoreInfo) {
      // User filled in store info during welcome, now connected Shopify → continue to step 3 (Add platforms)
      redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/welcome?step=social&shop=${fullShopDomain}`;
    } else {
      // Fresh installation without prior store info → start welcome flow from beginning
      redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/welcome?shop=${fullShopDomain}`;
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
