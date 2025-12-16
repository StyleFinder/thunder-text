import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/**
 * GET /api/ads-library
 *
 * List all ads in the user's library
 *
 * SECURITY: Uses session-based authentication instead of cookie-only
 */
export async function GET(_req: NextRequest) {
  try {
    // SECURITY: Require session authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Get shop domain from session (not from cookie!)
    const shopDomain = (session.user as { shopDomain?: string }).shopDomain;
    if (!shopDomain) {
      return NextResponse.json(
        { error: "No shop associated with account" },
        { status: 403 },
      );
    }

    // Get shop_id from shops table using session's shop domain
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("id")
      .eq("shop_domain", shopDomain)
      .single();

    if (shopError || !shopData) {
      logger.error("Error fetching shop:", shopError as Error, {
        component: "ads-library",
      });
      return NextResponse.json(
        { error: "Shop not found in database", details: shopError?.message },
        { status: 404 },
      );
    }

    // Fetch ads from ads_library for this shop
    const { data: ads, error: adsError } = await supabaseAdmin
      .from("ads_library")
      .select("*")
      .eq("shop_id", shopData.id)
      .order("created_at", { ascending: false });

    if (adsError) {
      logger.error("Error fetching ads:", adsError as Error, {
        component: "ads-library",
      });
      return NextResponse.json(
        { error: "Failed to fetch ads", details: adsError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ads: ads || [] });
  } catch (error: any) {
    logger.error("Error in ads library endpoint:", error as Error, {
      component: "ads-library",
    });
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
