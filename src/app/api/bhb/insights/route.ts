/**
 * GET /api/bhb/insights
 *
 * Aggregates campaign performance across ALL shops for BHB Dashboard
 * Fetches LIVE data from Facebook Marketing API for connected shops
 * Requires admin or coach authentication
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { decryptToken } from "@/lib/services/encryption";

const FACEBOOK_API_VERSION = "v21.0";
const FACEBOOK_GRAPH_URL = `https://graph.facebook.com/${FACEBOOK_API_VERSION}`;

interface ShopCampaignPerformance {
  shop_id: string;
  shop_domain: string;
  shop_is_active: boolean;
  facebook_connected: boolean;
  ad_account_id: string | null;
  ad_account_name: string | null;
  google_ads_connected?: boolean;
  google_ad_account_id?: string | null;
  tiktok_ads_connected?: boolean;
  tiktok_ad_account_id?: string | null;
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

interface FacebookCampaign {
  id: string;
  name: string;
  status: string;
  objective?: string;
}

interface FacebookInsight {
  campaign_id: string;
  campaign_name: string;
  impressions?: string;
  clicks?: string;
  spend: string;
  actions?: Array<{ action_type: string; value: string }>;
  action_values?: Array<{ action_type: string; value: string }>;
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

/**
 * Fetch live campaign data from Facebook Marketing API
 */
