/**
 * Shopify GraphQL Billing API
 *
 * Creates app subscriptions using Shopify's GraphQL Admin API.
 * This is the programmatic approach to billing, as opposed to
 * Shopify's Managed Pricing which requires Partner Dashboard configuration.
 *
 * Flow:
 * 1. Call createAppSubscription() with plan details
 * 2. Redirect merchant to confirmationUrl
 * 3. Merchant approves/declines in Shopify Admin
 * 4. APP_SUBSCRIPTIONS_UPDATE webhook fires with result
 */

import { shopifyGraphQL } from "./client";
import { logger } from "@/lib/logger";

/**
 * Plan configuration for Thunder Text
 */
export interface PlanConfig {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  trialDays: number; // 14 days for paid plans, 0 for free
  // Free plan limits (only applies to free plan)
  productDescriptions?: number;
  adDescriptions?: number;
  // Paid plan credits
  credits?: number;
}

/**
 * Available plans
 *
 * Free plan: Permanent free tier with limited features
 * - 15 product descriptions/month
 * - 10 ad descriptions/month
 * - No trial period (it's already free)
 *
 * Starter/Pro: Paid plans with 14-day trial (one-time only per shop)
 * - Trial is tracked per shop, not per plan
 * - If shop has used trial before, no trial on any plan upgrade
 */
export const PLAN_CONFIGS: Record<string, PlanConfig> = {
  free: {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    trialDays: 0, // No trial - it's already free
    productDescriptions: 15,
    adDescriptions: 10,
  },
  starter: {
    id: "starter",
    name: "Thunder Text Starter",
    monthlyPrice: 19,
    annualPrice: 190,
    trialDays: 14, // 14-day trial (if eligible)
    credits: 5000,
  },
  pro: {
    id: "pro",
    name: "Thunder Text Pro",
    monthlyPrice: 34,
    annualPrice: 340,
    trialDays: 14, // 14-day trial (if eligible)
    credits: 25000,
  },
};

/**
 * Billing interval types
 */
export type BillingInterval = "EVERY_30_DAYS" | "ANNUAL";

/**
 * Result from creating an app subscription
 */
export interface CreateSubscriptionResult {
  success: boolean;
  confirmationUrl?: string;
  subscriptionId?: string;
  error?: string;
  userErrors?: Array<{ field: string[]; message: string }>;
}

/**
 * GraphQL mutation for creating an app subscription
 */
