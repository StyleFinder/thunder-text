import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { supabaseAdmin } from "@/lib/supabase";
import { createCorsHeaders } from "@/lib/middleware/cors";
import { logger } from "@/lib/logger";

/**
 * GET /api/auth/token
 * Retrieves the current OAuth access token for a shop
 * Used for external (non-embedded) authentication
 *
 * SECURITY: Requires session authentication AND shop ownership validation.
 * Previously exposed access tokens to anyone who knew a shop domain.
 * Access tokens are highly sensitive - they grant full API access to a shop.
 */
export async function GET(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request);

  try {
    // SECURITY: Require session authentication
    // Access tokens are highly sensitive and should NEVER be exposed without auth
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401, headers: corsHeaders },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const shop = searchParams.get("shop");

    if (!shop) {
      return NextResponse.json(
        { success: false, error: "Missing shop parameter" },
        { status: 400, headers: corsHeaders },
      );
    }

    // Normalize shop domain
    const fullShopDomain = shop.includes(".myshopify.com")
      ? shop
      : `${shop}.myshopify.com`;

    // SECURITY: Validate shop ownership - user can only get tokens for their own shop
    const sessionShopDomain = (session.user as { shopDomain?: string })
      .shopDomain;
    const normalizedSessionShop = sessionShopDomain?.includes(".myshopify.com")
      ? sessionShopDomain
      : `${sessionShopDomain}.myshopify.com`;

    if (fullShopDomain !== normalizedSessionShop) {
      logger.warn("Shop ownership mismatch in token retrieval", {
        component: "token",
        requestedShop: fullShopDomain,
        sessionShop: normalizedSessionShop,
      });
      return NextResponse.json(
        { success: false, error: "Access denied: Shop mismatch" },
        { status: 403, headers: corsHeaders },
      );
    }

    // Get shop and access token from database
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("id, shopify_access_token, shopify_access_token_legacy")
      .eq("shop_domain", fullShopDomain)
      .eq("is_active", true)
      .single();

    if (shopError || !shopData) {
      logger.error("Shop not found:", shopError as Error, {
        component: "token",
      });
      return NextResponse.json(
        { success: false, error: "Shop not found or not authenticated" },
        { status: 404, headers: corsHeaders },
      );
    }

    const accessToken =
      shopData.shopify_access_token || shopData.shopify_access_token_legacy;

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: "No access token available. Please reinstall the app.",
        },
        { status: 401, headers: corsHeaders },
      );
    }

    // Return the access token
    return NextResponse.json(
      {
        success: true,
        token: accessToken,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    logger.error("Token retrieval error:", error as Error, {
      component: "token",
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: corsHeaders },
    );
  }
}
