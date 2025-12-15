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
 * SECURITY: Uses session-based authentication. The shop param is IGNORED -
 * shop domain is derived from the authenticated session.
 * No default fallback shop - authentication is required.
 */
export async function GET(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request);

  try {
    // SECURITY: Require session authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
          details: "Please sign in to access products",
        },
        { status: 401, headers: corsHeaders },
      );
    }

    // Get shop domain from session (not from query params!)
    const shopDomain = (session.user as { shopDomain?: string }).shopDomain;
    if (!shopDomain) {
      return NextResponse.json(
        {
          success: false,
          error: "No shop associated with account",
          details: "Please ensure your Shopify store is connected",
        },
        { status: 403, headers: corsHeaders },
      );
    }

    // Verify shop exists and is active in database
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("id, shop_domain, is_active, linked_shopify_domain")
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

    const { searchParams } = new URL(request.url);
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