const APP_SUBSCRIPTION_CREATE_MUTATION = `
  mutation appSubscriptionCreate(
    $name: String!
    $returnUrl: URL!
    $trialDays: Int
    $test: Boolean
    $lineItems: [AppSubscriptionLineItemInput!]!
  ) {
    appSubscriptionCreate(
      name: $name
      returnUrl: $returnUrl
      trialDays: $trialDays
      test: $test
      lineItems: $lineItems
    ) {
      appSubscription {
        id
        name
        status
        createdAt
        currentPeriodEnd
        trialDays
      }
      confirmationUrl
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * Create an app subscription for a shop
 *
 * @param shopDomain - The shop's myshopify.com domain
 * @param planId - The plan to subscribe to ('starter' or 'pro')
 * @param billingInterval - 'monthly' or 'annual'
 * @param isTest - Whether this is a test charge (for development)
 * @param trialDays - Number of trial days (pass 0 if shop has already used trial)
 * @returns Result with confirmationUrl to redirect merchant to
 */
export async function createAppSubscription(
  shopDomain: string,
  planId: string,
  billingInterval: "monthly" | "annual" = "monthly",
  isTest: boolean = false,
  trialDays?: number
): Promise<CreateSubscriptionResult> {
  try {
    const plan = PLAN_CONFIGS[planId];
    if (!plan) {
      return {
        success: false,
        error: `Invalid plan ID: ${planId}`,
      };
    }

    // Determine price based on billing interval
    const price = billingInterval === "annual" ? plan.annualPrice : plan.monthlyPrice;
    const interval: BillingInterval = billingInterval === "annual" ? "ANNUAL" : "EVERY_30_DAYS";

    // Build the return URL (where Shopify redirects after approval/decline)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.thundertext.com";
    const returnUrl = `${baseUrl}/api/billing/callback?shop=${shopDomain}`;

    // Construct the subscription name with interval
    const subscriptionName = `${plan.name} (${billingInterval === "annual" ? "Annual" : "Monthly"})`;

    // Use provided trialDays if specified, otherwise use plan default
    const effectiveTrialDays = trialDays !== undefined ? trialDays : plan.trialDays;

    logger.info("[GraphQL Billing] Creating subscription", {
      component: "graphql-billing",
      shopDomain,
      planId,
      billingInterval,
      price,
      isTest,
      trialDays: effectiveTrialDays,
    });

    const variables = {
      name: subscriptionName,
      returnUrl,
      trialDays: effectiveTrialDays,
      test: isTest,
      lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
              price: {
                amount: price.toString(),
                currencyCode: "USD",
              },
              interval,
            },
          },
        },
      ],
    };

    interface AppSubscriptionCreateResponse {
      appSubscriptionCreate: {
        appSubscription: {
          id: string;
          name: string;
          status: string;
          createdAt: string;
          currentPeriodEnd: string | null;
          trialDays: number;
        } | null;
        confirmationUrl: string | null;
        userErrors: Array<{ field: string[]; message: string }>;
      };
    }

    const response = await shopifyGraphQL<AppSubscriptionCreateResponse>(
      APP_SUBSCRIPTION_CREATE_MUTATION,
      variables,
      shopDomain
    );

    const { appSubscriptionCreate } = response.data;

    // Check for user errors
    if (appSubscriptionCreate.userErrors && appSubscriptionCreate.userErrors.length > 0) {
      logger.error("[GraphQL Billing] Subscription creation failed with user errors", undefined, {
        component: "graphql-billing",
        shopDomain,
        userErrors: appSubscriptionCreate.userErrors,
      });
      return {
        success: false,
        error: appSubscriptionCreate.userErrors[0].message,
        userErrors: appSubscriptionCreate.userErrors,
      };
    }

    // Check for confirmation URL
    if (!appSubscriptionCreate.confirmationUrl) {
      logger.error("[GraphQL Billing] No confirmation URL returned", undefined, {
        component: "graphql-billing",
        shopDomain,
      });
      return {
        success: false,
        error: "No confirmation URL returned from Shopify",
      };
    }

    logger.info("[GraphQL Billing] Subscription created successfully", {
      component: "graphql-billing",
      shopDomain,
      subscriptionId: appSubscriptionCreate.appSubscription?.id,
      confirmationUrl: appSubscriptionCreate.confirmationUrl,
    });

    return {
      success: true,
      confirmationUrl: appSubscriptionCreate.confirmationUrl,
      subscriptionId: appSubscriptionCreate.appSubscription?.id,
    };
  } catch (error) {
    logger.error("[GraphQL Billing] Error creating subscription", error as Error, {
      component: "graphql-billing",
      shopDomain,
      planId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error creating subscription",
    };
  }
}

/**
 * Cancel an existing app subscription
 */
const APP_SUBSCRIPTION_CANCEL_MUTATION = `
  mutation appSubscriptionCancel($id: ID!) {
    appSubscriptionCancel(id: $id) {
      appSubscription {
        id
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * Cancel an app subscription
 *
 * @param shopDomain - The shop's myshopify.com domain
 * @param subscriptionId - The GraphQL ID of the subscription to cancel
 * @returns Result indicating success or failure
 */
export async function cancelAppSubscription(
  shopDomain: string,
  subscriptionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    interface AppSubscriptionCancelResponse {
      appSubscriptionCancel: {
        appSubscription: {
          id: string;
          status: string;
        } | null;
        userErrors: Array<{ field: string[]; message: string }>;
      };
    }

    const response = await shopifyGraphQL<AppSubscriptionCancelResponse>(
      APP_SUBSCRIPTION_CANCEL_MUTATION,
      { id: subscriptionId },
      shopDomain
    );

    const { appSubscriptionCancel } = response.data;

    if (appSubscriptionCancel.userErrors && appSubscriptionCancel.userErrors.length > 0) {
      return {
        success: false,
        error: appSubscriptionCancel.userErrors[0].message,
      };
    }

    logger.info("[GraphQL Billing] Subscription cancelled", {
      component: "graphql-billing",
      shopDomain,
      subscriptionId,
    });

    return { success: true };
  } catch (error) {
    logger.error("[GraphQL Billing] Error cancelling subscription", error as Error, {
      component: "graphql-billing",
      shopDomain,
      subscriptionId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error cancelling subscription",
    };
  }
}

/**
 * Get active subscription for a shop
 */
const CURRENT_APP_INSTALLATION_QUERY = `
  query currentAppInstallation {
    currentAppInstallation {
      activeSubscriptions {
        id
        name
        status
        createdAt
        currentPeriodEnd
        trialDays
        test
        lineItems {
          plan {
            pricingDetails {
              ... on AppRecurringPricing {
                price {
                  amount
                  currencyCode
                }
                interval
              }
            }
          }
        }
      }
    }
  }
`;

export interface ActiveSubscription {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  currentPeriodEnd: string | null;
  trialDays: number;
  test: boolean;
  price?: {
    amount: string;
    currencyCode: string;
  };
  interval?: string;
}

/**
 * Get the active subscription for a shop
 *
 * @param shopDomain - The shop's myshopify.com domain
 * @returns The active subscription details, or null if none
 */
export async function getActiveSubscription(
  shopDomain: string
): Promise<ActiveSubscription | null> {
  try {
    interface CurrentAppInstallationResponse {
      currentAppInstallation: {
        activeSubscriptions: Array<{
          id: string;
          name: string;
          status: string;
          createdAt: string;
          currentPeriodEnd: string | null;
          trialDays: number;
          test: boolean;
          lineItems: Array<{
            plan: {
              pricingDetails: {
                price?: {
                  amount: string;
                  currencyCode: string;
                };
                interval?: string;
              };
            };
          }>;
        }>;
      };
    }

    const response = await shopifyGraphQL<CurrentAppInstallationResponse>(
      CURRENT_APP_INSTALLATION_QUERY,
      {},
      shopDomain
    );

    const subscriptions = response.data.currentAppInstallation.activeSubscriptions;

    if (!subscriptions || subscriptions.length === 0) {
      return null;
    }

    // Return the first active subscription
    const sub = subscriptions[0];
    const pricing = sub.lineItems?.[0]?.plan?.pricingDetails;

    return {
      id: sub.id,
      name: sub.name,
      status: sub.status,
      createdAt: sub.createdAt,
      currentPeriodEnd: sub.currentPeriodEnd,
      trialDays: sub.trialDays,
      test: sub.test,
      price: pricing?.price,
      interval: pricing?.interval,
    };
  } catch (error) {
    logger.error("[GraphQL Billing] Error getting active subscription", error as Error, {
      component: "graphql-billing",
      shopDomain,
    });
    return null;
  }
}
