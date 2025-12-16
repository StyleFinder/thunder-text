/**
 * API Route: /api/billing/callback
 *
 * Handles the redirect from Shopify after a merchant approves or declines
 * an app subscription. This is the returnUrl specified in createAppSubscription().
 *
 * Query params from Shopify:
 * - charge_id: The GraphQL ID of the subscription (if approved)
 * - shop: The shop domain (we add this ourselves)
 *
 * Flow:
 * 1. Merchant approves subscription in Shopify Admin
 * 2. Shopify redirects to this URL
 * 3. We verify the subscription status
 * 4. Redirect merchant to dashboard with success/error message
 *
 * Note: The actual subscription status update happens via the
 * APP_SUBSCRIPTIONS_UPDATE webhook, not here. This route is mainly
 * for redirecting the user back to our app.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getActiveSubscription } from "@/lib/shopify/graphql-billing";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shopDomain = searchParams.get("shop");
    const chargeId = searchParams.get("charge_id");

    logger.info("[Billing Callback] Processing callback", {
      component: "billing-callback",
      shopDomain,
      hasChargeId: !!chargeId,
    });

    if (!shopDomain) {
      logger.error("[Billing Callback] Missing shop domain", undefined, {
        component: "billing-callback",
      });
      return NextResponse.redirect(
        new URL(`${process.env.NEXT_PUBLIC_APP_URL}/pricing?error=missing_shop`)
      );
    }

    // Normalize shop domain
    const normalizedDomain = shopDomain.includes(".myshopify.com")
      ? shopDomain
      : `${shopDomain}.myshopify.com`;

    // Find the shop in our database
    const { data: shop, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("id, shop_domain, plan")
      .eq("shop_domain", normalizedDomain)
      .single();

    if (shopError || !shop) {
      logger.error("[Billing Callback] Shop not found", shopError as Error, {
        component: "billing-callback",
        shopDomain: normalizedDomain,
      });
      return NextResponse.redirect(
        new URL(`${process.env.NEXT_PUBLIC_APP_URL}/pricing?shop=${normalizedDomain}&error=shop_not_found`)
      );
    }

    // If we have a charge_id, the subscription was likely approved
    // Check the current subscription status from Shopify
    if (chargeId) {
      try {
        const activeSubscription = await getActiveSubscription(normalizedDomain);

        if (activeSubscription && activeSubscription.status === "ACTIVE") {
          // Subscription is active! Update our database
          // Note: The webhook will also update this, but we do it here for immediate feedback
          const planName = activeSubscription.name.toLowerCase();
          let plan = "pro"; // default

          if (planName.includes("starter")) {
            plan = "starter";
          } else if (planName.includes("pro")) {
            plan = "pro";
          }

          await supabaseAdmin
            .from("shops")
            .update({
              plan,
              subscription_status: "active",
              shopify_charge_id: activeSubscription.id,
              shopify_subscription_status: "active",
              shopify_plan_name: activeSubscription.name,
              updated_at: new Date().toISOString(),
            })
            .eq("id", shop.id);

          logger.info("[Billing Callback] Subscription activated", {
            component: "billing-callback",
            shopDomain: normalizedDomain,
            plan,
            subscriptionId: activeSubscription.id,
          });

          // Redirect to dashboard with success
          return NextResponse.redirect(
            new URL(
              `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?shop=${normalizedDomain}&subscription=confirmed&plan=${plan}`
            )
          );
        }
      } catch (error) {
        logger.error("[Billing Callback] Error checking subscription", error as Error, {
          component: "billing-callback",
          shopDomain: normalizedDomain,
        });
        // Continue to check if user declined or if there was an issue
      }
    }

    // No charge_id or subscription not active - user may have declined
    // Check if they have an active subscription anyway (from webhook or previous)
    try {
      const activeSubscription = await getActiveSubscription(normalizedDomain);

      if (activeSubscription && activeSubscription.status === "ACTIVE") {
        // They have an active subscription, redirect to dashboard
        return NextResponse.redirect(
          new URL(
            `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?shop=${normalizedDomain}&subscription=existing`
          )
        );
      }
    } catch {
      // Ignore errors here, we'll redirect to pricing
    }

    // User declined or subscription not found - redirect back to pricing
    logger.info("[Billing Callback] No active subscription, redirecting to pricing", {
      component: "billing-callback",
      shopDomain: normalizedDomain,
    });

    return NextResponse.redirect(
      new URL(
        `${process.env.NEXT_PUBLIC_APP_URL}/pricing?shop=${normalizedDomain}&declined=true`
      )
    );
  } catch (error) {
    logger.error("[Billing Callback] Error processing callback", error as Error, {
      component: "billing-callback",
    });

    return NextResponse.redirect(
      new URL(`${process.env.NEXT_PUBLIC_APP_URL}/pricing?error=callback_error`)
    );
  }
}
