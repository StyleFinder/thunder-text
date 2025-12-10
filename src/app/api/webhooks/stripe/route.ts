import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe, getPlanFromPriceId } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resetUsage } from "@/lib/billing/usage";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Disable body parsing - we need the raw body for signature verification
export const runtime = "nodejs";

async function getRawBody(request: NextRequest): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = request.body?.getReader();

  if (!reader) {
    throw new Error("No request body");
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  return Buffer.concat(chunks);
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();

  try {
    const rawBody = await getRawBody(request);
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      logger.error("Missing Stripe signature", new Error("No signature"), {
        component: "stripe-webhook",
      });
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      logger.error("Missing webhook secret", new Error("No webhook secret"), {
        component: "stripe-webhook",
      });
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 },
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      logger.error("Webhook signature verification failed", err as Error, {
        component: "stripe-webhook",
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    logger.info("Processing Stripe webhook", {
      component: "stripe-webhook",
      eventType: event.type,
      eventId: event.id,
    });

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabase, session, event.id);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(supabase, subscription, event.id);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, subscription, event.id);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(supabase, invoice, event.id);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(supabase, invoice, event.id);
        break;
      }

      default:
        logger.info("Unhandled webhook event", {
          component: "stripe-webhook",
          eventType: event.type,
        });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("Webhook processing error", error as Error, {
      component: "stripe-webhook",
    });
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}

async function handleCheckoutCompleted(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  session: Stripe.Checkout.Session,
  eventId: string,
) {
  const shopId = session.client_reference_id;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!shopId) {
    logger.error(
      "No shop ID in checkout session",
      new Error("Missing client_reference_id"),
      {
        component: "stripe-webhook",
        sessionId: session.id,
      },
    );
    return;
  }

  // Fetch subscription to get price ID
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price.id;
  const plan = getPlanFromPriceId(priceId);

  // Update shop with subscription info
  const { error } = await supabase
    .from("shops")
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      plan,
      subscription_status: subscription.status,
      subscription_current_period_end: new Date(
        (subscription as any).current_period_end * 1000,
      ).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", shopId);

  if (error) {
    logger.error("Failed to update shop after checkout", error, {
      component: "stripe-webhook",
      shopId,
    });
    return;
  }

  // Log billing event
  await supabase.from("billing_events").insert({
    shop_id: shopId,
    event_type: "checkout.session.completed",
    stripe_event_id: eventId,
    stripe_subscription_id: subscriptionId,
    stripe_customer_id: customerId,
    event_data: {
      plan,
      priceId,
      sessionId: session.id,
    },
  });

  logger.info("Checkout completed successfully", {
    component: "stripe-webhook",
    shopId,
    plan,
    subscriptionId,
  });
}

