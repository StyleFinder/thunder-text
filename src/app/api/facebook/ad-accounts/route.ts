/**
 * GET /api/facebook/ad-accounts
 *
 * Retrieves the user's SELECTED ad accounts (not all available accounts)
 * Selected accounts are stored in the integration's additional_metadata
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { FacebookAPIError } from "@/lib/services/facebook-api";
import { logger } from "@/lib/logger";
import { lookupShopWithFallback } from "@/lib/shop-lookup";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get("shop");

    if (!shop) {
      return NextResponse.json(
        { success: false, error: "Shop parameter is required" },
        { status: 400 },
      );
    }

    // Get shop_id from shop domain (with fallback for standalone users)
    const { data: shopData, error: shopError } = await lookupShopWithFallback<{
      id: string;
      shop_domain: string;
    }>(supabase, shop, "id, shop_domain", "ad-accounts");

    if (shopError || !shopData) {
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 404 },
      );
    }

    // Get the Facebook integration to retrieve selected ad accounts
    const { data: integration, error: integrationError } = await supabase
      .from("integrations")
      .select("additional_metadata, is_active")
      .eq("shop_id", shopData.id)
      .eq("provider", "facebook")
      .single();

    if (integrationError || !integration) {
      throw new FacebookAPIError(
        "Facebook account not connected",
        404,
        "NOT_CONNECTED",
      );
    }

    if (!integration.is_active) {
      throw new FacebookAPIError(
        "Facebook integration is not active",
        404,
        "NOT_CONNECTED",
      );
    }

    // Return only the SELECTED ad accounts from integration metadata
    // ad_accounts contains the user-selected accounts (after selection in Settings)
    const selectedAdAccounts =
      integration.additional_metadata?.ad_accounts || [];

    if (selectedAdAccounts.length === 0) {
      // If no accounts selected yet, this might be first-time setup
      // Return empty with a helpful message
      return NextResponse.json({
        success: true,
        data: [],
        message:
          "No ad accounts selected. Please select accounts in Settings > Connections.",
      });
    }

    return NextResponse.json({
      success: true,
      data: selectedAdAccounts.map(
        (account: {
          id: string;
          account_id?: string;
          name: string;
          account_status?: number;
          currency?: string;
          timezone_name?: string;
        }) => ({
          id: account.id,
          account_id: account.account_id || account.id.replace("act_", ""),
          name: account.name,
          status: account.account_status,
          currency: account.currency,
          timezone: account.timezone_name,
        }),
      ),
    });
  } catch (error) {
    logger.error("Error in GET /api/facebook/ad-accounts:", error as Error, {
      component: "ad-accounts",
    });

    if (error instanceof FacebookAPIError) {
      if (error.errorCode === "NOT_CONNECTED") {
        return NextResponse.json(
          {
            success: false,
            error: "Facebook account not connected",
            code: "NOT_CONNECTED",
          },
          { status: 404 },
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.errorCode,
          type: error.errorType,
        },
        { status: error.statusCode || 500 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch ad accounts",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
