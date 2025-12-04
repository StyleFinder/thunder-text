/**
 * GET /api/bhb/insights
 *
 * Aggregates campaign performance across ALL shops for BHB Dashboard
 * Requires admin or coach authentication
 */

import { NextResponse } from "next/server";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logger } from '@/lib/logger'

interface ShopCampaignPerformance {
  shop_id: string;
  shop_domain: string;
  shop_is_active: boolean;
  facebook_connected: boolean;
  ad_account_id: string | null;
  ad_account_name: string | null;
  coach_assigned: string | null;
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
    // Require admin or coach authentication
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      logger.warn('Unauthorized access attempt to BHB insights', {
        component: 'bhb-insights'
      });
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify user is admin or coach
    const userType = (session.user as { userType?: string }).userType;
    if (userType !== 'admin' && userType !== 'coach') {
      logger.warn('Forbidden access attempt to BHB insights', {
        component: 'bhb-insights',
        userId: session.user.id,
        userType
      });
      return NextResponse.json(
        { success: false, error: 'Admin or coach access required' },
        { status: 403 }
      );
    }

    logger.info('BHB insights accessed', {
      component: 'bhb-insights',
      userId: session.user.id,
      userType
    });

    // Get all active shops - try with new columns first, fallback if they don't exist
    let shops;
    let shopsError;

    // Try fetching with new columns (coach_assigned, display_name)
    const result = await supabaseAdmin
      .from("shops")
      .select("id, shop_domain, display_name, is_active, coach_assigned")
      .eq("is_active", true)
      .order("shop_domain");

    // If columns don't exist yet, fallback to basic query
    if (result.error?.code === '42703') {
      logger.debug('New columns not found, using fallback query', { component: 'bhb-insights' });
      const fallbackResult = await supabaseAdmin
        .from("shops")
        .select("id, shop_domain, is_active")
        .eq("is_active", true)
        .order("shop_domain");
      shops = fallbackResult.data;
      shopsError = fallbackResult.error;
    } else {
      shops = result.data;
      shopsError = result.error;
    }

    if (shopsError) {
      logger.error("Error fetching shops:", shopsError as Error, { component: 'insights' });
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
          total_purchase_value: 0,
          avg_roas: 0,
          excellent_campaigns: 0,
          good_campaigns: 0,
          average_campaigns: 0,
          poor_campaigns: 0,
          critical_campaigns: 0,
        },
        generated_at: new Date().toISOString(),
        data_period: "Last 30 days",
      });
    }

    // Fetch campaign data for each shop
    const shopsPerformance: ShopCampaignPerformance[] = await Promise.all(
      shops.map(async (shop) => {
        // Get Facebook ad account for this shop
        const { data: adAccount, error: adAccountError } = await supabaseAdmin
          .from("facebook_ad_accounts")
          .select("id, account_name")
          .eq("shop_id", shop.id)
          .maybeSingle();

        if (adAccountError) {
          logger.debug('Ad account error for shop', {
            component: 'bhb-insights',
            shopId: shop.id,
            error: adAccountError.message
          });
        }

        // Get campaigns for this shop
        const { data: campaigns, error: campaignsError } = await supabaseAdmin
          .from("facebook_campaigns")
          .select("*")
          .eq("shop_id", shop.id);

        if (campaignsError) {
          logger.debug('Campaigns error for shop', {
            component: 'bhb-insights',
            shopId: shop.id,
            error: campaignsError.message
          });
        }

        // Calculate campaign metrics
        const campaignMetrics =
          campaigns?.map((campaign) => {
            const spend = Number(campaign.spend) || 0;
            const purchases = Number(campaign.purchases) || 0;
            const purchaseValue = Number(campaign.purchase_value) || 0;
            const clicks = Number(campaign.clicks) || 0;

            const roas = spend > 0 ? purchaseValue / spend : 0;
            const conversionRate = clicks > 0 ? (purchases / clicks) * 100 : 0;

            return {
              campaign_id: campaign.id,
              campaign_name: campaign.campaign_name,
              spend,
              purchases,
              purchase_value: purchaseValue,
              conversion_rate: conversionRate,
              roas,
              performance_tier: calculatePerformanceTier(
                roas,
                conversionRate,
                spend,
              ),
            };
          }) || [];

        // Calculate shop totals
        const totalSpend = campaignMetrics.reduce((sum, c) => sum + c.spend, 0);
        const totalPurchases = campaignMetrics.reduce(
          (sum, c) => sum + c.purchases,
          0,
        );
        const totalPurchaseValue = campaignMetrics.reduce(
          (sum, c) => sum + c.purchase_value,
          0,
        );
        const avgRoas =
          totalSpend > 0 ? totalPurchaseValue / totalSpend : 0;
        const avgConversionRate =
          campaignMetrics.length > 0
            ? campaignMetrics.reduce((sum, c) => sum + c.conversion_rate, 0) /
              campaignMetrics.length
            : 0;

        return {
          shop_id: shop.id,
          shop_domain: (shop as any).display_name || shop.shop_domain,
          shop_is_active: shop.is_active,
          facebook_connected: !!adAccount,
          ad_account_id: adAccount?.id || null,
          ad_account_name: adAccount?.account_name || null,
          coach_assigned: (shop as any).coach_assigned || null,
          campaigns: campaignMetrics,
          total_spend: totalSpend,
          total_purchases: totalPurchases,
          total_purchase_value: totalPurchaseValue,
          avg_roas: avgRoas,
          avg_conversion_rate: avgConversionRate,
        };
      }),
    );

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
    logger.error("Error in GET /api/bhb/insights:", error as Error, { component: 'insights' });

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
