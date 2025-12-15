/**
 * Plan Configuration
 *
 * Defines the available subscription plans and their limits.
 * This is used for usage tracking and feature gating.
 */

export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    limits: {
      productDescriptions: 30,
      ads: 30,
    },
  },
  starter: {
    name: "Starter",
    price: 19,
    limits: {
      productDescriptions: 2000,
      ads: 300,
    },
  },
  pro: {
    name: "Pro",
    price: 34,
    limits: {
      productDescriptions: 5000,
      ads: -1, // unlimited
    },
  },
} as const;

export type PlanType = keyof typeof PLANS;

export interface PlanLimits {
  productDescriptions: number;
  ads: number;
}

/**
 * Get the limits for a given plan
 * Falls back to free plan limits if plan is not found
 */
export function getPlanLimits(plan: PlanType | string): PlanLimits {
  if (plan in PLANS) {
    return PLANS[plan as PlanType].limits;
  }
  return PLANS.free.limits;
}

/**
 * Get full plan details
 */
export function getPlan(plan: PlanType | string) {
  if (plan in PLANS) {
    return PLANS[plan as PlanType];
  }
  return PLANS.free;
}
