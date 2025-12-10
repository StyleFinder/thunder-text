import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shopId } = body;

    if (!shopId) {
      return NextResponse.json(
        { success: false, error: "Missing required field: shopId" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    // Fetch shop to get Stripe customer ID
    const { data: shop, error: shopError } = await supabase
      .from("shops")
      .select("stripe_customer_id, shop_domain")
      .eq("id", shopId)
      .single();

    if (shopError || !shop) {
      logger.error("Shop not found for portal", shopError as Error, {
        component: "billing-portal",
        shopId,
      });
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 404 },
      );
    }

    if (!shop.stripe_customer_id) {
      return NextResponse.json(
        {
          success: false,
          error: "No billing account found. Please subscribe to a plan first.",
        },
        { status: 400 },
      );
    }

    // Get app URL for return redirect
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.SHOPIFY_APP_URL ||
      "http://localhost:3050";
    const shopParam = shop.shop_domain
      ? `?shop=${encodeURIComponent(shop.shop_domain)}`
      : "";

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: shop.stripe_customer_id,
      return_url: `${appUrl}/settings${shopParam}`,
    });

    logger.info("Created portal session", {
      component: "billing-portal",
      shopId,
      customerId: shop.stripe_customer_id,
    });

    return NextResponse.json({
      success: true,
      url: session.url,
    });
  } catch (error) {
    logger.error("Failed to create portal session", error as Error, {
      component: "billing-portal",
    });

    return NextResponse.json(
      { success: false, error: "Failed to create portal session" },
      { status: 500 },
    );
  }
}
