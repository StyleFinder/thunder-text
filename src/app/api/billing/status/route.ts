/**
 * API Route: /api/billing/status
 *
 * Returns subscription status for a shop using shop domain query parameter.
 * Used by the billing settings page to display current plan and upgrade options.
 *
 * This combines data from:
 * 1. Local database (shops table) for plan info
 * 2. Shopify GraphQL API for active subscription details
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getActiveSubscription } from "@/lib/shopify/graphql-billing";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface SubscriptionInfo {
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  price?: {
    amount: string;
    interval: string;
  };
  isTest?: boolean;
  shopifySubscriptionId?: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shopDomain = searchParams.get("shop");

    if (!shopDomain) {
      return NextResponse.json(
        { success: false, error: "Missing shop parameter" },
        { status: 400 }
      );
    }

    // Normalize shop domain
    const normalizedDomain = shopDomain.includes(".myshopify.com")
      ? shopDomain
      : `${shopDomain}.myshopify.com`;

    logger.info("[Billing Status] Fetching subscription status", {
      component: "billing-status",
      shopDomain: normalizedDomain,
    });

    // Get shop data from database
    // Note: Using shopify_charge_id as the subscription identifier (not shopify_subscription_id which doesn't exist)
    const { data: shop, error: shopError } = await supabaseAdmin
      .from("shops")
      .select(`
        id,
        plan,
        subscription_status,
        subscription_current_period_end,
        shopify_charge_id,
        shopify_subscription_status,
        shopify_plan_name,
        shopify_trial_ends_at
      `)
      .eq("shop_domain", normalizedDomain)
      .single();

    if (shopError || !shop) {
      logger.error("[Billing Status] Shop not found", shopError as Error, {
        component: "billing-status",
        shopDomain: normalizedDomain,
      });
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 404 }
      );
    }

    // Build subscription info from database
    let subscriptionInfo: SubscriptionInfo = {
      plan: shop.plan || "free",
      status: shop.shopify_subscription_status || shop.subscription_status || "inactive",
      currentPeriodEnd: shop.subscription_current_period_end,
      trialEndsAt: shop.shopify_trial_ends_at,
      shopifySubscriptionId: shop.shopify_charge_id, // Using charge_id as subscription identifier
    };

    // Try to get live subscription data from Shopify
    try {
      const activeSubscription = await getActiveSubscription(normalizedDomain);

      if (activeSubscription) {
        // Determine plan from subscription name
        let plan = "pro";
        const subName = activeSubscription.name.toLowerCase();
        if (subName.includes("starter")) {
          plan = "starter";
        } else if (subName.includes("pro")) {
          plan = "pro";
        }

        // Map Shopify status to our status
        let status = activeSubscription.status.toLowerCase();
        if (status === "active") {
          status = "active";
        } else if (activeSubscription.trialDays > 0) {
          status = "trialing";
        }

        subscriptionInfo = {
          plan,
          status,
          currentPeriodEnd: activeSubscription.currentPeriodEnd,
          trialEndsAt: activeSubscription.trialDays > 0
            ? new Date(Date.now() + activeSubscription.trialDays * 24 * 60 * 60 * 1000).toISOString()
            : null,
          price: activeSubscription.price
            ? {
                amount: activeSubscription.price.amount,
                interval: activeSubscription.interval === "ANNUAL" ? "annual" : "monthly",
              }
            : undefined,
          isTest: activeSubscription.test,
          shopifySubscriptionId: activeSubscription.id,
        };
      }
    } catch (shopifyError) {
      // Shopify API error - fall back to database data
      logger.warn("[Billing Status] Failed to fetch from Shopify, using database", {
        component: "billing-status",
        shopDomain: normalizedDomain,
        error: shopifyError instanceof Error ? shopifyError.message : "Unknown error",
      });
    }

    // Handle local trial (our 14-day free trial)
    if (!shop.shopify_charge_id && shop.subscription_status === "trialing") {
      subscriptionInfo = {
        plan: "free",
        status: "trialing",
        currentPeriodEnd: shop.subscription_current_period_end,
        trialEndsAt: shop.subscription_current_period_end,
      };
    }

    logger.info("[Billing Status] Returning subscription info", {
      component: "billing-status",
      shopDomain: normalizedDomain,
      plan: subscriptionInfo.plan,
      status: subscriptionInfo.status,
    });

    return NextResponse.json({
      success: true,
      subscription: subscriptionInfo,
    });
  } catch (error) {
    logger.error("[Billing Status] Error fetching subscription", error as Error, {
      component: "billing-status",
    });

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
