import { NextRequest, NextResponse } from "next/server";
import { stripe, PLANS, PlanType } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { plan, shopId, shopDomain } = body;

    if (!plan || !shopId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: plan and shopId" },
        { status: 400 },
      );
    }

    if (!["free", "starter", "pro"].includes(plan)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid plan. Must be free, starter, or pro.",
        },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    // Handle cancellation (downgrade to free)
    if (plan === "free") {
      // Fetch shop to get subscription info
      const { data: shop, error: shopError } = await supabase
        .from("shops")
        .select("stripe_subscription_id, shop_domain, plan")
        .eq("id", shopId)
        .single();

      if (shopError || !shop) {
        logger.error("Shop not found for cancellation", shopError as Error, {
          component: "billing-checkout",
          shopId,
        });
        return NextResponse.json(
          { success: false, error: "Shop not found" },
          { status: 404 },
        );
      }

      if (!shop.stripe_subscription_id) {
        return NextResponse.json(
          { success: false, error: "No active subscription to cancel" },
          { status: 400 },
        );
      }

      try {
        // Cancel subscription at period end (not immediately)
        const cancelledSubscription = await stripe.subscriptions.update(
          shop.stripe_subscription_id,
          {
            cancel_at_period_end: true,
          },
        );

        // Update database status to "canceling" immediately so UI reflects the change
        await supabase
          .from("shops")
          .update({
            subscription_status: "canceling",
            updated_at: new Date().toISOString(),
          })
          .eq("id", shopId);

        // Log billing event
        await supabase.from("billing_events").insert({
          shop_id: shopId,
          event_type: "subscription_cancellation_scheduled",
          stripe_subscription_id: cancelledSubscription.id,
          event_data: {
            previous_plan: shop.plan,
            cancel_at: cancelledSubscription.cancel_at,
            current_period_end: (cancelledSubscription as any)
              .current_period_end,
          },
        });

        logger.info("Scheduled subscription cancellation", {
          component: "billing-checkout",
          shopId,
          subscriptionId: cancelledSubscription.id,
          cancelAt: cancelledSubscription.cancel_at,
        });

        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL ||
          process.env.SHOPIFY_APP_URL ||
          "http://localhost:3050";
        const shopParam = shop.shop_domain
          ? `?shop=${encodeURIComponent(shop.shop_domain)}`
          : "";

        return NextResponse.json({
          success: true,
          updated: true,
          message:
            "Your subscription will be cancelled at the end of your billing period",
          redirectUrl: `${appUrl}/settings${shopParam}&subscription_cancelled=true`,
        });
      } catch (cancelError) {
        logger.error("Failed to cancel subscription", cancelError as Error, {
          component: "billing-checkout",
          shopId,
        });
        return NextResponse.json(
          { success: false, error: "Failed to cancel subscription" },
          { status: 500 },
        );
      }
    }

    // Continue with paid plan checkout/update
    const selectedPlan = PLANS[plan as PlanType];
    if (!selectedPlan.priceId) {
      return NextResponse.json(
        {
          success: false,
          error: "Stripe price ID not configured for this plan",
        },
        { status: 500 },
      );
    }

    // Fetch shop to check for existing Stripe customer and subscription
    const { data: shop, error: shopError } = await supabase
      .from("shops")
      .select("stripe_customer_id, stripe_subscription_id, shop_domain, plan")
      .eq("id", shopId)
      .single();

    if (shopError || !shop) {
      logger.error("Shop not found for checkout", shopError as Error, {
        component: "billing-checkout",
        shopId,
      });
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 404 },
      );
    }

    let customerId = shop.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: {
          shopId,
          shopDomain: shop.shop_domain || shopDomain || "",
        },
      });

      customerId = customer.id;

      // Save customer ID to database
      await supabase
        .from("shops")
        .update({
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", shopId);

      logger.info("Created Stripe customer", {
        component: "billing-checkout",
        shopId,
        customerId,
      });
    }

    // Check if user already has an active subscription
    if (shop.stripe_subscription_id) {
      try {
        const existingSubscription = await stripe.subscriptions.retrieve(
          shop.stripe_subscription_id,
        );

        // If subscription is active, update it instead of creating a new one
        if (
          existingSubscription.status === "active" ||
          existingSubscription.status === "trialing"
        ) {
          // Get the current subscription item ID
          const subscriptionItemId = existingSubscription.items.data[0]?.id;

          if (subscriptionItemId) {
            // Update the subscription to the new plan (prorate by default)
            const updatedSubscription = await stripe.subscriptions.update(
              shop.stripe_subscription_id,
              {
                items: [
                  {
                    id: subscriptionItemId,
                    price: selectedPlan.priceId,
                  },
                ],
                metadata: {
                  shopId,
                  shopDomain: shop.shop_domain || "",
                  plan,
                },
                proration_behavior: "create_prorations",
              },
            );

            // Update the database with the new plan
            await supabase
              .from("shops")
              .update({
                plan: plan,
                updated_at: new Date().toISOString(),
              })
              .eq("id", shopId);

            // Log billing event
            await supabase.from("billing_events").insert({
              shop_id: shopId,
              event_type: "subscription_updated",
              stripe_subscription_id: updatedSubscription.id,
              stripe_customer_id: customerId,
              event_data: {
                previous_plan: shop.plan,
                new_plan: plan,
                proration: true,
              },
            });

            logger.info("Updated existing subscription", {
              component: "billing-checkout",
              shopId,
              subscriptionId: updatedSubscription.id,
              previousPlan: shop.plan,
              newPlan: plan,
            });

            // Return success - no checkout needed, subscription was updated directly
            const appUrl =
              process.env.NEXT_PUBLIC_APP_URL ||
              process.env.SHOPIFY_APP_URL ||
              "http://localhost:3050";
            const shopParam = shop.shop_domain
              ? `?shop=${encodeURIComponent(shop.shop_domain)}`
              : "";

            return NextResponse.json({
              success: true,
              updated: true,
              message: `Successfully ${plan === "pro" ? "upgraded" : "changed"} to ${selectedPlan.name} plan`,
              redirectUrl: `${appUrl}/settings${shopParam}&plan_updated=true`,
            });
          }
        }
      } catch (subError) {
        // Subscription doesn't exist or is invalid, continue to create new checkout
        logger.warn(
          "Could not retrieve existing subscription, creating new checkout",
          {
            component: "billing-checkout",
            shopId,
            error:
              subError instanceof Error ? subError.message : "Unknown error",
          },
        );
      }
    }

    // No existing subscription or it's not active - create checkout session
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.SHOPIFY_APP_URL ||
      "http://localhost:3050";
    const shopParam = shop.shop_domain
      ? `?shop=${encodeURIComponent(shop.shop_domain)}`
      : "";

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: selectedPlan.priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/settings${shopParam}&checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/settings${shopParam}&checkout=canceled`,
      client_reference_id: shopId,
      subscription_data: {
        metadata: {
          shopId,
          shopDomain: shop.shop_domain || "",
          plan,
        },
      },
      metadata: {
        shopId,
        plan,
      },
    });

    logger.info("Created checkout session", {
      component: "billing-checkout",
      shopId,
      sessionId: session.id,
      plan,
    });

    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    logger.error("Failed to create checkout session", error as Error, {
      component: "billing-checkout",
    });

    return NextResponse.json(
      { success: false, error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
