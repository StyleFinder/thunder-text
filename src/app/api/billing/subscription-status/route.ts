/**
 * GET /api/billing/subscription-status
 *
 * Returns the current subscription status for the authenticated shop.
 * Used by the frontend to determine:
 * - Whether to show upgrade prompts
 * - Trial days remaining
 * - Current plan features
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { checkSubscriptionStatus, getShopifyPricingPageUrl } from "@/lib/shopify/billing";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    // Get session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get shop domain from session
    const shopDomain = (session.user as { shopDomain?: string }).shopDomain;
    if (!shopDomain) {
      return NextResponse.json(
        { error: "No shop associated with account" },
        { status: 403 }
      );
    }

    // Get shop ID
    const { data: shop, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("id")
      .eq("shop_domain", shopDomain)
      .single();

    if (shopError || !shop) {
      logger.error("Shop not found for subscription check", shopError as Error, {
        component: "subscription-status",
        shopDomain,
      });
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // Check subscription status
    const subscriptionStatus = await checkSubscriptionStatus(shop.id);

    // Get pricing page URL if upgrade is required
    const pricingPageUrl = subscriptionStatus.requiresUpgrade
      ? getShopifyPricingPageUrl(shopDomain)
      : null;

    return NextResponse.json({
      success: true,
      data: {
        ...subscriptionStatus,
        pricingPageUrl,
        shopDomain,
      },
    });
  } catch (error) {
    logger.error("Error checking subscription status", error as Error, {
      component: "subscription-status",
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
