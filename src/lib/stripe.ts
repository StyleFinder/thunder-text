import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-11-17.clover",
  typescript: true,
});

// Plan configuration
export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    priceId: null,
    limits: {
      productDescriptions: 30,
      ads: 30,
    },
  },
  starter: {
    name: "Starter",
    price: 19,
    priceId: process.env.STRIPE_PRICE_STARTER,
    limits: {
      productDescriptions: 2000,
      ads: 300,
    },
  },
  pro: {
    name: "Pro",
    price: 34,
    priceId: process.env.STRIPE_PRICE_PRO,
    limits: {
      productDescriptions: 5000,
      ads: -1, // Unlimited
    },
  },
} as const;

export type PlanType = keyof typeof PLANS;

export function getPlanFromPriceId(priceId: string | null): PlanType {
  if (!priceId) return "free";

  if (priceId === process.env.STRIPE_PRICE_STARTER) return "starter";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";

  return "free";
}

export function getPlanLimits(plan: PlanType) {
  // eslint-disable-next-line security/detect-object-injection
  return PLANS[plan]?.limits || PLANS.free.limits;
}
