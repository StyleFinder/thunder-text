/**
 * TikTok for Business OAuth Authorization Endpoint
 *
 * GET /api/tiktok/oauth/authorize
 *
 * Purpose: Initiate TikTok OAuth flow by redirecting user to TikTok authorization screen
 *
 * Flow:
 * 1. Verify user context
 * 2. Get shop context from query params
 * 3. Generate secure state parameter with shop info
 * 4. Redirect to TikTok OAuth authorization screen
 *
 * Query Parameters:
 * - shop: Shop domain (e.g., zunosai-staging-test-store.myshopify.com)
 * - return_to: Optional return path after OAuth (e.g., /welcome)
 *
 * Environment Variables Required:
 * - TIKTOK_CLIENT_KEY
 * - TIKTOK_REDIRECT_URI (or NEXT_PUBLIC_APP_URL for dynamic construction)
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createTikTokOAuthState } from "@/lib/security/oauth-validation";
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
    const tiktokClientKey = process.env.TIKTOK_CLIENT_KEY;
    if (!tiktokClientKey) {
      logger.error("TIKTOK_CLIENT_KEY not configured", undefined, {
        component: "authorize",
      });
      return NextResponse.json(
        { error: "TikTok integration not configured" },
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
      "tiktok-oauth",
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
          "[TikTok OAuth] Standalone user - using master shop for integration",
          {
            component: "authorize",
            standaloneEmail: shopData.shop_domain,
            masterShopDomain: masterShop.shop_domain,
            masterShopId: masterShop.id,
          },
        );
      } else {
        logger.error(
          "[TikTok OAuth] Standalone user has linked_shopify_domain but master shop not found",
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
    // Use the master shop ID and domain for state
    const shopDomainForState = targetShopDomain.includes(".myshopify.com")
      ? targetShopDomain
      : shop.includes(".myshopify.com")
        ? shop
        : targetShopDomain;

    const state = createTikTokOAuthState({
      shop_id: targetShopId, // Use master shop ID for standalone users
      shop_domain: shopDomainForState,
      host: searchParams.get("host"),
      embedded: searchParams.get("embedded"),
      return_to: returnTo,
    });

    // Construct redirect URI
    const redirectUri =
      process.env.TIKTOK_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/tiktok/oauth/callback`;

    // Build TikTok OAuth URL
    const tiktokAuthUrl = new URL(
      "https://business-api.tiktok.com/portal/auth",
    );
    tiktokAuthUrl.searchParams.set("app_id", tiktokClientKey);
    tiktokAuthUrl.searchParams.set("redirect_uri", redirectUri);
    tiktokAuthUrl.searchParams.set("state", state);

    // Redirect to TikTok OAuth authorization screen
    return NextResponse.redirect(tiktokAuthUrl.toString());
  } catch (error) {
    logger.error("Error in TikTok OAuth authorize:", error as Error, {
      component: "authorize",
    });

    // Redirect to welcome page with error if shop is known
    if (shop) {
      const redirectUrl = new URL(
        returnTo || "/welcome",
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      );
      redirectUrl.searchParams.set("shop", shop);
      redirectUrl.searchParams.set("tiktok_error", "true");
      redirectUrl.searchParams.set(
        "message",
        "Failed to initiate TikTok authorization. Please try again.",
      );
      return NextResponse.redirect(redirectUrl.toString());
    }

    return NextResponse.json(
      { error: "Failed to initiate TikTok authorization" },
      { status: 500 },
    );
  }
}
