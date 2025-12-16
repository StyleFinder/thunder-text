import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/**
 * POST /api/ads-library/save
 *
 * Save an ad to the user's library
 *
 * SECURITY: Uses session-based authentication instead of trusting shopId from body
 */
export async function POST(req: NextRequest) {
  try {
    // SECURITY: Require session authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Get shop domain from session (not from request body!)
    const shopDomain = (session.user as { shopDomain?: string }).shopDomain;
    if (!shopDomain) {
      return NextResponse.json(
        { error: "No shop associated with account" },
        { status: 403 },
      );
    }

    // Get shop_id from database using session's shop domain
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("id")
      .eq("shop_domain", shopDomain)
      .single();

    if (shopError || !shopData) {
      logger.error("Error fetching shop:", shopError as Error, {
        component: "ads-library-save",
      });
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const body = await req.json();
    const {
      headline,
      primary_text,
      description,
      platform,
      goal,
      variant_type,
      product_id,
      product_title,
      product_image,
      product_data,
      predicted_score,
      selected_length,
    } = body;

    // Note: shopId from body is ignored - we use session-derived shopId

    if (!headline || !primary_text) {
      return NextResponse.json(
        { error: "Headline and primary text are required" },
        { status: 400 },
      );
    }

    if (!platform || !goal) {
      return NextResponse.json(
        { error: "Platform and goal are required" },
        { status: 400 },
      );
    }

    // Insert ad into ads_library using authenticated shop ID
    const { data, error } = await supabaseAdmin
      .from("ads_library")
      .insert({
        shop_id: shopData.id, // SECURITY: Use session-derived shopId, not from body
        headline,
        primary_text,
        description,
        platform,
        goal,
        variant_type,
        product_id,
        product_title,
        product_image,
        product_data,
        predicted_score,
        selected_length,
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      logger.error("[Save Ad] Error saving ad to library:", error as Error, {
        component: "ads-library-save",
      });
      return NextResponse.json(
        { error: "Failed to save ad to library", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      ad: data,
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error("Error in save ad endpoint:", err, {
      component: "ads-library-save",
    });
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
