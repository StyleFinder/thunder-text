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

    // DIAGNOSTIC: Log detailed session state for debugging
    logger.info("[Shopify Callback] Session state (DIAGNOSTIC)", {
      component: "callback",
      shop: fullShopDomain,
      hasSession: !!session,
      hasUserId: !!userId,
      hasUserEmail: !!userEmail,
      userId: userId || "NONE",
      userEmail: userEmail || "NONE",
      sessionUser: session?.user
        ? {
            id: session.user.id,
            email: session.user.email,
            shopDomain: (session.user as { shopDomain?: string }).shopDomain,
            hasShopifyLinked: (session.user as { hasShopifyLinked?: boolean })
              .hasShopifyLinked,
          }
        : "NO SESSION",
    });

    // Check if shop already exists by Shopify domain
    const { data: existingShop } = await supabaseAdmin
      .from("shops")
      .select("id, email, store_name, owner_name")
      .eq("shop_domain", fullShopDomain)
      .single();

    // ALWAYS check for a pending shop record for this user (created during email/password signup)
    // This is checked REGARDLESS of whether existingShop exists, because:
    // - User may have signed up with email/password, filled in store info
    // - Then connected a Shopify store that was previously installed (creating a separate record)
    // - We need to merge the pending shop data into the existing shop
    //
    // Pending shop domains follow the pattern: pending-{timestamp}.{any-domain}
    //
    // IMPORTANT: Session may not be preserved across Shopify OAuth redirect (different domain).
    // We use multiple fallback strategies to find the pending shop:
    // 1. By userId (if session is preserved)
    // 2. By email (fallback if userId not available but email is)
    // 3. Most recent pending shop created in last 30 min (last resort fallback)
    let pendingShop = null;
    {
      // Strategy 1: Try to find by userId
      if (userId) {
        const { data: pendingRecord } = await supabaseAdmin
          .from("shops")
          .select(
            "id, email, store_name, owner_name, owner_phone, city, state, store_type, years_in_business, industry_niche, advertising_goals, shop_domain",
          )
          .eq("id", userId)
          .like("shop_domain", "pending-%")
          .maybeSingle();

        if (pendingRecord) {
          pendingShop = pendingRecord;
          logger.info("[Shopify Callback] Found pending shop by userId", {
            component: "callback",
            userId,
            pendingShopId: pendingRecord.id,
            pendingShopDomain: pendingRecord.shop_domain,
            pendingStoreName: pendingRecord.store_name,
            shop: fullShopDomain,
          });
        }
      }

      // Strategy 2: Try to find by email (fallback if session userId not available)
      if (!pendingShop && userEmail) {
        const { data: pendingByEmail } = await supabaseAdmin
          .from("shops")
          .select(
            "id, email, store_name, owner_name, owner_phone, city, state, store_type, years_in_business, industry_niche, advertising_goals, shop_domain",
          )
          .eq("email", userEmail.toLowerCase())
          .like("shop_domain", "pending-%")
          .maybeSingle();

        if (pendingByEmail) {
          pendingShop = pendingByEmail;
          logger.info("[Shopify Callback] Found pending shop by email", {
            component: "callback",
            email: userEmail,
            pendingShopId: pendingByEmail.id,
            pendingShopDomain: pendingByEmail.shop_domain,
            pendingStoreName: pendingByEmail.store_name,
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

        // Use maybeSingle() instead of single() to avoid errors when no results found
        const { data: recentPending, error: recentError } = await supabaseAdmin
          .from("shops")
          .select(
            "id, email, store_name, owner_name, owner_phone, city, state, store_type, years_in_business, industry_niche, advertising_goals, created_at, shop_domain",
          )
          .like("shop_domain", "pending-%")
          .gte("created_at", thirtyMinutesAgo)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (recentPending) {
          pendingShop = recentPending;
          logger.info(
            "[Shopify Callback] Found pending shop by recent timestamp (fallback)",
            {
              component: "callback",
              pendingShopId: recentPending.id,
              pendingEmail: recentPending.email,
              pendingShopDomain: recentPending.shop_domain,
              pendingStoreName: recentPending.store_name,
              createdAt: recentPending.created_at,
              shop: fullShopDomain,
            },
          );
        } else {
          logger.warn(
            "[Shopify Callback] Strategy 3 FAILED - no recent pending shops found",
            {
              component: "callback",
              shop: fullShopDomain,
              thirtyMinutesAgo,
              error: recentError?.message,
              hint: "Check if pending shop was already merged or deleted, or if it was created more than 30 minutes ago",
            },
          );
        }
      }

      // DIAGNOSTIC: Log final pending shop state
      logger.info(
        "[Shopify Callback] Pending shop lookup RESULT (DIAGNOSTIC)",
        {
          component: "callback",
          shop: fullShopDomain,
          foundPendingShop: !!pendingShop,
          pendingShopId: pendingShop?.id || "NONE",
          pendingShopEmail: pendingShop?.email || "NONE",
          pendingShopStoreName: pendingShop?.store_name || "NULL",
          pendingShopOwnerName: pendingShop?.owner_name || "NULL",
          strategyUsed: pendingShop
            ? userId && pendingShop.id === userId
              ? "Strategy1-userId"
              : userEmail && pendingShop.email === userEmail?.toLowerCase()
                ? "Strategy2-email"
                : "Strategy3-recentTimestamp"
            : "NONE_FOUND",
        },
      );
    }

    let shopId: string;
    let isNewInstallation = false;
    let hasCompletedStoreInfo = false;

    if (existingShop && pendingShop) {
      // CASE 1: Both existing Shopify shop AND pending signup exist
      // Merge the pending shop data into the existing shop, then delete the pending record
      shopId = existingShop.id;

      // Check if user filled in store info during welcome flow
      hasCompletedStoreInfo = !!(
        pendingShop.store_name && pendingShop.owner_name
      );

      // Merge pending shop data into existing shop
      // Only update fields that are missing in the existing shop
      const mergeData: Record<string, unknown> = {
        shopify_access_token: access_token,
        shopify_scope: scope || "",
        shop_type: "shopify",
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      // Transfer data from pending shop if existing shop doesn't have it
      if (!existingShop.email && pendingShop.email) {
        mergeData.email = pendingShop.email;
      }
      if (!existingShop.store_name && pendingShop.store_name) {
        mergeData.store_name = pendingShop.store_name;
        mergeData.display_name = pendingShop.store_name;
      }
      if (!existingShop.owner_name && pendingShop.owner_name) {
        mergeData.owner_name = pendingShop.owner_name;
      }

      // Copy additional profile fields from pending shop
      if (pendingShop.owner_phone)
        mergeData.owner_phone = pendingShop.owner_phone;
      if (pendingShop.city) mergeData.city = pendingShop.city;
      if (pendingShop.state) mergeData.state = pendingShop.state;
      if (pendingShop.store_type) mergeData.store_type = pendingShop.store_type;
      if (pendingShop.years_in_business)
        mergeData.years_in_business = pendingShop.years_in_business;
      if (pendingShop.industry_niche)
        mergeData.industry_niche = pendingShop.industry_niche;
      if (pendingShop.advertising_goals)
        mergeData.advertising_goals = pendingShop.advertising_goals;

      // Also transfer password_hash so user can still log in with email/password
      // We need to fetch this separately since it wasn't in our select
      const { data: pendingWithPassword } = await supabaseAdmin
        .from("shops")
        .select("password_hash")
        .eq("id", pendingShop.id)
        .single();

      if (pendingWithPassword?.password_hash) {
        mergeData.password_hash = pendingWithPassword.password_hash;
      }

      await supabaseAdmin.from("shops").update(mergeData).eq("id", shopId);

      // Delete the pending shop record to avoid duplicates
      await supabaseAdmin.from("shops").delete().eq("id", pendingShop.id);

      logger.info(
        "[Shopify Callback] Merged pending shop INTO existing Shopify shop",
        {
          component: "callback",
          shop: fullShopDomain,
          existingShopId: existingShop.id,
          deletedPendingShopId: pendingShop.id,
          hasCompletedStoreInfo,
          mergedData: {
            email: mergeData.email || "(kept existing)",
            store_name: mergeData.store_name || "(kept existing)",
            owner_name: mergeData.owner_name || "(kept existing)",
          },
        },
      );

      // Treat as new installation if the existing shop didn't have complete profile
      isNewInstallation = !existingShop.store_name || !existingShop.owner_name;
    } else if (existingShop) {
      // CASE 2: Only existing Shopify shop (re-authentication OR fresh install on previously used shop)
      shopId = existingShop.id;

      // Check if this is truly a re-auth (shop has complete info) or a fresh install (shop lacks info)
      // The shop might exist from a previous uninstall/reinstall cycle without complete setup
      const existingHasCompleteInfo = !!(
        existingShop.store_name && existingShop.owner_name
      );

      // If shop doesn't have complete info, treat as new installation
      if (!existingHasCompleteInfo) {
        isNewInstallation = true;
        logger.info(
          "[Shopify Callback] Existing shop lacks complete profile - treating as new installation",
          {
            component: "callback",
            shop: fullShopDomain,
            existingStoreName: existingShop.store_name || "NULL",
            existingOwnerName: existingShop.owner_name || "NULL",
          },
        );
      }

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
        isNewInstallation,
        hasCompleteInfo: existingHasCompleteInfo,
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

    // DIAGNOSTIC: Log decision factors
    logger.info("[Shopify Callback] Redirect decision factors (DIAGNOSTIC)", {
      component: "callback",
      shop: fullShopDomain,
      isNewInstallation,
      hasCompletedStoreInfo,
      existingShopFound: !!existingShop,
      pendingShopFound: !!pendingShop,
    });

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

    // DIAGNOSTIC: Log final redirect decision
    logger.info("[Shopify Callback] FINAL REDIRECT (DIAGNOSTIC)", {
      component: "callback",
      shop: fullShopDomain,
      redirectUrl,
      redirectDestination: redirectUrl.includes("/dashboard")
        ? "DASHBOARD"
        : redirectUrl.includes("step=social")
          ? "WELCOME_STEP3_SOCIAL"
          : "WELCOME_STEP1",
      reason: !isNewInstallation
        ? "Existing shop re-auth"
        : hasCompletedStoreInfo
          ? "New install with store info completed"
          : "New install without store info",
    });

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
