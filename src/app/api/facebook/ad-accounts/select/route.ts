/**
 * POST /api/facebook/ad-accounts/select
 *
 * Finalizes ad account selection after Facebook OAuth
 * Updates the integration to only include selected ad accounts
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

interface SelectAdAccountsRequest {
  shop: string;
  selected_account_ids: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: SelectAdAccountsRequest = await request.json();
    const { shop, selected_account_ids } = body;

    if (!shop) {
      return NextResponse.json(
        { success: false, error: "Shop parameter is required" },
        { status: 400 },
      );
    }

    if (!selected_account_ids || selected_account_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one ad account must be selected" },
        { status: 400 },
      );
    }

    // Get shop by domain
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("id")
      .eq("shop_domain", shop)
      .single();

    if (shopError || !shopData) {
      logger.error(
        "Shop not found for ad account selection",
        shopError as Error,
        {
          component: "ad-account-select",
          shop,
        },
      );
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 404 },
      );
    }

    // Get current Facebook integration
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from("integrations")
      .select("id, additional_metadata")
      .eq("shop_id", shopData.id)
      .eq("provider", "facebook")
      .single();

    if (integrationError || !integration) {
      logger.error(
        "Facebook integration not found",
        integrationError as Error,
        {
          component: "ad-account-select",
          shopId: shopData.id,
        },
      );
      return NextResponse.json(
        { success: false, error: "Facebook integration not found" },
        { status: 404 },
      );
    }

    // Get all ad accounts from the integration (use all_ad_accounts if available, fallback to ad_accounts)
    const allAdAccounts =
      integration.additional_metadata?.all_ad_accounts ||
      integration.additional_metadata?.ad_accounts ||
      [];

    // Filter to only selected accounts
    const selectedAccounts = allAdAccounts.filter((acc: { id: string }) =>
      selected_account_ids.includes(acc.id),
    );

    if (selectedAccounts.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "None of the selected account IDs were found",
        },
        { status: 400 },
      );
    }

    // Update the primary ad account to the first selected account
    const primaryAccount = selectedAccounts[0];

    // Update the integration with filtered ad accounts
    const updatedMetadata = {
      ...integration.additional_metadata,
      ad_accounts: selectedAccounts,
      primary_ad_account_id: primaryAccount.id,
      primary_ad_account_name: primaryAccount.name,
      ad_accounts_selected_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabaseAdmin
      .from("integrations")
      .update({
        additional_metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", integration.id);

    if (updateError) {
      logger.error(
        "Failed to update ad account selection",
        updateError as Error,
        {
          component: "ad-account-select",
          shopId: shopData.id,
        },
      );
      return NextResponse.json(
        { success: false, error: "Failed to save ad account selection" },
        { status: 500 },
      );
    }

    logger.info("Ad account selection saved", {
      component: "ad-account-select",
      shopId: shopData.id,
      selectedCount: selectedAccounts.length,
      primaryAccountId: primaryAccount.id,
    });

    return NextResponse.json({
      success: true,
      selected_accounts: selectedAccounts.length,
      primary_account: {
        id: primaryAccount.id,
        name: primaryAccount.name,
      },
    });
  } catch (error) {
    logger.error(
      "Error in POST /api/facebook/ad-accounts/select:",
      error as Error,
      {
        component: "ad-account-select",
      },
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to save ad account selection",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/facebook/ad-accounts/select
 *
 * Gets all available ad accounts for selection
 * Used when user wants to change their ad account selection
 */
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

    // Get shop by domain
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("id")
      .eq("shop_domain", shop)
      .single();

    if (shopError || !shopData) {
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 404 },
      );
    }

    // Get Facebook integration
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from("integrations")
      .select("additional_metadata")
      .eq("shop_id", shopData.id)
      .eq("provider", "facebook")
      .single();

    if (integrationError || !integration) {
      return NextResponse.json(
        { success: false, error: "Facebook integration not found" },
        { status: 404 },
      );
    }

    // all_ad_accounts contains the complete list from OAuth (never modified)
    // ad_accounts contains the user-selected accounts (can be subset of all)
    const allAdAccounts =
      integration.additional_metadata?.all_ad_accounts ||
      integration.additional_metadata?.ad_accounts ||
      [];
    const selectedAccounts = integration.additional_metadata?.ad_accounts || [];
    const selectedAccountIds = selectedAccounts.map(
      (acc: { id: string }) => acc.id,
    );

    return NextResponse.json({
      success: true,
      ad_accounts: allAdAccounts,
      selected_account_ids: selectedAccountIds,
      primary_account_id:
        integration.additional_metadata?.primary_ad_account_id,
    });
  } catch (error) {
    logger.error(
      "Error in GET /api/facebook/ad-accounts/select:",
      error as Error,
      {
        component: "ad-account-select",
      },
    );

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
