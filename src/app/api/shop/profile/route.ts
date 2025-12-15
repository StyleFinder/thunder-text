import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { logger } from "@/lib/logger";

// Lazy import supabaseAdmin to avoid module load failures
async function getSupabaseAdmin() {
  const { supabaseAdmin } = await import("@/lib/supabase/admin");
  return supabaseAdmin;
}

/**
 * GET /api/shop/profile
 *
 * Fetches the shop profile data for the authenticated user's shop
 *
 * SECURITY: Requires session authentication.
 * Users can only access their own shop profile.
 */
export async function GET(req: NextRequest) {
  try {
    // SECURITY: Require session authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const shop = searchParams.get("shop");
    const userId = searchParams.get("userId");

    if (!shop && !userId) {
      return NextResponse.json(
        { error: "Missing shop or userId parameter" },
        { status: 400 },
      );
    }

    // SECURITY: Validate shop ownership - users can only access their own shop
    const sessionShopDomain = (session.user as { shopDomain?: string })
      .shopDomain;

    if (shop) {
      const normalizedRequestShop = shop.includes(".myshopify.com")
        ? shop
        : `${shop}.myshopify.com`;
      const normalizedSessionShop = sessionShopDomain?.includes(
        ".myshopify.com",
      )
        ? sessionShopDomain
        : `${sessionShopDomain}.myshopify.com`;

      if (normalizedRequestShop !== normalizedSessionShop) {
        logger.warn("[Shop Profile] Shop ownership mismatch in GET", {
          component: "shop-profile",
          requestedShop: normalizedRequestShop,
          sessionShop: normalizedSessionShop,
        });
        return NextResponse.json(
          { error: "Access denied: Shop mismatch" },
          { status: 403 },
        );
      }
    }

    const supabaseAdmin = await getSupabaseAdmin();

    // Build query based on available parameter
    let query = supabaseAdmin.from("shops").select(`
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
      // SECURITY: When using userId, verify it matches the session user's shop
      // First fetch to verify ownership, then return data
      query = query.eq("id", userId);
    }

    const { data: shopData, error } = await query.single();

    if (error) {
      logger.error("[Shop Profile] Failed to fetch shop", error, {
        component: "shop-profile",
        shop,
        userId,
      });
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // SECURITY: Double-check ownership when using userId lookup
    if (userId && shopData) {
      const normalizedShopDomain = shopData.shop_domain;
      const normalizedSessionShop = sessionShopDomain?.includes(
        ".myshopify.com",
      )
        ? sessionShopDomain
        : `${sessionShopDomain}.myshopify.com`;

      if (normalizedShopDomain !== normalizedSessionShop) {
        logger.warn("[Shop Profile] userId lookup shop ownership mismatch", {
          component: "shop-profile",
          fetchedShop: normalizedShopDomain,
          sessionShop: normalizedSessionShop,
        });
        return NextResponse.json(
          { error: "Access denied: Shop mismatch" },
          { status: 403 },
        );
      }
    }

    return NextResponse.json({ shop: shopData });
  } catch (error) {
    logger.error("[Shop Profile] Unexpected error", error as Error, {
      component: "shop-profile",
    });
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/shop/profile
 *
 * Updates the shop profile data for the authenticated user's shop
 *
 * SECURITY: Requires session authentication.
 * Users can only update their own shop profile.
 */
export async function PUT(req: NextRequest) {
  try {
    // SECURITY: Require session authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { shop, userId, ...profileData } = body;

    if (!shop && !userId) {
      return NextResponse.json(
        { error: "Missing shop or userId parameter" },
        { status: 400 },
      );
    }

    // SECURITY: Validate shop ownership - users can only update their own shop
    const sessionShopDomain = (session.user as { shopDomain?: string })
      .shopDomain;

    if (shop) {
      const normalizedRequestShop = shop.includes(".myshopify.com")
        ? shop
        : `${shop}.myshopify.com`;
      const normalizedSessionShop = sessionShopDomain?.includes(
        ".myshopify.com",
      )
        ? sessionShopDomain
        : `${sessionShopDomain}.myshopify.com`;

      if (normalizedRequestShop !== normalizedSessionShop) {
        logger.warn("[Shop Profile] Shop ownership mismatch in PUT", {
          component: "shop-profile",
          requestedShop: normalizedRequestShop,
          sessionShop: normalizedSessionShop,
        });
        return NextResponse.json(
          { error: "Access denied: Shop mismatch" },
          { status: 403 },
        );
      }
    }

    const supabaseAdmin = await getSupabaseAdmin();

    // SECURITY: When using userId, first verify ownership before updating
    if (userId && !shop) {
      const { data: existingShop } = await supabaseAdmin
        .from("shops")
        .select("shop_domain")
        .eq("id", userId)
        .single();

      if (existingShop) {
        const normalizedSessionShop = sessionShopDomain?.includes(
          ".myshopify.com",
        )
          ? sessionShopDomain
          : `${sessionShopDomain}.myshopify.com`;

        if (existingShop.shop_domain !== normalizedSessionShop) {
          logger.warn("[Shop Profile] userId update shop ownership mismatch", {
            component: "shop-profile",
            targetShop: existingShop.shop_domain,
            sessionShop: normalizedSessionShop,
          });
          return NextResponse.json(
            { error: "Access denied: Shop mismatch" },
            { status: 403 },
          );
        }
      }
    }

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
    let query = supabaseAdmin.from("shops").update(updateData);

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
        { status: 500 },
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
      { status: 500 },
    );
  }
}
