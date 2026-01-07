import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/**
 * GET /api/shop/bhb-status
 *
 * Check if a shop is a Boutique Hub Black (BHB) member.
 * BHB membership is determined by whether the shop has a coach assigned (coach_id IS NOT NULL).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopParam = searchParams.get("shop");

    // Get session for auth
    const session = await getServerSession(authOptions);
    let shopId: string | null = null;
    let shopDomain: string | null = null;

    if (session?.user) {
      shopId = session.user.id || null;
      shopDomain = (session.user as { shopDomain?: string }).shopDomain || null;
    }

    // Fall back to shop param if provided
    if (!shopDomain && shopParam) {
      shopDomain = shopParam.includes(".myshopify.com")
        ? shopParam
        : `${shopParam}.myshopify.com`;
    }

    if (!shopId && !shopDomain) {
      return NextResponse.json(
        { success: false, error: "Not authenticated", isBHB: false },
        { status: 401 },
      );
    }

    // Query shop to check if coach_id is assigned
    let query = supabaseAdmin
      .from("shops")
      .select("id, shop_domain, coach_id")
      .single();

    if (shopId) {
      query = supabaseAdmin
        .from("shops")
        .select("id, shop_domain, coach_id")
        .eq("id", shopId)
        .single();
    } else if (shopDomain) {
      query = supabaseAdmin
        .from("shops")
        .select("id, shop_domain, coach_id")
        .eq("shop_domain", shopDomain)
        .single();
    }

    const { data: shop, error } = await query;

    if (error || !shop) {
      logger.warn("[BHB Status] Shop not found", {
        component: "bhb-status",
        shopId,
        shopDomain,
        error: error?.message,
      });
      return NextResponse.json(
        { success: false, error: "Shop not found", isBHB: false },
        { status: 404 },
      );
    }

    // BHB membership is determined by having a coach assigned
    const isBHB = shop.coach_id !== null;

    logger.info("[BHB Status] Status checked", {
      component: "bhb-status",
      shopId: shop.id,
      shopDomain: shop.shop_domain,
      isBHB,
      hasCoach: !!shop.coach_id,
    });

    return NextResponse.json({
      success: true,
      isBHB,
      shopId: shop.id,
    });
  } catch (error) {
    logger.error("[BHB Status] Error:", error as Error, {
      component: "bhb-status",
    });
    return NextResponse.json(
      { success: false, error: "Internal server error", isBHB: false },
      { status: 500 },
    );
  }
}
