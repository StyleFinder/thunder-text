/**
 * Subscription Guard Middleware
 *
 * Middleware to protect routes that require an active subscription or trial.
 * Returns appropriate error responses when subscription is expired.
 */

import { NextResponse } from "next/server";
import {
  checkSubscriptionStatus,
  getShopifyPricingPageUrl,
  SubscriptionCheckResult,
} from "@/lib/shopify/billing";
import { logger } from "@/lib/logger";

/**
 * Response when subscription is required
 */
export interface SubscriptionRequiredResponse {
  error: string;
  code: "SUBSCRIPTION_REQUIRED" | "TRIAL_EXPIRED";
  requiresUpgrade: true;
  pricingPageUrl: string;
  status: string;
  trialExpired?: boolean;
}

/**
 * Check subscription and return error response if not active
 *
 * Usage in API route:
 * ```typescript
 * const subscriptionError = await checkSubscriptionGuard(shopId, shopDomain);
 * if (subscriptionError) return subscriptionError;
 * ```
 *
 * @param shopId - The shop UUID
 * @param shopDomain - The shop's Shopify domain (for pricing URL)
 * @returns NextResponse error if subscription required, null if OK
 */
export async function checkSubscriptionGuard(
  shopId: string,
  shopDomain: string
): Promise<NextResponse<SubscriptionRequiredResponse> | null> {
  try {
    const subscriptionStatus = await checkSubscriptionStatus(shopId);

    if (subscriptionStatus.hasActiveSubscription) {
      return null; // Subscription is active, allow request
    }

    // Subscription not active - return error with upgrade info
    const pricingPageUrl = getShopifyPricingPageUrl(shopDomain);

    logger.info("Subscription required - blocking request", {
      component: "subscription-guard",
      shopId,
      shopDomain,
      status: subscriptionStatus.status,
      trialExpired: subscriptionStatus.trialExpired,
    });

    const errorCode = subscriptionStatus.trialExpired
      ? "TRIAL_EXPIRED"
      : "SUBSCRIPTION_REQUIRED";

    const errorMessage = subscriptionStatus.trialExpired
      ? "Your trial has expired. Please upgrade to continue using Thunder Text."
      : "An active subscription is required to use this feature.";

    return NextResponse.json(
      {
        error: errorMessage,
        code: errorCode,
        requiresUpgrade: true,
        pricingPageUrl,
        status: subscriptionStatus.status,
        trialExpired: subscriptionStatus.trialExpired,
      },
      { status: 402 } // 402 Payment Required
    );
  } catch (error) {
    logger.error("Subscription guard error", error as Error, {
      component: "subscription-guard",
      shopId,
      shopDomain,
    });

    // On error, allow the request to proceed (fail open for better UX)
    // You can change this to fail closed for stricter security
    return null;
  }
}

/**
 * Get subscription status without blocking
 *
 * Use this when you want to check subscription but not block the request.
 * Useful for showing trial warnings, upgrade prompts, etc.
 *
 * @param shopId - The shop UUID
 * @returns Subscription check result
 */
export async function getSubscriptionInfo(
  shopId: string
): Promise<SubscriptionCheckResult> {
  return checkSubscriptionStatus(shopId);
}

/**
 * Wrap a handler with subscription check
 *
 * Higher-order function to wrap API handlers with subscription checking.
 *
 * Usage:
 * ```typescript
 * export const POST = withSubscriptionCheck(async (request, shopId, shopDomain) => {
 *   // Your handler code - subscription is guaranteed active
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function withSubscriptionCheck<T>(
  handler: (
    request: Request,
    shopId: string,
    shopDomain: string,
    subscriptionInfo: SubscriptionCheckResult
  ) => Promise<NextResponse<T>>
) {
  return async (
    request: Request,
    shopId: string,
    shopDomain: string
  ): Promise<NextResponse<T | SubscriptionRequiredResponse>> => {
    const subscriptionError = await checkSubscriptionGuard(shopId, shopDomain);
    if (subscriptionError) {
      return subscriptionError;
    }

    const subscriptionInfo = await checkSubscriptionStatus(shopId);
    return handler(request, shopId, shopDomain, subscriptionInfo);
  };
}

/**
 * Create subscription required response manually
 *
 * Use when you need to return subscription required error from custom logic.
 *
 * @param shopDomain - Shop domain for pricing URL
 * @param isTrialExpired - Whether this is specifically trial expiration
 */
export function createSubscriptionRequiredResponse(
  shopDomain: string,
  isTrialExpired = false
): NextResponse<SubscriptionRequiredResponse> {
  const pricingPageUrl = getShopifyPricingPageUrl(shopDomain);

  return NextResponse.json(
    {
      error: isTrialExpired
        ? "Your trial has expired. Please upgrade to continue using Thunder Text."
        : "An active subscription is required to use this feature.",
      code: isTrialExpired ? "TRIAL_EXPIRED" : "SUBSCRIPTION_REQUIRED",
      requiresUpgrade: true,
      pricingPageUrl,
      status: isTrialExpired ? "expired" : "inactive",
      trialExpired: isTrialExpired,
    },
    { status: 402 }
  );
}
