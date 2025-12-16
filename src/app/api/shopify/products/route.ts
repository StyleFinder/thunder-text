import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { createCorsHeaders } from "@/lib/middleware/cors";
import { getProducts } from "@/lib/shopify/get-products";
import { getAccessToken } from "@/lib/shopify-auth";
import { logger } from "@/lib/logger";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * GET /api/shopify/products
 *
 * Fetch products from Shopify for the authenticated shop
 *
 * SECURITY: Supports two authentication methods:
 * 1. NextAuth session (for email/password users)
 * 2. Shopify shop domain from query params (for embedded app access)
 */
export async function GET(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request);

  try {
    const { searchParams } = new URL(request.url);
    const shopParam = searchParams.get("shop");

    // First try NextAuth session
    const session = await getServerSession(authOptions);
    let shopDomain: string | null = null;

    if (session?.user) {
      shopDomain = (session.user as { shopDomain?: string }).shopDomain || null;
    }

    // Fall back to shop param (for embedded Shopify access)
    if (!shopDomain && shopParam) {
      // Normalize shop domain
      shopDomain = shopParam.includes(".myshopify.com")
        ? shopParam
        : `${shopParam}.myshopify.com`;
    }

    if (!shopDomain) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
          details: "Please sign in or provide shop parameter",
        },
        { status: 401, headers: corsHeaders },
      );
    }

    // Verify shop exists and is active in database
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("id, shop_domain, is_active, linked_shopify_domain, shopify_access_token")
      .eq("shop_domain", shopDomain)
      .single();

    if (shopError || !shopData) {
      logger.error("Shop not found for products:", shopError as Error, {
        component: "products",
        shopDomain,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Shop not found",
          details: "Please ensure the app is properly installed",
        },
        { status: 404, headers: corsHeaders },
      );
    }

    if (!shopData.is_active) {
      return NextResponse.json(
        {
          success: false,
          error: "Shop is not active",
          details: "Please contact support to reactivate your account",
        },
        { status: 403, headers: corsHeaders },
      );
    }

    // Use the shop domain from session/database (linked domain if available)
    const fullShop = shopData.linked_shopify_domain || shopData.shop_domain;

    const query = searchParams.get("query") || undefined;

    // Get session token from Authorization header (for Shopify token exchange)
    const authHeader = request.headers.get("authorization");
    const sessionToken = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : undefined;

    logger.info("Fetching products for authenticated shop", {
      component: "products",
      shop: fullShop,
      hasSessionToken: !!sessionToken,
    });

    // Get access token using proper Token Exchange
    let accessToken: string;
    try {
      accessToken = await getAccessToken(fullShop, sessionToken);
    } catch (error) {
      logger.error("❌ Failed to get access token:", error as Error, {
        component: "products",
      });
      return NextResponse.json(
        {
          success: false,
          error: "Authentication failed",
          details: error instanceof Error ? error.message : "Unknown error",
          hint: "Ensure the app is properly installed and you have a valid session token",
        },
        { status: 401, headers: corsHeaders },
      );
    }

    // Get products using the obtained access token
    const { products, pageInfo } = await getProducts(
      fullShop,
      accessToken,
      query,
    );

    return NextResponse.json(
      {
        success: true,
        products,
        pageInfo: {
          hasNextPage: pageInfo.hasNextPage,
          endCursor: pageInfo.endCursor,
          total: products.length,
        },
        message: `Successfully fetched ${products.length} products`,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    logger.error("❌ Error in products API:", error as Error, {
      component: "products",
    });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch products",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: corsHeaders },
    );
  }
}
