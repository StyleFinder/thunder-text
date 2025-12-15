import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { getUsageStats } from "@/lib/billing/usage";
import { PLANS, PlanType } from "@/lib/billing/plans";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/billing/subscription
 *
 * Get subscription and usage information for the authenticated shop
 *
 * SECURITY: Uses session-based authentication. The shopId/shop params are IGNORED -
 * shop ID is derived from the authenticated session.
 */
export async function GET() {
  try {
    // SECURITY: Require session authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    // Get shop domain from session (not from query params!)
    const sessionShopDomain = (session.user as { shopDomain?: string })
      .shopDomain;
    if (!sessionShopDomain) {
      return NextResponse.json(
        { success: false, error: "No shop associated with account" },
        { status: 403 },
      );
    }

    const supabase = getSupabaseAdmin();

    // SECURITY: Get shop from session-derived domain, not from query params
    const { data: shop, error } = await supabase
      .from("shops")
      .select("id")
      .eq("shop_domain", sessionShopDomain)
      .single();

    if (error || !shop) {
      logger.error("Shop not found for subscription", error as Error, {
        component: "billing-subscription",
        shopDomain: sessionShopDomain,
      });
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 404 },
      );
    }

    // Note: shopId/shop params from URL are ignored - we use session-derived shopId
    const actualShopId = shop.id;

    const usageStats = await getUsageStats(actualShopId);

    if (!usageStats) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch subscription data" },
        { status: 500 },
      );
    }

    const planDetails = PLANS[usageStats.plan as PlanType] || PLANS.free;

    return NextResponse.json({
      success: true,
      shopId: actualShopId,
      subscription: {
        plan: usageStats.plan,
        planName: planDetails.name,
        price: planDetails.price,
        status: usageStats.subscriptionStatus,
        periodEnd: usageStats.periodEnd,
        usage: {
          productDescriptions: usageStats.productDescriptions,
          ads: usageStats.ads,
        },
        limits: planDetails.limits,
      },
    });
  } catch (error) {
    logger.error("Failed to fetch subscription", error as Error, {
      component: "billing-subscription",
    });

    return NextResponse.json(
      { success: false, error: "Failed to fetch subscription data" },
      { status: 500 },
    );
  }
}
