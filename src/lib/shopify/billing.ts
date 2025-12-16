/**
 * Shopify Billing Utilities
 *
 * Provides utilities for checking subscription status and redirecting
 * users to Shopify's managed pricing page.
 *
 * This integrates with Shopify's Managed Pricing system where:
 * - Plans are configured in Shopify Partner Dashboard
 * - Shopify hosts the plan selection page
 * - APP_SUBSCRIPTIONS_UPDATE webhook notifies of status changes
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/**
 * Subscription status types
 */
export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "expired"
  | "cancelled"
  | "frozen"
  | "pending"
  | "inactive";

/**
 * Subscription check result
 */
export interface SubscriptionCheckResult {
  hasActiveSubscription: boolean;
  isTrialing: boolean;
  trialExpired: boolean;
  trialDaysRemaining: number | null;
  status: SubscriptionStatus;
  planName: string | null;
  requiresUpgrade: boolean;
  shopifyChargeId: string | null;
}

/**
 * Check if a shop has an active subscription or valid trial
 *
 * @param shopId - The shop UUID
 * @returns Subscription check result with details
 */
export async function checkSubscriptionStatus(
  shopId: string
): Promise<SubscriptionCheckResult> {
  try {
    const { data: shop, error } = await supabaseAdmin
      .from("shops")
      .select(
        `
        id,
        plan,
        subscription_status,
        subscription_current_period_end,
        shopify_charge_id,
        shopify_subscription_status,
        shopify_plan_name,
        shopify_trial_ends_at
      `
      )
      .eq("id", shopId)
      .single();

    if (error || !shop) {
      logger.error("Failed to check subscription status", error as Error, {
        component: "billing",
        shopId,
      });
      return {
        hasActiveSubscription: false,
        isTrialing: false,
        trialExpired: true,
        trialDaysRemaining: null,
        status: "inactive",
        planName: null,
        requiresUpgrade: true,
        shopifyChargeId: null,
      };
    }

    const now = new Date();

    // Check Shopify subscription status first (managed pricing)
    if (shop.shopify_subscription_status === "active") {
      return {
        hasActiveSubscription: true,
        isTrialing: false,
        trialExpired: false,
        trialDaysRemaining: null,
        status: "active",
        planName: shop.shopify_plan_name || shop.plan,
        requiresUpgrade: false,
        shopifyChargeId: shop.shopify_charge_id,
      };
    }

    // Check if in Shopify trial
    if (shop.shopify_trial_ends_at) {
      const trialEnd = new Date(shop.shopify_trial_ends_at);
      if (trialEnd > now) {
        const daysRemaining = Math.ceil(
          (trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          hasActiveSubscription: true,
          isTrialing: true,
          trialExpired: false,
          trialDaysRemaining: daysRemaining,
          status: "trialing",
          planName: shop.shopify_plan_name || shop.plan,
          requiresUpgrade: false,
          shopifyChargeId: shop.shopify_charge_id,
        };
      }
    }

    // Check local subscription status (our 14-day trial)
    if (shop.subscription_status === "trialing" || shop.subscription_status === "active") {
      // Check if local trial/subscription is still valid
      if (shop.subscription_current_period_end) {
        const periodEnd = new Date(shop.subscription_current_period_end);
        if (periodEnd > now) {
          const daysRemaining = Math.ceil(
            (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          return {
            hasActiveSubscription: true,
            isTrialing: shop.subscription_status === "trialing",
            trialExpired: false,
            trialDaysRemaining:
              shop.subscription_status === "trialing" ? daysRemaining : null,
            status: shop.subscription_status as SubscriptionStatus,
            planName: shop.plan,
            requiresUpgrade: false,
            shopifyChargeId: shop.shopify_charge_id,
          };
        }
      }
    }

    // No active subscription - check why
    const status = (shop.shopify_subscription_status ||
      shop.subscription_status ||
      "inactive") as SubscriptionStatus;

    return {
      hasActiveSubscription: false,
      isTrialing: false,
      trialExpired: true,
      trialDaysRemaining: null,
      status,
      planName: shop.plan,
      requiresUpgrade: true,
      shopifyChargeId: shop.shopify_charge_id,
    };
  } catch (error) {
    logger.error("Error checking subscription status", error as Error, {
      component: "billing",
      shopId,
    });
    return {
      hasActiveSubscription: false,
      isTrialing: false,
      trialExpired: true,
      trialDaysRemaining: null,
      status: "inactive",
      planName: null,
      requiresUpgrade: true,
      shopifyChargeId: null,
    };
  }
}

/**
 * Check subscription status by shop domain
 *
 * @param shopDomain - The Shopify domain (e.g., "store.myshopify.com")
 * @returns Subscription check result
 */
export async function checkSubscriptionByDomain(
  shopDomain: string
): Promise<SubscriptionCheckResult> {
  try {
    const { data: shop, error } = await supabaseAdmin
      .from("shops")
      .select("id")
      .eq("shop_domain", shopDomain)
      .single();

    if (error || !shop) {
      return {
        hasActiveSubscription: false,
        isTrialing: false,
        trialExpired: true,
        trialDaysRemaining: null,
        status: "inactive",
        planName: null,
        requiresUpgrade: true,
        shopifyChargeId: null,
      };
    }

    return checkSubscriptionStatus(shop.id);
  } catch (error) {
    logger.error("Error checking subscription by domain", error as Error, {
      component: "billing",
      shopDomain,
    });
    return {
      hasActiveSubscription: false,
      isTrialing: false,
      trialExpired: true,
      trialDaysRemaining: null,
      status: "inactive",
      planName: null,
      requiresUpgrade: true,
      shopifyChargeId: null,
    };
  }
}

/**
 * Get the Shopify pricing page URL for a shop
 *
 * This URL takes the merchant to Shopify's hosted plan selection page
 * where they can choose a plan configured in your Partner Dashboard.
 *
 * @param shopDomain - The shop's Shopify domain (e.g., "store.myshopify.com")
 * @returns The URL to redirect the merchant to
 */
export function getShopifyPricingPageUrl(shopDomain: string): string {
  // Extract the store handle (everything before .myshopify.com)
  const storeHandle = shopDomain.replace(".myshopify.com", "");

  // Get the app handle from environment
  // Production: thunder-text-29, Development: thunder-text-dev-4
  // This should match your app's handle in the Shopify Partner Dashboard
  const appHandle = process.env.SHOPIFY_APP_HANDLE || "thunder-text-29";

  return `https://admin.shopify.com/store/${storeHandle}/charges/${appHandle}/pricing_plans`;
}

/**
 * Get the welcome/return URL for after subscription approval
 *
 * This is the URL Shopify redirects to after the merchant approves a plan.
 * Configure this in your Partner Dashboard as the "Welcome link".
 *
 * @param shopDomain - The shop's Shopify domain
 * @returns The welcome URL
 */
export function getSubscriptionWelcomeUrl(shopDomain: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.thundertext.com";
  return `${baseUrl}/dashboard?shop=${shopDomain}&subscription=confirmed`;
}

/**
 * Require active subscription or trial
 *
 * Use this in API routes to ensure the shop has an active subscription.
 * Returns the subscription result if valid, throws if not.
 *
 * @param shopId - The shop UUID
 * @returns Subscription check result
 * @throws Error if subscription is not active
 */
export async function requireActiveSubscription(
  shopId: string
): Promise<SubscriptionCheckResult> {
  const result = await checkSubscriptionStatus(shopId);

  if (!result.hasActiveSubscription) {
    const error = new Error("Active subscription required");
    (error as Error & { code: string }).code = "SUBSCRIPTION_REQUIRED";
    (error as Error & { subscriptionResult: SubscriptionCheckResult }).subscriptionResult = result;
    throw error;
  }

  return result;
}

/**
 * Check if shop is in trial period
 *
 * @param shopId - The shop UUID
 * @returns True if in trial, false otherwise
 */
export async function isInTrialPeriod(shopId: string): Promise<boolean> {
  const result = await checkSubscriptionStatus(shopId);
  return result.isTrialing && !result.trialExpired;
}

/**
 * Get trial days remaining
 *
 * @param shopId - The shop UUID
 * @returns Number of days remaining, or null if not in trial
 */
export async function getTrialDaysRemaining(
  shopId: string
): Promise<number | null> {
  const result = await checkSubscriptionStatus(shopId);
  return result.trialDaysRemaining;
}
