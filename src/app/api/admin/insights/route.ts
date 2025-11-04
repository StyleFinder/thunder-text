/**
 * GET /api/admin/insights
 *
 * Admin-only endpoint that aggregates campaign performance across ALL shops
 * for BHB Dashboard (Ads Coach view)
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getCampaignInsights,
  getIntegrationInfo,
} from "@/lib/services/facebook-api";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ShopCampaignPerformance {
  shop_id: string;
  shop_domain: string;
  shop_is_active: boolean;
  facebook_connected: boolean;
  ad_account_id: string | null;
  ad_account_name: string | null;
  campaigns: Array<{
    campaign_id: string;
    campaign_name: string;
    spend: number;
    purchases: number;
    purchase_value: number;
    conversion_rate: number;
    roas: number;
    performance_tier: "excellent" | "good" | "average" | "poor" | "critical";
  }>;
  total_spend: number;
  total_purchases: number;
  total_purchase_value: number;
  avg_roas: number;
  avg_conversion_rate: number;
  error?: string;
}

/**
 * Calculate performance tier based on ROAS and conversion rate
 */
function calculatePerformanceTier(
  roas: number,
  conversionRate: number,
  spend: number,
): "excellent" | "good" | "average" | "poor" | "critical" {
  // CRITICAL: High spend but terrible ROAS (burning money)
  if (spend > 500 && roas < 1.0) {
    return "critical";
  }

  // EXCELLENT: High ROAS and conversion rate with meaningful spend
  if (roas >= 4.0 && conversionRate >= 3.0 && spend >= 100) {
    return "excellent";
  }

  // GOOD: Solid ROAS or good conversion with decent spend
  if (roas >= 2.5 || (conversionRate >= 2.0 && spend >= 50)) {
    return "good";
  }

  // AVERAGE: Profitable but room for improvement
  if (roas >= 1.5 || conversionRate >= 1.0) {
    return "average";
  }

  // POOR: Underperforming
  return "poor";
}

