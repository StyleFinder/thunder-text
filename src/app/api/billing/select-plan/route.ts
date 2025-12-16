/**
 * API Route: /api/billing/select-plan
 *
 * Handles plan selection after Shopify OAuth.
 * - For free plan: Permanent free tier with limited features (no trial)
 * - For paid plans (starter/pro): Uses Shopify Billing API to create subscription
 *   with 14-day trial (one-time per shop, not per plan)
 *
 * TRIAL LOGIC:
 * - Trial is tracked per shop, not per plan
 * - If shop has already used a trial (has_used_trial=true), no trial on any plan
 * - This prevents users from getting free trials when upgrading from starter to pro
 *
 * NOTE: This app uses the Shopify Billing API (Manual billing), which means:
 * - We use appSubscriptionCreate GraphQL mutation to create charges
 * - Shopify returns a confirmationUrl where merchant approves/declines
 * - APP_SUBSCRIPTIONS_UPDATE webhook fires when status changes
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createAppSubscription, PLAN_CONFIGS } from "@/lib/shopify/graphql-billing";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface SelectPlanRequest {
  planId: string;
  billingInterval?: "monthly" | "annual";
  shopDomain: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SelectPlanRequest = await request.json();
    const { planId, billingInterval, shopDomain } = body;

    if (!planId || !shopDomain) {
      return NextResponse.json(
        { success: false, error: "Missing planId or shopDomain" },
        { status: 400 }
      );
    }

    logger.info("[Select Plan] Processing plan selection", {
      component: "select-plan",
      planId,
      shopDomain,
    });

    // Normalize shop domain
    const normalizedDomain = shopDomain.includes(".myshopify.com")
      ? shopDomain
      : `${shopDomain}.myshopify.com`;

    // Find the shop in our database (include has_used_trial for trial eligibility check)
    const { data: shop, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("id, shop_domain, plan, subscription_status, has_used_trial")
      .eq("shop_domain", normalizedDomain)
      .single();

    if (shopError || !shop) {
      logger.error("[Select Plan] Shop not found", shopError as Error, {
        component: "select-plan",
        shopDomain: normalizedDomain,
      });
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 404 }
      );
    }

    // Handle free plan selection (permanent free tier, no trial)
    if (planId === "free") {
      // Free plan is a permanent tier with limited features:
      // - 15 product descriptions/month
      // - 10 ad descriptions/month
      // No trial period - it's already free!

      // Update shop record to free plan
      await supabaseAdmin
        .from("shops")
        .update({
          plan: "free",
          subscription_status: "active", // Free plan is always "active"
          updated_at: new Date().toISOString(),
        })
        .eq("id", shop.id);

      logger.info("[Select Plan] Free plan activated", {
        component: "select-plan",
        shopId: shop.id,
      });

      // Redirect to dashboard
      const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?shop=${normalizedDomain}&plan=free`;

      return NextResponse.json({
        success: true,
        dashboardUrl,
      });
    }

    // Handle paid plan selection (starter or pro)
    // Use Shopify Billing API to create subscription
    if (planId === "starter" || planId === "pro") {
      // Determine if this is a test charge (dev stores get free test subscriptions)
      const isTestStore = normalizedDomain.includes("dev") ||
                          normalizedDomain.includes("test") ||
                          normalizedDomain.includes("staging") ||
                          process.env.NODE_ENV === "development";

      // Check trial eligibility: shop only gets trial ONCE, regardless of which plan
      // If has_used_trial is true, they get 0 trial days
      const hasUsedTrial = shop.has_used_trial === true;
      const trialDays = hasUsedTrial ? 0 : PLAN_CONFIGS[planId].trialDays;

      logger.info("[Select Plan] Creating subscription via Billing API", {
        component: "select-plan",
        shopId: shop.id,
        planId,
        billingInterval: billingInterval || "monthly",
        isTestStore,
        hasUsedTrial,
        trialDays,
      });

      // Create the subscription using GraphQL Billing API
      const result = await createAppSubscription(
        normalizedDomain,
        planId,
        billingInterval || "monthly",
        isTestStore, // Test charges for dev stores
        trialDays // Pass explicit trial days (0 if already used)
      );

      if (!result.success) {
        logger.error("[Select Plan] Failed to create subscription", new Error(result.error || "Unknown error"), {
          component: "select-plan",
          shopId: shop.id,
          planId,
          error: result.error,
          userErrors: result.userErrors,
        });

        return NextResponse.json(
          {
            success: false,
            error: result.error || "Failed to create subscription",
            userErrors: result.userErrors,
          },
          { status: 400 }
        );
      }

      // Update shop with selected plan (pending activation until webhook confirms)
      // Also mark as having used trial if this is their first paid plan subscription
      const updateData: Record<string, unknown> = {
        plan: planId,
        subscription_status: "pending",
        shopify_charge_id: result.subscriptionId,
        updated_at: new Date().toISOString(),
      };

      // Mark shop as having used trial (if they're getting one)
      if (!hasUsedTrial && trialDays > 0) {
        updateData.has_used_trial = true;
        updateData.first_trial_started_at = new Date().toISOString();
      }

      await supabaseAdmin
        .from("shops")
        .update(updateData)
        .eq("id", shop.id);

      logger.info("[Select Plan] Subscription created, redirecting to confirmation", {
        component: "select-plan",
        shopId: shop.id,
        planId,
        subscriptionId: result.subscriptionId,
        confirmationUrl: result.confirmationUrl,
        hasUsedTrial,
        trialDays,
      });

      // Return the confirmation URL for redirect
      return NextResponse.json({
        success: true,
        redirectUrl: result.confirmationUrl,
        trialDays, // Include trial days in response so UI can show appropriate messaging
      });
    }

    // Invalid plan
    return NextResponse.json(
      { success: false, error: "Invalid plan selected" },
      { status: 400 }
    );

  } catch (error) {
    logger.error("[Select Plan] Error processing plan selection", error as Error, {
      component: "select-plan",
    });

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
