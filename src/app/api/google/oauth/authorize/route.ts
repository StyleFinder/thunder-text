/**
 * Google Ads OAuth Authorization Endpoint
 *
 * GET /api/google/oauth/authorize
 *
 * Purpose: Initiate Google OAuth flow by redirecting user to Google consent screen
 *
 * Flow:
 * 1. Verify user is authenticated
 * 2. Get shop context from query params
 * 3. Generate secure state parameter with shop info
 * 4. Redirect to Google OAuth consent screen
 *
 * Query Parameters:
 * - shop: Shop domain (e.g., zunosai-staging-test-store.myshopify.com)
 * - return_to: Optional return path after OAuth (e.g., /onboarding/welcome)
 *
 * Environment Variables Required:
 * - GOOGLE_ADS_CLIENT_ID
 * - GOOGLE_ADS_REDIRECT_URI (or NEXT_PUBLIC_APP_URL for dynamic construction)
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createGoogleOAuthState } from "@/lib/security/oauth-validation";
import { logger } from "@/lib/logger";
import { lookupShopWithFallback } from "@/lib/shop-lookup";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shop = searchParams.get("shop");
  const returnTo = searchParams.get("return_to");

  try {
    if (!shop) {
      return NextResponse.json(
        { error: "Missing shop parameter" },
        { status: 400 },
      );
    }

    // Verify environment variables
    const googleClientId = process.env.GOOGLE_ADS_CLIENT_ID;
    if (!googleClientId) {
      logger.error("GOOGLE_ADS_CLIENT_ID not configured", undefined, {
        component: "authorize",
      });
      return NextResponse.json(
        { error: "Google Ads integration not configured" },
        { status: 500 },
      );
    }

    // Get shop from database using admin client (with fallback for standalone users)
    const { data: shopData, error: shopError } = await lookupShopWithFallback<{
      id: string;
      shop_domain: string;
      shop_type: string;
      linked_shopify_domain: string | null;
    }>(
      supabaseAdmin,
      shop,
      "id, shop_domain, shop_type, linked_shopify_domain",
      "google-oauth",
    );

    if (shopError || !shopData) {
      logger.error(`Shop not found: ${shop}`, shopError as Error, {
        component: "authorize",
      });
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // For standalone users, resolve the MASTER shop ID
    // Integrations should be stored on the master Shopify shop, not the standalone user
    let targetShopId = shopData.id;
    let targetShopDomain = shopData.shop_domain;

    if (shopData.shop_type === "standalone" && shopData.linked_shopify_domain) {
      // Look up the master shop
      const { data: masterShop, error: masterError } = await supabaseAdmin
        .from("shops")
        .select("id, shop_domain")
        .eq("shop_domain", shopData.linked_shopify_domain)
        .eq("shop_type", "shopify")
        .single();

      if (masterShop && !masterError) {
        targetShopId = masterShop.id;
        targetShopDomain = masterShop.shop_domain;
        logger.info(
          "[Google OAuth] Standalone user - using master shop for integration",
          {
            component: "authorize",
            standaloneEmail: shopData.shop_domain,
            masterShopDomain: masterShop.shop_domain,
            masterShopId: masterShop.id,
          },
        );
      } else {
        logger.error(
          "[Google OAuth] Standalone user has linked_shopify_domain but master shop not found",
          masterError as Error,
          {
            component: "authorize",
            standaloneEmail: shopData.shop_domain,
            linkedShopifyDomain: shopData.linked_shopify_domain,
          },
        );
        return NextResponse.json(
          {
            error:
              "Your account is not properly linked to a Shopify store. Please contact support.",
          },
          { status: 400 },
        );
      }
    }

    // Generate secure state parameter with Zod validation
    // Includes cryptographic nonce for CSRF protection and timestamp for replay attack prevention
    // Use the master shop ID and domain for state
    const shopDomainForState = targetShopDomain.includes(".myshopify.com")
      ? targetShopDomain
      : shop.includes(".myshopify.com")
        ? shop
        : targetShopDomain;

    const state = createGoogleOAuthState({
      shop_id: targetShopId, // Use master shop ID for standalone users
      shop_domain: shopDomainForState,
      host: searchParams.get("host"),
      embedded: searchParams.get("embedded"),
      return_to: returnTo,
    });

    // Construct redirect URI
    const redirectUri =
      process.env.GOOGLE_ADS_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/google/oauth/callback`;

    // Build Google OAuth URL
    const googleAuthUrl = new URL(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    googleAuthUrl.searchParams.set("client_id", googleClientId);
    googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
    googleAuthUrl.searchParams.set("state", state);
    googleAuthUrl.searchParams.set("response_type", "code");
    googleAuthUrl.searchParams.set("access_type", "offline"); // Get refresh token
    googleAuthUrl.searchParams.set("prompt", "consent"); // Force consent screen to get refresh token

    // Request required scopes for Google Ads
    // https://developers.google.com/google-ads/api/docs/oauth/overview
    const scopes = [
      "https://www.googleapis.com/auth/adwords", // Google Ads API access
      "https://www.googleapis.com/auth/userinfo.email", // User email
      "https://www.googleapis.com/auth/userinfo.profile", // User profile
    ];
    googleAuthUrl.searchParams.set("scope", scopes.join(" "));

    // Redirect to Google OAuth consent screen
    return NextResponse.redirect(googleAuthUrl.toString());
  } catch (error) {
    logger.error("Error in Google Ads OAuth authorize:", error as Error, {
      component: "authorize",
    });

    // Redirect to onboarding welcome page with error if shop is known
    if (shop) {
      const redirectUrl = new URL(
        returnTo || "/onboarding/welcome",
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      );
      redirectUrl.searchParams.set("shop", shop);
      redirectUrl.searchParams.set("google_error", "true");
      redirectUrl.searchParams.set(
        "message",
        "Failed to initiate Google authorization. Please try again.",
      );
      return NextResponse.redirect(redirectUrl.toString());
    }

    return NextResponse.json(
      { error: "Failed to initiate Google authorization" },
      { status: 500 },
    );
  }
}
