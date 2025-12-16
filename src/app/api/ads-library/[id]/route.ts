import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/**
 * Helper to get authenticated shop ID from session
 * SECURITY: Uses session validation instead of cookie-only auth
 */
async function getAuthenticatedShopId(
  _req: NextRequest,
): Promise<{ shopId: string | null; error?: string; status?: number }> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return { shopId: null, error: "Authentication required", status: 401 };
  }

  // Get shop domain from session
  const shopDomain = (session.user as { shopDomain?: string }).shopDomain;
  if (!shopDomain) {
    return {
      shopId: null,
      error: "No shop associated with account",
      status: 403,
    };
  }

  // Get shop_id from shops table
  const { data: shopData, error: shopError } = await supabaseAdmin
    .from("shops")
    .select("id")
    .eq("shop_domain", shopDomain)
    .single();

  if (shopError || !shopData) {
    logger.error("Error fetching shop:", shopError as Error, {
      component: "ads-library-single",
    });
    return { shopId: null, error: "Shop not found", status: 404 };
  }

  return { shopId: shopData.id };
}

// GET single ad by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // SECURITY: Use session-based authentication
    const auth = await getAuthenticatedShopId(req);
    if (!auth.shopId) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 },
      );
    }

    // Fetch the ad
    const { data: ad, error: adError } = await supabaseAdmin
      .from("ads_library")
      .select("*")
      .eq("id", id)
      .eq("shop_id", auth.shopId)
      .single();

    if (adError || !ad) {
      logger.error("Error fetching ad:", adError as Error, {
        component: "ads-library-single",
      });
      return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    }

    return NextResponse.json({ ad });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error("Error fetching ad:", err, {
      component: "ads-library-single",
    });
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}

// PATCH update ad
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // SECURITY: Use session-based authentication
    const auth = await getAuthenticatedShopId(req);
    if (!auth.shopId) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 },
      );
    }

    const body = await req.json();
    const { headline, primaryText, description, cta } = body;

    // Update the ad
    const { data: ad, error: updateError } = await supabaseAdmin
      .from("ads_library")
      .update({
        headline,
        primary_text: primaryText,
        description,
        cta,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("shop_id", auth.shopId)
      .select()
      .single();

    if (updateError) {
      logger.error("Error updating ad:", updateError as Error, {
        component: "ads-library-single",
      });
      return NextResponse.json(
        { error: "Failed to update ad", details: updateError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, ad });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error("Error updating ad:", err, {
      component: "ads-library-single",
    });
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}

// DELETE ad
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // SECURITY: Use session-based authentication
    const auth = await getAuthenticatedShopId(req);
    if (!auth.shopId) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 },
      );
    }

    // Delete the ad
    const { error: deleteError } = await supabaseAdmin
      .from("ads_library")
      .delete()
      .eq("id", id)
      .eq("shop_id", auth.shopId);

    if (deleteError) {
      logger.error("Error deleting ad:", deleteError as Error, {
        component: "ads-library-single",
      });
      return NextResponse.json(
        { error: "Failed to delete ad", details: deleteError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error("Error deleting ad:", err, {
      component: "ads-library-single",
    });
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
