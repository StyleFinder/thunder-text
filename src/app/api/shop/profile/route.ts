import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

// Lazy import supabaseAdmin to avoid module load failures
async function getSupabaseAdmin() {
  const { supabaseAdmin } = await import("@/lib/supabase/admin");
  return supabaseAdmin;
}

/**
 * GET /api/shop/profile
 *
 * Fetches the shop profile data for a given shop domain or user ID
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shop = searchParams.get("shop");
    const userId = searchParams.get("userId");

    if (!shop && !userId) {
      return NextResponse.json(
        { error: "Missing shop or userId parameter" },
        { status: 400 }
      );
    }

    const supabaseAdmin = await getSupabaseAdmin();

    // Build query based on available parameter
    let query = supabaseAdmin
      .from("shops")
      .select(`
        id,
        shop_domain,
        email,
        store_name,
        display_name,
        owner_name,
        owner_phone,
        city,
        state,
        store_type,
        years_in_business,
        industry_niche,
        advertising_goals
      `);

    if (shop) {
      query = query.eq("shop_domain", shop);
    } else if (userId) {
      query = query.eq("id", userId);
    }

    const { data: shopData, error } = await query.single();

    if (error) {
      logger.error("[Shop Profile] Failed to fetch shop", error, {
        component: "shop-profile",
        shop,
        userId,
      });
      return NextResponse.json(
        { error: "Shop not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ shop: shopData });
  } catch (error) {
    logger.error("[Shop Profile] Unexpected error", error as Error, {
      component: "shop-profile",
    });
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/shop/profile
 *
 * Updates the shop profile data by shop domain or user ID
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { shop, userId, ...profileData } = body;

    if (!shop && !userId) {
      return NextResponse.json(
        { error: "Missing shop or userId parameter" },
        { status: 400 }
      );
    }

    const supabaseAdmin = await getSupabaseAdmin();

    // Build the update object with only provided fields
    const updateData: Record<string, unknown> = {};

    if (profileData.store_name !== undefined) {
      updateData.store_name = profileData.store_name;
      updateData.display_name = profileData.store_name; // Keep display_name in sync
    }
    if (profileData.owner_name !== undefined) {
      updateData.owner_name = profileData.owner_name;
    }
    if (profileData.owner_phone !== undefined) {
      updateData.owner_phone = profileData.owner_phone;
    }
    if (profileData.city !== undefined) {
      updateData.city = profileData.city;
    }
    if (profileData.state !== undefined) {
      updateData.state = profileData.state;
    }
    if (profileData.store_type !== undefined) {
      updateData.store_type = profileData.store_type;
    }
    if (profileData.years_in_business !== undefined) {
      updateData.years_in_business = profileData.years_in_business;
    }
    if (profileData.industry_niche !== undefined) {
      updateData.industry_niche = profileData.industry_niche;
    }
    if (profileData.advertising_goals !== undefined) {
      updateData.advertising_goals = profileData.advertising_goals;
    }

    // Build update query based on available identifier
    let query = supabaseAdmin
      .from("shops")
      .update(updateData);

    if (shop) {
      query = query.eq("shop_domain", shop);
    } else if (userId) {
      query = query.eq("id", userId);
    }

    const { data: updatedShop, error } = await query
      .select("id, shop_domain, store_name, display_name")
      .single();

    if (error) {
      logger.error("[Shop Profile] Failed to update shop", error, {
        component: "shop-profile",
        shop,
        userId,
      });
      return NextResponse.json(
        { error: "Failed to update shop profile" },
        { status: 500 }
      );
    }

    logger.info("[Shop Profile] Shop profile updated", {
      component: "shop-profile",
      shopId: updatedShop.id,
      shop: shop || updatedShop.shop_domain,
    });

    return NextResponse.json({
      success: true,
      shop: updatedShop,
    });
  } catch (error) {
    logger.error("[Shop Profile] Unexpected error", error as Error, {
      component: "shop-profile",
    });
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
