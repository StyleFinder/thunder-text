/**
 * GET/PATCH /api/bhb/shops/[shop_id]/profile
 *
 * Get or update shop profile information.
 * Requires admin or coach authentication.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

// ShopProfile type used for response typing
type _ShopProfile = {
  id: string;
  shop_domain: string;
  display_name: string | null;
  email: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  industry_niche: string | null;
  years_in_business: number | null;
  city: string | null;
  state: string | null;
  store_type: "online" | "brick-and-mortar" | "both" | null;
  ecommerce_platform: "shopify" | "lightspeed" | "commentsold" | null;
  advertising_goals: string | null;
  coach_assigned: string | null;
};

// GET - Fetch shop profile
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ shop_id: string }> },
) {
  try {
    const { shop_id } = await params;

    // Require authentication
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      logger.warn("Unauthorized access attempt to shop profile", {
        component: "shop-profile",
      });
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    // Only admins and coaches can view profiles
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "admin" && userRole !== "coach") {
      logger.warn("Forbidden access attempt to shop profile", {
        component: "shop-profile",
        userId: session.user.id,
        userRole,
      });
      return NextResponse.json(
        { success: false, error: "Admin or coach access required" },
        { status: 403 },
      );
    }

    // Fetch shop profile
    const { data: shop, error } = await supabaseAdmin
      .from("shops")
      .select(
        `
        id,
        shop_domain,
        display_name,
        email,
        owner_name,
        owner_phone,
        industry_niche,
        years_in_business,
        city,
        state,
        store_type,
        ecommerce_platform,
        advertising_goals,
        coach_assigned
      `,
      )
      .eq("id", shop_id)
      .single();

    if (error) {
      // Check if it's a column doesn't exist error (migration not run yet)
      if (error.code === "42703") {
        // Fallback to basic fields
        const { data: basicShop, error: basicError } = await supabaseAdmin
          .from("shops")
          .select("id, shop_domain, display_name, email, coach_assigned")
          .eq("id", shop_id)
          .single();

        if (basicError || !basicShop) {
          logger.error("Shop not found", undefined, {
            component: "shop-profile",
            shopId: shop_id,
          });
          return NextResponse.json(
            { success: false, error: "Shop not found" },
            { status: 404 },
          );
        }

        // Return with null values for new fields
        return NextResponse.json({
          success: true,
          profile: {
            ...basicShop,
            owner_name: null,
            owner_phone: null,
            industry_niche: null,
            years_in_business: null,
            city: null,
            state: null,
            store_type: null,
            ecommerce_platform: null,
            advertising_goals: null,
          },
        });
      }

      logger.error("Error fetching shop profile", error as Error, {
        component: "shop-profile",
        shopId: shop_id,
      });
      return NextResponse.json(
        { success: false, error: "Failed to fetch shop profile" },
        { status: 500 },
      );
    }

    if (!shop) {
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      profile: shop,
    });
  } catch (error) {
    logger.error(
      "Error in GET /api/bhb/shops/[shop_id]/profile:",
      error as Error,
      {
        component: "shop-profile",
      },
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch shop profile",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// PATCH - Update shop profile
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ shop_id: string }> },
) {
  try {
    const { shop_id } = await params;

    // Require authentication
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      logger.warn("Unauthorized access attempt to update shop profile", {
        component: "shop-profile",
      });
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    // Only admins and coaches can update profiles
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "admin" && userRole !== "coach") {
      logger.warn("Forbidden access attempt to update shop profile", {
        component: "shop-profile",
        userId: session.user.id,
        userRole,
      });
      return NextResponse.json(
        { success: false, error: "Admin or coach access required" },
        { status: 403 },
      );
    }

    // Parse request body
    const body = await req.json();
    const {
      owner_name,
      owner_phone,
      industry_niche,
      years_in_business,
      city,
      state,
      store_type,
      ecommerce_platform,
      advertising_goals,
    } = body;

    // Validate store_type if provided
    if (store_type !== undefined && store_type !== null) {
      if (!["online", "brick-and-mortar", "both"].includes(store_type)) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid store_type. Must be online, brick-and-mortar, or both",
          },
          { status: 400 },
        );
      }
    }

    // Validate ecommerce_platform if provided
    if (ecommerce_platform !== undefined && ecommerce_platform !== null) {
      if (
        !["shopify", "lightspeed", "commentsold"].includes(ecommerce_platform)
      ) {
        return NextResponse.json(
          { success: false, error: "Invalid ecommerce_platform" },
          { status: 400 },
        );
      }
    }

    // Validate years_in_business if provided
    if (years_in_business !== undefined && years_in_business !== null) {
      if (typeof years_in_business !== "number" || years_in_business < 0) {
        return NextResponse.json(
          {
            success: false,
            error: "years_in_business must be a non-negative number",
          },
          { status: 400 },
        );
      }
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (owner_name !== undefined) updateData.owner_name = owner_name;
    if (owner_phone !== undefined) updateData.owner_phone = owner_phone;
    if (industry_niche !== undefined)
      updateData.industry_niche = industry_niche;
    if (years_in_business !== undefined)
      updateData.years_in_business = years_in_business;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (store_type !== undefined) updateData.store_type = store_type;
    if (ecommerce_platform !== undefined)
      updateData.ecommerce_platform = ecommerce_platform;
    if (advertising_goals !== undefined)
      updateData.advertising_goals = advertising_goals;

    // Verify shop exists
    const { data: existingShop, error: checkError } = await supabaseAdmin
      .from("shops")
      .select("id, shop_domain")
      .eq("id", shop_id)
      .single();

    if (checkError || !existingShop) {
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 404 },
      );
    }

    // Update the shop profile
    const { error: updateError } = await supabaseAdmin
      .from("shops")
      .update(updateData)
      .eq("id", shop_id);

    if (updateError) {
      logger.error("Failed to update shop profile", updateError as Error, {
        component: "shop-profile",
        shopId: shop_id,
      });
      return NextResponse.json(
        { success: false, error: "Failed to update shop profile" },
        { status: 500 },
      );
    }

    // Fetch updated profile
    const { data: updatedShop, error: fetchError } = await supabaseAdmin
      .from("shops")
      .select(
        `
        id,
        shop_domain,
        display_name,
        email,
        owner_name,
        owner_phone,
        industry_niche,
        years_in_business,
        city,
        state,
        store_type,
        ecommerce_platform,
        advertising_goals,
        coach_assigned
      `,
      )
      .eq("id", shop_id)
      .single();

    if (fetchError) {
      // Profile was updated but we couldn't fetch it - still return success
      logger.warn("Could not fetch updated profile", {
        component: "shop-profile",
        shopId: shop_id,
      });
      return NextResponse.json({
        success: true,
        message: "Profile updated successfully",
      });
    }

    logger.info("Shop profile updated", {
      component: "shop-profile",
      shopId: shop_id,
      shopDomain: existingShop.shop_domain,
      updatedBy: session.user.email,
      userRole,
    });

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      profile: updatedShop,
    });
  } catch (error) {
    logger.error(
      "Error in PATCH /api/bhb/shops/[shop_id]/profile:",
      error as Error,
      {
        component: "shop-profile",
      },
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update shop profile",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
