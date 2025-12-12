/**
 * GET /api/bhb/shops/[shop_id]/campaigns
 *
 * Fetches live campaign data from Facebook Marketing API for a specific shop.
 * Requires admin or coach authentication.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { decryptToken } from "@/lib/services/encryption";

const FACEBOOK_API_VERSION = "v21.0";
const FACEBOOK_GRAPH_URL = `https://graph.facebook.com/${FACEBOOK_API_VERSION}`;

interface FacebookCampaign {
  id: string;
  name: string;
  status: string;
  objective?: string;
  daily_budget?: string;
  lifetime_budget?: string;
}

interface FacebookInsight {
  campaign_id: string;
  campaign_name: string;
  impressions?: string;
  clicks?: string;
  spend: string;
  actions?: Array<{ action_type: string; value: string }>;
  action_values?: Array<{ action_type: string; value: string }>;
  ctr?: string;
  cpc?: string;
}

interface CampaignWithInsights {
  id: string;
  name: string;
  status: string;
  objective?: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  purchases: number;
  purchase_value: number;
  roas: number;
  conversion_rate: number;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ shop_id: string }> },
) {
  try {
    const { shop_id } = await params;
    const { searchParams } = new URL(req.url);
    const adAccountId = searchParams.get("ad_account_id");

    // Require authentication
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      logger.warn("Unauthorized access attempt to shop campaigns", {
        component: "shop-campaigns",
      });
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    // Only admins and coaches can view campaigns
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "admin" && userRole !== "coach") {
      logger.warn("Forbidden access attempt to shop campaigns", {
        component: "shop-campaigns",
        userId: session.user.id,
        userRole,
      });
      return NextResponse.json(
        { success: false, error: "Admin or coach access required" },
        { status: 403 },
      );
    }

    // Verify shop exists
    const { data: shop, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("id, shop_domain, display_name")
      .eq("id", shop_id)
      .single();

    if (shopError || !shop) {
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 404 },
      );
    }

    // Get Facebook integration for this shop
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from("integrations")
      .select("*")
      .eq("shop_id", shop_id)
      .eq("provider", "facebook")
      .eq("is_active", true)
      .single();

    if (integrationError || !integration) {
      return NextResponse.json({
        success: true,
        facebook_connected: false,
        campaigns: [],
        message: "Facebook not connected for this shop",
      });
    }

    // Get ad accounts from integration metadata
    const adAccounts = integration.additional_metadata?.ad_accounts || [];

    if (adAccounts.length === 0) {
      return NextResponse.json({
        success: true,
        facebook_connected: true,
        ad_accounts: [],
        campaigns: [],
        message: "No ad accounts found",
      });
    }

    // Determine which ad account to use
    let selectedAdAccount = adAccounts[0];
    if (adAccountId) {
      const found = adAccounts.find(
        (acc: { id: string }) => acc.id === adAccountId,
      );
      if (found) {
        selectedAdAccount = found;
      }
    }

    // Decrypt access token
    let accessToken: string;
    try {
      if (integration.encrypted_access_token) {
        accessToken = await decryptToken(integration.encrypted_access_token);
      } else if (integration.access_token) {
        // Fallback for non-encrypted tokens (shouldn't happen in production)
        accessToken = integration.access_token;
      } else {
        throw new Error("No access token found");
      }
    } catch (tokenError) {
      logger.error("Error decrypting Facebook token", tokenError as Error, {
        component: "shop-campaigns",
        shopId: shop_id,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Failed to access Facebook credentials",
          facebook_connected: true,
        },
        { status: 500 },
      );
    }

    // Fetch campaigns from Facebook API
    const campaignsUrl = new URL(
      `${FACEBOOK_GRAPH_URL}/${selectedAdAccount.id}/campaigns`,
    );
    campaignsUrl.searchParams.set("access_token", accessToken);
    campaignsUrl.searchParams.set(
      "fields",
      "id,name,status,objective,daily_budget,lifetime_budget",
    );
    // Don't filter by status - show all campaigns to ensure visibility
    // Note: effective_status can be ACTIVE, PAUSED, DELETED, ARCHIVED, IN_PROCESS, WITH_ISSUES
    campaignsUrl.searchParams.set("limit", "100");

    const campaignsResponse = await fetch(campaignsUrl.toString());
    const campaignsData = await campaignsResponse.json();

    if (campaignsData.error) {
      logger.error(
        "Facebook API error fetching campaigns",
        new Error(campaignsData.error.message),
        {
          component: "shop-campaigns",
          shopId: shop_id,
          errorCode: campaignsData.error.code,
        },
      );
      return NextResponse.json(
        {
          success: false,
          error: campaignsData.error.message,
          facebook_connected: true,
        },
        { status: 500 },
      );
    }

    const campaigns: FacebookCampaign[] = campaignsData.data || [];

    if (campaigns.length === 0) {
      return NextResponse.json({
        success: true,
        facebook_connected: true,
        ad_accounts: adAccounts.map((acc: { id: string; name: string }) => ({
          id: acc.id,
          name: acc.name,
        })),
        selected_ad_account: {
          id: selectedAdAccount.id,
          name: selectedAdAccount.name,
        },
        campaigns: [],
        message: "No campaigns found in this ad account",
      });
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
      "campaign_id,campaign_name,spend,impressions,clicks,actions,action_values,ctr,cpc",
    );
    insightsUrl.searchParams.set("level", "campaign");
    insightsUrl.searchParams.set(
      "time_range",
      JSON.stringify({ since, until }),
    );
    // Don't filter insights by status - get data for all campaigns

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
    const campaignsWithInsights: CampaignWithInsights[] = campaigns.map(
      (campaign) => {
        const insight = insightsMap.get(campaign.id);

        const spend = insight ? parseFloat(insight.spend || "0") : 0;
        const impressions = insight ? parseInt(insight.impressions || "0") : 0;
        const clicks = insight ? parseInt(insight.clicks || "0") : 0;
        const ctr = insight?.ctr
          ? parseFloat(insight.ctr)
          : impressions > 0
            ? (clicks / impressions) * 100
            : 0;

        // Extract purchase data from actions
        const actions = insight?.actions || [];
        const actionValues = insight?.action_values || [];

        const purchaseAction = actions.find(
          (a) => a.action_type === "purchase",
        );
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
          id: campaign.id,
          name: campaign.name,
          status: campaign.status.toLowerCase(),
          objective: campaign.objective,
          spend,
          impressions,
          clicks,
          ctr,
          purchases,
          purchase_value: purchaseValueAmount,
          roas,
          conversion_rate: conversionRate,
        };
      },
    );

    // Sort by spend (highest first)
    campaignsWithInsights.sort((a, b) => b.spend - a.spend);

    logger.info("Fetched campaigns for shop", {
      component: "shop-campaigns",
      shopId: shop_id,
      adAccountId: selectedAdAccount.id,
      campaignCount: campaignsWithInsights.length,
    });

    return NextResponse.json({
      success: true,
      facebook_connected: true,
      ad_accounts: adAccounts.map((acc: { id: string; name: string }) => ({
        id: acc.id,
        name: acc.name,
      })),
      selected_ad_account: {
        id: selectedAdAccount.id,
        name: selectedAdAccount.name,
      },
      campaigns: campaignsWithInsights,
      data_period: `${since} to ${until}`,
    });
  } catch (error) {
    logger.error(
      "Error in GET /api/bhb/shops/[shop_id]/campaigns:",
      error as Error,
      {
        component: "shop-campaigns",
      },
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch campaigns",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
