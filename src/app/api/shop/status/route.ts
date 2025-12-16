import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/**
 * GET /api/shop/status
 *
 * Check if the shop is active and connected to Shopify
 * Used to detect when a user has uninstalled the app from Shopify
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopParam = searchParams.get("shop");

    // Try NextAuth session first
    const session = await getServerSession(authOptions);
    let shopDomain: string | null = null;
    let userId: string | null = null;

    if (session?.user) {
      shopDomain = (session.user as { shopDomain?: string }).shopDomain || null;
      userId = session.user.id || null;
    }

    // Fall back to shop param
    if (!shopDomain && shopParam) {
      shopDomain = shopParam.includes(".myshopify.com")
        ? shopParam
        : `${shopParam}.myshopify.com`;
    }

    if (!shopDomain && !userId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    // Query shop status
    let query = supabaseAdmin
      .from("shops")
      .select(
        "id, shop_domain, is_active, uninstalled_at, shopify_access_token",
      );

    if (shopDomain) {
      query = query.eq("shop_domain", shopDomain);
    } else if (userId) {
      query = query.eq("id", userId);
    }

    const { data: shop, error } = await query.single();

    if (error || !shop) {
      logger.warn("[Shop Status] Shop not found", {
        component: "shop-status",
        shopDomain,
        userId,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Shop not found",
          status: "not_found",
        },
        { status: 404 },
      );
    }

    const isConnected = shop.is_active && !!shop.shopify_access_token;
    const wasUninstalled = !!shop.uninstalled_at;

    return NextResponse.json({
      success: true,
      data: {
        shopDomain: shop.shop_domain,
        isActive: shop.is_active,
        isConnected,
        wasUninstalled,
        uninstalledAt: shop.uninstalled_at,
        status: isConnected
          ? "connected"
          : wasUninstalled
            ? "uninstalled"
            : "disconnected",
      },
    });
  } catch (error) {
    logger.error("[Shop Status] Error:", error as Error, {
      component: "shop-status",
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
