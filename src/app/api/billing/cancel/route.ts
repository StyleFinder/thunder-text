/**
 * API Route: /api/billing/cancel
 *
 * Handles subscription cancellation requests.
 * Uses Shopify Billing API to cancel the active subscription.
 *
 * Flow:
 * 1. Validate shop domain and find active subscription
 * 2. Call Shopify GraphQL API to cancel subscription
 * 3. Update local database to reflect cancellation
 * 4. Shopify will also send APP_SUBSCRIPTIONS_UPDATE webhook
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { cancelAppSubscription, getActiveSubscription } from "@/lib/shopify/graphql-billing";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface CancelRequest {
  shopDomain: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CancelRequest = await request.json();
    const { shopDomain } = body;

    if (!shopDomain) {
      return NextResponse.json(
        { success: false, error: "Missing shopDomain" },
        { status: 400 }
      );
    }

    logger.info("[Cancel Subscription] Processing cancellation request", {
      component: "cancel-subscription",
      shopDomain,
    });

    // Normalize shop domain
    const normalizedDomain = shopDomain.includes(".myshopify.com")
      ? shopDomain
      : `${shopDomain}.myshopify.com`;

    // Find the shop in our database
    const { data: shop, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("id, shop_domain, plan, subscription_status, shopify_charge_id")
      .eq("shop_domain", normalizedDomain)
      .single();

    if (shopError || !shop) {
      logger.error("[Cancel Subscription] Shop not found", shopError as Error, {
        component: "cancel-subscription",
        shopDomain: normalizedDomain,
      });
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 404 }
      );
    }

    // Check if shop has an active paid subscription
    if (!shop.shopify_charge_id) {
      logger.warn("[Cancel Subscription] No active subscription to cancel", {
        component: "cancel-subscription",
        shopDomain: normalizedDomain,
      });
      return NextResponse.json(
        { success: false, error: "No active subscription to cancel" },
        { status: 400 }
      );
    }

    // Get the active subscription from Shopify to confirm
    const activeSubscription = await getActiveSubscription(normalizedDomain);

    if (!activeSubscription) {
      logger.warn("[Cancel Subscription] No active Shopify subscription found", {
        component: "cancel-subscription",
        shopDomain: normalizedDomain,
      });

      // Update local database to reflect no active subscription
      await supabaseAdmin
        .from("shops")
        .update({
          plan: "free",
          subscription_status: "canceled",
          shopify_charge_id: null,
          shopify_subscription_status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", shop.id);

      return NextResponse.json({
        success: true,
        message: "Subscription already cancelled",
      });
    }

    // Cancel the subscription via Shopify Billing API
    const result = await cancelAppSubscription(normalizedDomain, activeSubscription.id);

    if (!result.success) {
      logger.error("[Cancel Subscription] Failed to cancel subscription", new Error(result.error || "Unknown error"), {
        component: "cancel-subscription",
        shopDomain: normalizedDomain,
        subscriptionId: activeSubscription.id,
        error: result.error,
      });

      return NextResponse.json(
        { success: false, error: result.error || "Failed to cancel subscription" },
        { status: 400 }
      );
    }

    // Update local database immediately (webhook will also update it)
    await supabaseAdmin
      .from("shops")
      .update({
        plan: "free",
        subscription_status: "canceled",
        shopify_subscription_status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", shop.id);

    logger.info("[Cancel Subscription] Subscription cancelled successfully", {
      component: "cancel-subscription",
      shopDomain: normalizedDomain,
      subscriptionId: activeSubscription.id,
    });

    return NextResponse.json({
      success: true,
      message: "Subscription cancelled successfully",
    });
  } catch (error) {
    logger.error("[Cancel Subscription] Error processing cancellation", error as Error, {
      component: "cancel-subscription",
    });

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
