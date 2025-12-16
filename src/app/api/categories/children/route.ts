import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { logger } from "@/lib/logger";

/**
 * GET /api/categories/children
 * Get child categories for a shop
 *
 * SECURITY: Requires session authentication with shop ownership validation.
 */
export async function GET(request: NextRequest) {
  // Check if we're in a build environment without proper configuration
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co"
  ) {
    return NextResponse.json(
      { error: "Application not properly configured" },
      { status: 503 },
    );
  }

  try {
    // SECURITY: Require session authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Dynamic imports to avoid loading during build
    const { supabaseAdmin } = await import("@/lib/supabase");

    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    const parentId = url.searchParams.get("parentId");

    if (!shop) {
      return NextResponse.json(
        { error: "Missing shop parameter" },
        { status: 400 },
      );
    }

    // SECURITY: Validate shop ownership - user can only access their own shop's categories
    const sessionShopDomain = (session.user as { shopDomain?: string })
      .shopDomain;
    const normalizedRequestShop = shop.includes(".myshopify.com")
      ? shop
      : `${shop}.myshopify.com`;
    const normalizedSessionShop = sessionShopDomain?.includes(".myshopify.com")
      ? sessionShopDomain
      : `${sessionShopDomain}.myshopify.com`;

    if (normalizedRequestShop !== normalizedSessionShop) {
      logger.warn("Shop ownership mismatch in categories/children", {
        component: "children",
        requestedShop: normalizedRequestShop,
        sessionShop: normalizedSessionShop,
      });
      return NextResponse.json(
        { error: "Access denied: Shop mismatch" },
        { status: 403 },
      );
    }

    // Get shop ID from shops table using shop_domain
    const fullShopDomain = shop.includes(".myshopify.com")
      ? shop
      : `${shop}.myshopify.com`;
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("id")
      .eq("shop_domain", fullShopDomain)
      .single();

    if (shopError || !shopData) {
      logger.error("Shop lookup error:", shopError as Error, {
        component: "children",
      });
      return NextResponse.json(
        { error: "Shop not found. Please ensure the app is installed." },
        { status: 404 },
      );
    }

    // Get sub-categories for the specified parent
    let query = supabaseAdmin
      .from("custom_categories")
      .select("*")
      .eq("store_id", shopData.id)
      .order("sort_order, name");

    if (parentId && parentId !== "null") {
      // Get children of specific parent
      query = query.eq("parent_id", parentId);
    } else {
      // Get top-level categories (no parent)
      query = query.is("parent_id", null);
    }

    const { data: categories, error: categoriesError } = await query;

    if (categoriesError) {
      logger.error(
        "Categories children fetch error:",
        categoriesError as Error,
        { component: "children" },
      );
      return NextResponse.json(
        { error: "Failed to fetch category children" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: categories || [],
    });
  } catch (error) {
    logger.error("Categories children API error:", error as Error, {
      component: "children",
    });
    return NextResponse.json(
      { error: "Failed to fetch category children" },
      { status: 500 },
    );
  }
}
