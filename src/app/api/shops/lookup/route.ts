import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/shops/lookup
 * Look up shop ID by domain
 *
 * SECURITY: Requires session authentication.
 * Prevents shop enumeration attacks without authentication.
 */
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Require session authentication
    // Prevents unauthenticated enumeration of valid shop domains
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const shopDomain = searchParams.get("shop");

    if (!shopDomain) {
      return NextResponse.json(
        { success: false, error: "Missing shop parameter" },
        { status: 400 },
      );
    }

    // SECURITY: Validate shop ownership - users can only lookup their own shop
    const sessionShopDomain = (session.user as { shopDomain?: string })
      .shopDomain;
    const normalizedRequestShop = shopDomain.includes(".myshopify.com")
      ? shopDomain
      : `${shopDomain}.myshopify.com`;
    const normalizedSessionShop = sessionShopDomain?.includes(".myshopify.com")
      ? sessionShopDomain
      : `${sessionShopDomain}.myshopify.com`;

    if (normalizedRequestShop !== normalizedSessionShop) {
      logger.warn("Shop lookup mismatch", {
        component: "shops-lookup",
        requestedShop: normalizedRequestShop,
        sessionShop: normalizedSessionShop,
      });
      return NextResponse.json(
        { success: false, error: "Access denied: Shop mismatch" },
        { status: 403 },
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: shop, error } = await supabase
      .from("shops")
      .select("id")
      .eq("shop_domain", normalizedRequestShop)
      .single();

    if (error || !shop) {
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      shopId: shop.id,
    });
  } catch (error) {
    logger.error("Shop lookup error:", error as Error, {
      component: "shops-lookup",
    });
    return NextResponse.json(
      { success: false, error: "Failed to lookup shop" },
      { status: 500 },
    );
  }
}
