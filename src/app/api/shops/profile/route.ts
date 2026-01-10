import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserId } from "@/lib/auth/content-center-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { logger } from "@/lib/logger";
import { ShopProfile, UpdateShopProfilePayload } from "@/types/onboarding";

/**
 * GET /api/shops/profile
 * Get shop profile data for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    let userId: string | null = null;

    // First, try NextAuth session
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      userId = session.user.id;
    }

    // Fallback to shop domain auth
    if (!userId) {
      userId = await getUserId(request);
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    logger.info("[Shop Profile] Looking up shop profile", {
      component: "shop-profile",
      userId,
    });

    const { data: shop, error: shopError } = await supabaseAdmin
      .from("shops")
      .select(
        `id,
         shop_domain,
         business_description,
         industry,
         product_types,
         business_size`
      )
      .eq("id", userId)
      .single();

    if (shopError || !shop) {
      logger.error("Failed to fetch shop profile:", shopError as Error, {
        component: "shop-profile",
        userId,
      });
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 404 }
      );
    }

    // Extract business name from shop domain or use stored value
    const businessName = shop.shop_domain
      ? shop.shop_domain.replace(".myshopify.com", "").replace(/-/g, " ")
      : "";

    const profile: ShopProfile = {
      business_name: businessName,
      business_description: shop.business_description ?? "",
      industry: shop.industry ?? "",
      product_types: shop.product_types ?? [],
      business_size: shop.business_size ?? "",
    };

    logger.info("[Shop Profile] Profile retrieved", {
      component: "shop-profile",
      userId,
      hasDescription: !!shop.business_description,
      hasIndustry: !!shop.industry,
    });

    return NextResponse.json(
      {
        success: true,
        data: profile,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Error in GET /api/shops/profile:", error as Error, {
      component: "shop-profile",
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/shops/profile
 * Update shop profile data for the authenticated user
 */
export async function PATCH(request: NextRequest) {
  try {
    let userId: string | null = null;

    // First, try NextAuth session
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      userId = session.user.id;
    }

    // Fallback to shop domain auth
    if (!userId) {
      userId = await getUserId(request);
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body: UpdateShopProfilePayload = await request.json();

    logger.info("[Shop Profile] Updating profile", {
      component: "shop-profile",
      userId,
      fields: Object.keys(body),
    });

    // Build update object with validation
    const updateData: Record<string, unknown> = {};

    if (typeof body.business_description === "string") {
      updateData.business_description = body.business_description.trim();
    }

    if (typeof body.industry === "string") {
      updateData.industry = body.industry.trim();
    }

    if (Array.isArray(body.product_types)) {
      updateData.product_types = body.product_types.filter(
        (t) => typeof t === "string" && t.trim().length > 0
      );
    }

    if (typeof body.business_size === "string") {
      updateData.business_size = body.business_size;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const { data: updatedShop, error: updateError } = await supabaseAdmin
      .from("shops")
      .update(updateData)
      .eq("id", userId)
      .select(
        `id,
         shop_domain,
         business_description,
         industry,
         product_types,
         business_size`
      )
      .single();

    if (updateError) {
      logger.error("Failed to update shop profile:", updateError as Error, {
        component: "shop-profile",
        userId,
      });
      return NextResponse.json(
        { success: false, error: "Failed to update profile" },
        { status: 500 }
      );
    }

    // Extract business name from shop domain
    const businessName = updatedShop.shop_domain
      ? updatedShop.shop_domain.replace(".myshopify.com", "").replace(/-/g, " ")
      : "";

    const profile: ShopProfile = {
      business_name: businessName,
      business_description: updatedShop.business_description ?? "",
      industry: updatedShop.industry ?? "",
      product_types: updatedShop.product_types ?? [],
      business_size: updatedShop.business_size ?? "",
    };

    logger.info("[Shop Profile] Profile updated", {
      component: "shop-profile",
      userId,
      profile,
    });

    return NextResponse.json(
      {
        success: true,
        data: profile,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Error in PATCH /api/shops/profile:", error as Error, {
      component: "shop-profile",
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