async function handleSubscriptionUpdate(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  subscription: Stripe.Subscription,
  eventId: string,
) {
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id;
  const plan = getPlanFromPriceId(priceId);

  // Find shop by Stripe customer ID
  const { data: shop, error: findError } = await supabase
    .from("shops")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (findError || !shop) {
    logger.error("Shop not found for subscription update", findError as Error, {
      component: "stripe-webhook",
      customerId,
      subscriptionId: subscription.id,
    });
    return;
  }

  // Determine status - if subscription is set to cancel at period end, mark as "canceling"
  const effectiveStatus = subscription.cancel_at_period_end
    ? "canceling"
    : subscription.status;

  // Update subscription status
  const { error } = await supabase
    .from("shops")
    .update({
      stripe_subscription_id: subscription.id,
      plan,
      subscription_status: effectiveStatus,
      subscription_current_period_end: new Date(
        (subscription as any).current_period_end * 1000,
      ).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", shop.id);

  if (error) {
    logger.error("Failed to update subscription", error, {
      component: "stripe-webhook",
      shopId: shop.id,
    });
    return;
  }

  // Log billing event
  await supabase.from("billing_events").insert({
    shop_id: shop.id,
    event_type: "subscription.updated",
    stripe_event_id: eventId,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerId,
    event_data: {
      plan,
      status: subscription.status,
      effectiveStatus,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      priceId,
    },
  });

  logger.info("Subscription updated", {
    component: "stripe-webhook",
    shopId: shop.id,
    plan,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });
}

async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  subscription: Stripe.Subscription,
  eventId: string,
) {
  const customerId = subscription.customer as string;

  // Find shop by Stripe customer ID
  const { data: shop, error: findError } = await supabase
    .from("shops")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (findError || !shop) {
    logger.error(
      "Shop not found for subscription deletion",
      findError as Error,
      {
        component: "stripe-webhook",
        customerId,
      },
    );
    return;
  }

  // Revert to free plan
  const { error } = await supabase
    .from("shops")
    .update({
      stripe_subscription_id: null,
      plan: "free",
      subscription_status: "canceled",
      subscription_current_period_end: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", shop.id);

  if (error) {
    logger.error("Failed to handle subscription deletion", error, {
      component: "stripe-webhook",
      shopId: shop.id,
    });
    return;
  }

  // Log billing event
  await supabase.from("billing_events").insert({
    shop_id: shop.id,
    event_type: "subscription.deleted",
    stripe_event_id: eventId,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerId,
    event_data: {
      canceledAt: subscription.canceled_at,
    },
  });

  logger.info("Subscription canceled, reverted to free plan", {
    component: "stripe-webhook",
    shopId: shop.id,
  });
}

async function handleInvoicePaid(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  invoice: Stripe.Invoice,
  eventId: string,
) {
  const customerId = invoice.customer as string;
  const subscriptionId = (invoice as any).subscription as string;

  if (!subscriptionId) {
    // One-time payment, not a subscription
    return;
  }

  // Find shop by Stripe customer ID
  const { data: shop, error: findError } = await supabase
    .from("shops")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (findError || !shop) {
    logger.error("Shop not found for invoice paid", findError as Error, {
      component: "stripe-webhook",
      customerId,
    });
    return;
  }

  // Check if this is a renewal (billing_reason: subscription_cycle)
  if (invoice.billing_reason === "subscription_cycle") {
    // Reset usage counters for new billing period
    await resetUsage(shop.id);

    logger.info("Usage reset for new billing period", {
      component: "stripe-webhook",
      shopId: shop.id,
    });
  }

  // Ensure subscription status is active
  await supabase
    .from("shops")
    .update({
      subscription_status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", shop.id);

  // Log billing event
  await supabase.from("billing_events").insert({
    shop_id: shop.id,
    event_type: "invoice.paid",
    stripe_event_id: eventId,
    stripe_subscription_id: subscriptionId,
    stripe_customer_id: customerId,
    event_data: {
      amount: invoice.amount_paid,
      billingReason: invoice.billing_reason,
    },
  });

  logger.info("Invoice paid", {
    component: "stripe-webhook",
    shopId: shop.id,
    amount: invoice.amount_paid,
  });
}

async function handlePaymentFailed(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  invoice: Stripe.Invoice,
  eventId: string,
) {
  const customerId = invoice.customer as string;
  const subscriptionId = (invoice as any).subscription as string;

  if (!subscriptionId) {
    return;
  }

  // Find shop by Stripe customer ID
  const { data: shop, error: findError } = await supabase
    .from("shops")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (findError || !shop) {
    logger.error("Shop not found for payment failure", findError as Error, {
      component: "stripe-webhook",
      customerId,
    });
    return;
  }

  // Update status to past_due
  await supabase
    .from("shops")
    .update({
      subscription_status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("id", shop.id);

  // Log billing event
  await supabase.from("billing_events").insert({
    shop_id: shop.id,
    event_type: "invoice.payment_failed",
    stripe_event_id: eventId,
    stripe_subscription_id: subscriptionId,
    stripe_customer_id: customerId,
    event_data: {
      amount: invoice.amount_due,
      attemptCount: invoice.attempt_count,
    },
  });

  logger.info("Payment failed", {
    component: "stripe-webhook",
    shopId: shop.id,
    attemptCount: invoice.attempt_count,
  });

  // TODO: Could send email notification to shop owner
}