async function fetchFacebookCampaignData(
  shopId: string,
  integration: {
    encrypted_access_token?: string;
    access_token?: string;
    additional_metadata?: { ad_accounts?: Array<{ id: string; name: string }> };
  },
): Promise<{
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
  ad_account_id: string | null;
  ad_account_name: string | null;
  error?: string;
}> {
  try {
    // Get ad accounts from integration metadata
    const adAccounts = integration.additional_metadata?.ad_accounts || [];

    if (adAccounts.length === 0) {
      return {
        campaigns: [],
        ad_account_id: null,
        ad_account_name: null,
        error: "No ad accounts found",
      };
    }

    // Use first ad account
    const selectedAdAccount = adAccounts[0];

    // Decrypt access token
    let accessToken: string;
    if (integration.encrypted_access_token) {
      accessToken = await decryptToken(integration.encrypted_access_token);
    } else if (integration.access_token) {
      accessToken = integration.access_token;
    } else {
      return {
        campaigns: [],
        ad_account_id: selectedAdAccount.id,
        ad_account_name: selectedAdAccount.name,
        error: "No access token found",
      };
    }

    // Fetch campaigns from Facebook API
    const campaignsUrl = new URL(
      `${FACEBOOK_GRAPH_URL}/${selectedAdAccount.id}/campaigns`,
    );
    campaignsUrl.searchParams.set("access_token", accessToken);
    campaignsUrl.searchParams.set("fields", "id,name,status,objective");
    campaignsUrl.searchParams.set(
      "filtering",
      JSON.stringify([
        {
          field: "effective_status",
          operator: "IN",
          value: ["ACTIVE", "PAUSED"],
        },
      ]),
    );
    campaignsUrl.searchParams.set("limit", "100");

    const campaignsResponse = await fetch(campaignsUrl.toString());
    const campaignsData = await campaignsResponse.json();

    if (campaignsData.error) {
      logger.error(
        "Facebook API error fetching campaigns for insights",
        new Error(campaignsData.error.message),
        {
          component: "bhb-insights",
          shopId,
          errorCode: campaignsData.error.code,
        },
      );
      return {
        campaigns: [],
        ad_account_id: selectedAdAccount.id,
        ad_account_name: selectedAdAccount.name,
        error: campaignsData.error.message,
      };
    }

    const campaigns: FacebookCampaign[] = campaignsData.data || [];

    if (campaigns.length === 0) {
      return {
        campaigns: [],
        ad_account_id: selectedAdAccount.id,
        ad_account_name: selectedAdAccount.name,
      };
    }

    // Fetch insights for campaigns (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const since = thirtyDaysAgo.toISOString().split("T")[0];
    const until = today.toISOString().split("T")[0];

    const insightsUrl = new URL(
      `${FACEBOOK_GRAPH_URL}/${selectedAdAccount.id}/insights`,
    );
    insightsUrl.searchParams.set("access_token", accessToken);
    insightsUrl.searchParams.set(
      "fields",
      "campaign_id,campaign_name,spend,impressions,clicks,actions,action_values",
    );
    insightsUrl.searchParams.set("level", "campaign");
    insightsUrl.searchParams.set(
      "time_range",
      JSON.stringify({ since, until }),
    );
    insightsUrl.searchParams.set(
      "filtering",
      JSON.stringify([
        {
          field: "campaign.effective_status",
          operator: "IN",
          value: ["ACTIVE", "PAUSED"],
        },
      ]),
    );

    const insightsResponse = await fetch(insightsUrl.toString());
    const insightsData = await insightsResponse.json();

    // Create a map of campaign insights
    const insightsMap = new Map<string, FacebookInsight>();
    if (insightsData.data) {
      for (const insight of insightsData.data) {
        insightsMap.set(insight.campaign_id, insight);
      }
    }

    // Merge campaigns with insights
    const campaignMetrics = campaigns.map((campaign) => {
      const insight = insightsMap.get(campaign.id);

      const spend = insight ? parseFloat(insight.spend || "0") : 0;
      const clicks = insight?.clicks ? parseInt(insight.clicks) : 0;

      // Extract purchase data from actions
      const actions = insight?.actions || [];
      const actionValues = insight?.action_values || [];

      const purchaseAction = actions.find((a) => a.action_type === "purchase");
      const purchaseValue = actionValues.find(
        (a) => a.action_type === "purchase",
      );

      const purchases = purchaseAction ? parseInt(purchaseAction.value) : 0;
      const purchaseValueAmount = purchaseValue
        ? parseFloat(purchaseValue.value)
        : 0;

      const roas = spend > 0 ? purchaseValueAmount / spend : 0;
      const conversionRate = clicks > 0 ? (purchases / clicks) * 100 : 0;

      return {
        campaign_id: campaign.id,
        campaign_name: campaign.name,
        spend,
        purchases,
        purchase_value: purchaseValueAmount,
        conversion_rate: conversionRate,
        roas,
        performance_tier: calculatePerformanceTier(roas, conversionRate, spend),
      };
    });

    return {
      campaigns: campaignMetrics,
      ad_account_id: selectedAdAccount.id,
      ad_account_name: selectedAdAccount.name,
    };
  } catch (error) {
    logger.error("Error fetching Facebook campaign data", error as Error, {
      component: "bhb-insights",
      shopId,
    });
    return {
      campaigns: [],
      ad_account_id: null,
      ad_account_name: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function GET() {
  try {
    // Require admin or coach authentication
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      logger.warn("Unauthorized access attempt to BHB insights", {
        component: "bhb-insights",
      });
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    // Verify user is admin or coach
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "admin" && userRole !== "coach") {
      logger.warn("Forbidden access attempt to BHB insights", {
        component: "bhb-insights",
        userId: session.user.id,
        userRole,
      });
      return NextResponse.json(
        { success: false, error: "Admin or coach access required" },
        { status: 403 },
      );
    }

    logger.info("BHB insights accessed", {
      component: "bhb-insights",
      userId: session.user.id,
      userRole,
    });

    // Get all active shops
    const result = await supabaseAdmin
      .from("shops")
      .select("id, shop_domain, display_name, is_active, coach_assigned")
      .eq("is_active", true)
      .not("shop_domain", "ilike", "%@%")
      .order("shop_domain");

    let shops: any[] | null = result.data;
    let shopsError = result.error;

    // If columns don't exist yet, fallback to basic query
    if (result.error?.code === "42703") {
      logger.debug("New columns not found, using fallback query", {
        component: "bhb-insights",
      });
      const fallbackResult = await supabaseAdmin
        .from("shops")
        .select("id, shop_domain, is_active")
        .eq("is_active", true)
        .not("shop_domain", "ilike", "%@%")
        .order("shop_domain");
      shops = fallbackResult.data;
      shopsError = fallbackResult.error;
    }

    if (shopsError) {
      logger.error("Error fetching shops:", shopsError as Error, {
        component: "bhb-insights",
      });
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

    // Get all Facebook integrations in a single query for efficiency
    const { data: integrations } = await supabaseAdmin
      .from("integrations")
      .select(
        "shop_id, encrypted_access_token, access_token, additional_metadata",
      )
      .eq("provider", "facebook")
      .eq("is_active", true);

    // Create a map of shop_id to integration

    const integrationsMap = new Map<string, any>();
    if (integrations) {
      for (const integration of integrations) {
        integrationsMap.set(integration.shop_id, integration);
      }
    }

    // Fetch campaign data for each shop
    const shopsPerformance: ShopCampaignPerformance[] = await Promise.all(
      shops.map(async (shop) => {
        const integration = integrationsMap.get(shop.id);
        const hasFacebookIntegration = !!integration;

        let campaignData: {
          campaigns: ShopCampaignPerformance["campaigns"];
          ad_account_id: string | null;
          ad_account_name: string | null;
          error?: string;
        } = {
          campaigns: [],
          ad_account_id: null,
          ad_account_name: null,
          error: undefined,
        };

        // Fetch live data from Facebook if integration exists
        if (hasFacebookIntegration && integration) {
          campaignData = await fetchFacebookCampaignData(shop.id, integration);
        }

        // Calculate shop totals
        const totalSpend = campaignData.campaigns.reduce(
          (sum, c) => sum + c.spend,
          0,
        );
        const totalPurchases = campaignData.campaigns.reduce(
          (sum, c) => sum + c.purchases,
          0,
        );
        const totalPurchaseValue = campaignData.campaigns.reduce(
          (sum, c) => sum + c.purchase_value,
          0,
        );
        const avgRoas = totalSpend > 0 ? totalPurchaseValue / totalSpend : 0;
        const avgConversionRate =
          campaignData.campaigns.length > 0
            ? campaignData.campaigns.reduce(
                (sum, c) => sum + c.conversion_rate,
                0,
              ) / campaignData.campaigns.length
            : 0;

        return {
          shop_id: shop.id,
          shop_domain:
            (shop as { display_name?: string }).display_name ||
            shop.shop_domain,
          shop_is_active: shop.is_active,
          facebook_connected: hasFacebookIntegration,
          ad_account_id: campaignData.ad_account_id,
          ad_account_name: campaignData.ad_account_name,
          coach_assigned:
            (shop as { coach_assigned?: string }).coach_assigned || null,
          campaigns: campaignData.campaigns,
          total_spend: totalSpend,
          total_purchases: totalPurchases,
          total_purchase_value: totalPurchaseValue,
          avg_roas: avgRoas,
          avg_conversion_rate: avgConversionRate,
          error: campaignData.error,
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
        shopsPerformance.filter(
          (s) => s.facebook_connected && s.total_spend > 0,
        ).length > 0
          ? shopsPerformance
              .filter((s) => s.facebook_connected && s.total_spend > 0)
              .reduce((sum, s) => sum + s.avg_roas, 0) /
            shopsPerformance.filter(
              (s) => s.facebook_connected && s.total_spend > 0,
            ).length
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
    logger.error("Error in GET /api/bhb/insights:", error as Error, {
      component: "bhb-insights",
    });

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
