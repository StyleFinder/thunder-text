import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { supabaseAdmin } from "@/lib/supabase";
import { logger } from "@/lib/logger";

/**
 * GET /api/shops/[shopId]
 *
 * Get shop information by UUID.
 * Used by client-side hooks to get shop domain from shopId.
 *
 * Authorization:
 * - Shop users can only access their own shop
 * - Admin/coach users can access any shop
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const { shopId } = await params;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(shopId)) {
      return NextResponse.json(
        { success: false, error: "Invalid shop ID format" },
        { status: 400 }
      );
    }

    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // For shop users, verify they can only access their own shop
    if (session.user.role === "shop" && session.user.id !== shopId) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    // Fetch shop from database
    const { data: shop, error } = await supabaseAdmin
      .from("shops")
      .select("id, shop_domain, store_name, email, plan, created_at")
      .eq("id", shopId)
      .single();

    if (error || !shop) {
      logger.warn("Shop not found", {
        component: "api-shops-shopId",
        shopId,
        error: error?.message,
      });
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      shop: {
        id: shop.id,
        shop_domain: shop.shop_domain,
        store_name: shop.store_name,
        email: shop.email,
        plan: shop.plan,
        created_at: shop.created_at,
      },
    });
  } catch (error) {
    logger.error("Error fetching shop", error as Error, {
      component: "api-shops-shopId",
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