export async function GET() {
  try {
    // TODO: Add admin authentication check here
    // For now, this is open - should be protected in production

    // Get all active shops
    const { data: shops, error: shopsError } = await supabase
      .from("shops")
      .select("id, shop_domain, is_active")
      .eq("is_active", true)
      .order("shop_domain");

    if (shopsError) {
      console.error("Error fetching shops:", shopsError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch shops" },
        { status: 500 },
      );
    }

    if (!shops || shops.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        summary: {
          total_shops: 0,
          shops_with_facebook: 0,
          total_campaigns: 0,
          total_spend: 0,
          total_purchases: 0,
          avg_roas: 0,
          excellent_campaigns: 0,
          good_campaigns: 0,
          average_campaigns: 0,
          poor_campaigns: 0,
          critical_campaigns: 0,
        },
      });
    }

    // Fetch campaign insights for each shop in parallel
    const performancePromises = shops.map(
      async (shop): Promise<ShopCampaignPerformance> => {
        try {
          // Check if Facebook is connected for this shop
          const integrationInfo = await getIntegrationInfo(shop.id);

          if (
            !integrationInfo.connected ||
            integrationInfo.adAccountsCount === 0
          ) {
            return {
              shop_id: shop.id,
              shop_domain: shop.shop_domain,
              shop_is_active: shop.is_active,
              facebook_connected: false,
              ad_account_id: null,
              ad_account_name: null,
              campaigns: [],
              total_spend: 0,
              total_purchases: 0,
              total_purchase_value: 0,
              avg_roas: 0,
              avg_conversion_rate: 0,
            };
          }

          // Get first ad account (most shops will have just one)
          const primaryAdAccount = integrationInfo.adAccounts[0];

          // Fetch campaign insights for this ad account
          const insights = await getCampaignInsights(
            shop.id,
            primaryAdAccount.id,
          );

          // Calculate performance tier for each campaign
          const campaignsWithTiers = insights.map((campaign) => ({
            campaign_id: campaign.campaign_id,
            campaign_name: campaign.campaign_name,
            spend: campaign.spend,
            purchases: campaign.purchases,
            purchase_value: campaign.purchase_value,
            conversion_rate: campaign.conversion_rate,
            roas: campaign.roas,
            performance_tier: calculatePerformanceTier(
              campaign.roas,
              campaign.conversion_rate,
              campaign.spend,
            ),
          }));

          // Calculate shop-level aggregates
          const totalSpend = insights.reduce((sum, c) => sum + c.spend, 0);
          const totalPurchases = insights.reduce(
            (sum, c) => sum + c.purchases,
            0,
          );
          const totalPurchaseValue = insights.reduce(
            (sum, c) => sum + c.purchase_value,
            0,
          );
          const avgRoas =
            insights.length > 0
              ? insights.reduce((sum, c) => sum + c.roas, 0) / insights.length
              : 0;
          const avgConversionRate =
            insights.length > 0
              ? insights.reduce((sum, c) => sum + c.conversion_rate, 0) /
                insights.length
              : 0;

          return {
            shop_id: shop.id,
            shop_domain: shop.shop_domain,
            shop_is_active: shop.is_active,
            facebook_connected: true,
            ad_account_id: primaryAdAccount.id,
            ad_account_name: primaryAdAccount.name,
            campaigns: campaignsWithTiers,
            total_spend: totalSpend,
            total_purchases: totalPurchases,
            total_purchase_value: totalPurchaseValue,
            avg_roas: avgRoas,
            avg_conversion_rate: avgConversionRate,
          };
        } catch (error) {
          console.error(
            `Error fetching insights for shop ${shop.shop_domain}:`,
            error,
          );

          // Return shop with error state
          return {
            shop_id: shop.id,
            shop_domain: shop.shop_domain,
            shop_is_active: shop.is_active,
            facebook_connected: false,
            ad_account_id: null,
            ad_account_name: null,
            campaigns: [],
            total_spend: 0,
            total_purchases: 0,
            total_purchase_value: 0,
            avg_roas: 0,
            avg_conversion_rate: 0,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      },
    );

    const shopsPerformance = await Promise.all(performancePromises);

    // Calculate overall summary statistics
    const summary = {
      total_shops: shops.length,
      shops_with_facebook: shopsPerformance.filter((s) => s.facebook_connected)
        .length,
      total_campaigns: shopsPerformance.reduce(
        (sum, s) => sum + s.campaigns.length,
        0,
      ),
      total_spend: shopsPerformance.reduce((sum, s) => sum + s.total_spend, 0),
      total_purchases: shopsPerformance.reduce(
        (sum, s) => sum + s.total_purchases,
        0,
      ),
      total_purchase_value: shopsPerformance.reduce(
        (sum, s) => sum + s.total_purchase_value,
        0,
      ),
      avg_roas:
        shopsPerformance.filter((s) => s.facebook_connected).length > 0
          ? shopsPerformance.reduce((sum, s) => sum + s.avg_roas, 0) /
            shopsPerformance.filter((s) => s.facebook_connected).length
          : 0,
      excellent_campaigns: shopsPerformance.reduce(
        (sum, s) =>
          sum +
          s.campaigns.filter((c) => c.performance_tier === "excellent").length,
        0,
      ),
      good_campaigns: shopsPerformance.reduce(
        (sum, s) =>
          sum + s.campaigns.filter((c) => c.performance_tier === "good").length,
        0,
      ),
      average_campaigns: shopsPerformance.reduce(
        (sum, s) =>
          sum +
          s.campaigns.filter((c) => c.performance_tier === "average").length,
        0,
      ),
      poor_campaigns: shopsPerformance.reduce(
        (sum, s) =>
          sum + s.campaigns.filter((c) => c.performance_tier === "poor").length,
        0,
      ),
      critical_campaigns: shopsPerformance.reduce(
        (sum, s) =>
          sum +
          s.campaigns.filter((c) => c.performance_tier === "critical").length,
        0,
      ),
    };

    return NextResponse.json({
      success: true,
      data: shopsPerformance,
      summary,
      generated_at: new Date().toISOString(),
      data_period: "Last 30 days",
    });
  } catch (error) {
    console.error("Error in GET /api/admin/insights:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to aggregate campaign insights",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
