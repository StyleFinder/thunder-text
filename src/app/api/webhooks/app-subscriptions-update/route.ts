/**
 * Webhook handler for app_subscriptions/update events
 * Triggered when a merchant's subscription status changes (approved, cancelled, etc.)
 *
 * This is the critical webhook for Shopify Managed Pricing integration.
 * Shopify sends this webhook when:
 * - Merchant approves a subscription (ACTIVE)
 * - Merchant cancels subscription (CANCELLED)
 * - Payment fails (FROZEN)
 * - Trial expires without payment (EXPIRED)
 * - Merchant declines subscription (DECLINED)
 */
import { NextRequest, NextResponse } from "next/server";
import {
  validateWebhook,
  validateWebhookTopic,
  extractWebhookMetadata,
} from "@/lib/middleware/webhook-validation";
import { supabaseAdmin } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { alertBillingError } from "@/lib/alerting/critical-alerts";

/**
 * Route segment config - webhook limits
 * - 5MB body size limit for webhook payloads
 * - 60s timeout for processing
 */
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Shopify AppSubscription status types
 */
type ShopifySubscriptionStatus =
  | "PENDING"
  | "ACTIVE"
  | "DECLINED"
  | "EXPIRED"
  | "FROZEN"
  | "CANCELLED";

/**
 * Webhook payload structure for app_subscriptions/update
 */
interface AppSubscriptionWebhookPayload {
  app_subscription: {
    admin_graphql_api_id: string; // e.g., "gid://shopify/AppSubscription/12345"
    name: string; // Plan name
    status: ShopifySubscriptionStatus;
    admin_graphql_api_shop_id: string;
    created_at: string;
    updated_at: string;
    currency: string;
    capped_amount?: string;
    trial_ends_on?: string;
    billing_on?: string;
    test?: boolean;
  };
}

/**
 * Map Shopify subscription status to our internal status
 */
function mapShopifyStatus(shopifyStatus: ShopifySubscriptionStatus): string {
  const statusMap: Record<ShopifySubscriptionStatus, string> = {
    PENDING: "pending",
    ACTIVE: "active",
    DECLINED: "declined",
    EXPIRED: "expired",
    FROZEN: "frozen",
    CANCELLED: "cancelled",
  };
  // eslint-disable-next-line security/detect-object-injection
  return statusMap[shopifyStatus] || "pending";
}

/**
 * Map Shopify status to our general subscription_status field
 */
