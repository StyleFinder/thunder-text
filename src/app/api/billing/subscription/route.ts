import { NextRequest, NextResponse } from "next/server";
import { getUsageStats } from "@/lib/billing/usage";
import { PLANS, PlanType } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get("shopId");
    const shopDomain = searchParams.get("shop");

    if (!shopId && !shopDomain) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: shopId or shop" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();
    let actualShopId = shopId;

    // If we only have shop domain, look up the shop ID
    if (!actualShopId && shopDomain) {
      const { data: shop, error } = await supabase
        .from("shops")
        .select("id")
        .eq("shop_domain", shopDomain)
        .single();

      if (error || !shop) {
        logger.error("Shop not found by domain", error as Error, {
          component: "billing-subscription",
          shopDomain,
        });
        return NextResponse.json(
          { success: false, error: "Shop not found" },
          { status: 404 },
        );
      }

      actualShopId = shop.id;
    }

    const usageStats = await getUsageStats(actualShopId!);

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
