import Stripe from "stripe";

// Lazy initialization to avoid build-time errors when env vars aren't available
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-11-17.clover",
      typescript: true,
    });
  }
  return _stripe;
}

// For backwards compatibility - accessing this will trigger lazy init
export const stripe = {
  get customers() {
    return getStripe().customers;
  },
  get subscriptions() {
    return getStripe().subscriptions;
  },
  get checkout() {
    return getStripe().checkout;
  },
  get billingPortal() {
    return getStripe().billingPortal;
  },
  get webhooks() {
    return getStripe().webhooks;
  },
  get prices() {
    return getStripe().prices;
  },
  get products() {
    return getStripe().products;
  },
  get invoices() {
    return getStripe().invoices;
  },
  get paymentIntents() {
    return getStripe().paymentIntents;
  },
  get paymentMethods() {
    return getStripe().paymentMethods;
  },
};

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