function mapToGeneralStatus(shopifyStatus: ShopifySubscriptionStatus): string {
  switch (shopifyStatus) {
    case "ACTIVE":
      return "active";
    case "PENDING":
      return "trialing"; // Pending usually means in trial
    case "FROZEN":
      return "past_due";
    case "CANCELLED":
    case "DECLINED":
    case "EXPIRED":
      return "canceled";
    default:
      return "inactive";
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate webhook signature
    const validation = await validateWebhook(request);

    if (!validation.valid) {
      logger.error(
        `Webhook validation failed: ${validation.error}`,
        undefined,
        { component: "app-subscriptions-update" },
      );
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extract webhook metadata
    const metadata = extractWebhookMetadata(request.headers);

    // Validate webhook topic
    if (!validateWebhookTopic(metadata.topic, ["app_subscriptions/update"])) {
      return NextResponse.json(
        { error: "Invalid webhook topic" },
        { status: 400 },
      );
    }

    // Parse webhook body
    const webhookData: AppSubscriptionWebhookPayload = JSON.parse(
      validation.body!,
    );
    const subscription = webhookData.app_subscription;
    const shopDomain = metadata.shopDomain;

    logger.info("Processing app_subscriptions/update webhook", {
      component: "app-subscriptions-update",
      shopDomain,
      chargeId: subscription.admin_graphql_api_id,
      status: subscription.status,
      planName: subscription.name,
      isTest: subscription.test,
    });

    if (!shopDomain) {
      logger.error("Missing shop domain in webhook", undefined, {
        component: "app-subscriptions-update",
      });
      return NextResponse.json(
        { error: "Missing shop domain" },
        { status: 400 },
      );
    }

    // Find the shop in our database
    const { data: shop, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("id, shop_domain, shopify_subscription_status")
      .eq("shop_domain", shopDomain)
      .single();

    if (shopError || !shop) {
      logger.error(
        "Shop not found for subscription update",
        shopError as Error,
        {
          component: "app-subscriptions-update",
          shopDomain,
        },
      );
      // Return 200 to prevent Shopify from retrying - shop may have been deleted
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 200 },
      );
    }

    // Update shop with new subscription status
    const updateData: Record<string, unknown> = {
      shopify_charge_id: subscription.admin_graphql_api_id,
      shopify_subscription_status: mapShopifyStatus(subscription.status),
      shopify_plan_name: subscription.name,
      subscription_status: mapToGeneralStatus(subscription.status),
      updated_at: new Date().toISOString(),
    };

    // Add trial end date if present
    if (subscription.trial_ends_on) {
      updateData.shopify_trial_ends_at = subscription.trial_ends_on;
    }

    // Add billing date if present
    if (subscription.billing_on) {
      updateData.shopify_billing_on = subscription.billing_on;
    }

    // If subscription is active, update plan to pro (or based on plan name)
    if (subscription.status === "ACTIVE") {
      // Map plan name to our internal plan (you can customize this)
      const planName = subscription.name.toLowerCase();
      if (planName.includes("pro") || planName.includes("premium")) {
        updateData.plan = "pro";
      } else if (planName.includes("starter") || planName.includes("basic")) {
        updateData.plan = "starter";
      } else {
        updateData.plan = "pro"; // Default to pro for any paid plan
      }
    }

    // If subscription is cancelled/expired/declined, set plan to free
    if (["CANCELLED", "EXPIRED", "DECLINED"].includes(subscription.status)) {
      updateData.plan = "free";
    }

    const { error: updateError } = await supabaseAdmin
      .from("shops")
      .update(updateData)
      .eq("id", shop.id);

    if (updateError) {
      logger.error(
        "Failed to update shop subscription status",
        updateError as Error,
        {
          component: "app-subscriptions-update",
          shopDomain,
          chargeId: subscription.admin_graphql_api_id,
        },
      );
      // Don't return error - webhook should still succeed for logging
    }

    // Log the billing event for audit trail - CRITICAL for billing reconciliation
    try {
      const { error: billingError } = await supabaseAdmin
        .from("shopify_billing_events")
        .insert({
          shop_id: shop.id,
          event_type: "subscription_update",
          charge_id: subscription.admin_graphql_api_id,
          status: subscription.status,
          plan_name: subscription.name,
          event_data: {
            webhook_id: metadata.webhookId,
            api_version: metadata.apiVersion,
            currency: subscription.currency,
            capped_amount: subscription.capped_amount,
            trial_ends_on: subscription.trial_ends_on,
            billing_on: subscription.billing_on,
            test: subscription.test,
            created_at: subscription.created_at,
            updated_at: subscription.updated_at,
          },
        });

      if (billingError) {
        // CRITICAL: Billing event logging failure requires immediate attention
        await alertBillingError(
          "Failed to log billing event - data may be lost",
          {
            shopId: shop.id,
            shopDomain,
            chargeId: subscription.admin_graphql_api_id,
            status: subscription.status,
            planName: subscription.name,
            webhookId: metadata.webhookId,
          },
          billingError,
        );
      }
    } catch (err) {
      // CRITICAL: Unexpected error in billing logging
      await alertBillingError(
        "Unexpected error logging billing event",
        {
          shopId: shop.id,
          shopDomain,
          chargeId: subscription.admin_graphql_api_id,
          status: subscription.status,
        },
        err,
      );
    }

    // Log webhook processing
    try {
      const { error: webhookLogError } = await supabaseAdmin
        .from("webhook_logs")
        .insert({
          topic: metadata.topic,
          shop_domain: shopDomain,
          webhook_id: metadata.webhookId,
          api_version: metadata.apiVersion,
          processed_at: new Date().toISOString(),
          status: "success",
        });

      if (webhookLogError) {
        logger.warn("Failed to log webhook success", {
          component: "app-subscriptions-update",
          error: webhookLogError.message,
          webhookId: metadata.webhookId,
        });
      }
    } catch (err) {
      logger.error("Failed to log webhook", err as Error, {
        component: "app-subscriptions-update",
        webhookId: metadata.webhookId,
      });
    }

    logger.info("Successfully processed subscription update", {
      component: "app-subscriptions-update",
      shopDomain,
      newStatus: subscription.status,
      planName: subscription.name,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error("Webhook processing error", error as Error, {
      component: "app-subscriptions-update",
    });

    // Log failed webhook
    try {
      const metadata = extractWebhookMetadata(request.headers);
      await supabaseAdmin.from("webhook_logs").insert({
        topic: metadata.topic,
        shop_domain: metadata.shopDomain,
        webhook_id: metadata.webhookId,
        api_version: metadata.apiVersion,
        processed_at: new Date().toISOString(),
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } catch (logError) {
      logger.error("Failed to log webhook error", logError as Error, {
        component: "app-subscriptions-update",
      });
    }

    // Always return 200 to prevent Shopify from retrying
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
