import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { logger } from "@/lib/logger";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Helper to get authenticated shop ID from session
 *
 * SECURITY: Uses session-based authentication instead of trusting shop param.
 * Shop ID is derived from the authenticated user's session.
 */
async function getAuthenticatedShopId(): Promise<{
  shopId: string | null;
  error?: string;
  status?: number;
}> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return { shopId: null, error: "Authentication required", status: 401 };
  }

  const shopDomain = (session.user as { shopDomain?: string }).shopDomain;
  if (!shopDomain) {
    return {
      shopId: null,
      error: "No shop associated with account",
      status: 403,
    };
  }

  // Get shop_id from database using session's shop domain
  const { data: shopData, error: shopError } = await supabaseAdmin
    .from("shops")
    .select("id")
    .eq("shop_domain", shopDomain)
    .single();

  if (shopError || !shopData) {
    logger.error("Error fetching shop for categories:", shopError as Error, {
      component: "categories-api",
    });
    return { shopId: null, error: "Shop not found", status: 404 };
  }

  return { shopId: shopData.id };
}

/**
 * GET /api/categories
 *
 * Get all custom categories for the authenticated shop
 *
 * SECURITY: Uses session-based authentication. The shop param is IGNORED -
 * shop ID is derived from the authenticated session.
 */
export async function GET(_request: NextRequest) {
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
    // SECURITY: Get shop ID from session, not from query params
    const auth = await getAuthenticatedShopId();
    if (!auth.shopId) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 },
      );
    }

    // Note: shop param from URL is ignored - we use session-derived shopId
    const storeId = auth.shopId;

    // Get custom categories for this shop with hierarchical structure
    const { data: categories, error: categoriesError } = await supabaseAdmin
      .from("custom_categories")
      .select("*")
      .eq("store_id", storeId)
      .order("sort_order, name");

    if (categoriesError) {
      logger.error("Categories fetch error", categoriesError as Error, {
        component: "categories-api",
        operation: "GET",
        storeId,
      });
      return NextResponse.json(
        { error: "Failed to fetch categories" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: categories || [],
    });
  } catch (error) {
    logger.error("Categories API error", error as Error, {
      component: "categories-api",
      operation: "GET",
    });
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/categories
 *
 * Create a new custom category for the authenticated shop
 *
 * SECURITY: Uses session-based authentication. The shop param is IGNORED.
 */
export async function POST(request: NextRequest) {
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
    // SECURITY: Get shop ID from session, not from query params
    const auth = await getAuthenticatedShopId();
    if (!auth.shopId) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 },
      );
    }

    // Note: shop param from URL is ignored - we use session-derived shopId
    const storeId = auth.shopId;

    const body = await request.json();
    const {
      name,
      description,
      isDefault = false,
      parentId = null,
      categoryLevel = 0,
      sortOrder = 0,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 },
      );
    }

    // Check if category already exists for this shop and parent
    const { data: existingCategory } = await supabaseAdmin
      .from("custom_categories")
      .select("id")
      .eq("store_id", storeId)
      .eq("name", name.trim())
      .eq("parent_id", parentId)
      .single();

    if (existingCategory) {
      return NextResponse.json(
        { error: "Category with this name already exists" },
        { status: 409 },
      );
    }

    // Create the category
    const { data: category, error: createError } = await supabaseAdmin
      .from("custom_categories")
      .insert({
        store_id: storeId, // SECURITY: Use session-derived storeId
        name: name.trim(),
        description: description?.trim() || null,
        is_default: isDefault,
        parent_id: parentId,
        category_level: categoryLevel,
        sort_order: sortOrder,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      logger.error("Category creation error", createError as Error, {
        component: "categories-api",
        operation: "POST",
        categoryName: name,
        storeId,
      });
      return NextResponse.json(
        { error: "Failed to create category" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: category,
    });
  } catch (error) {
    logger.error("Category creation API error", error as Error, {
      component: "categories-api",
      operation: "POST",
    });
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/categories
 *
 * Update a custom category for the authenticated shop
 *
 * SECURITY: Uses session-based authentication. The shop param is IGNORED.
 */
export async function PUT(request: NextRequest) {
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
    // SECURITY: Get shop ID from session, not from query params
    const auth = await getAuthenticatedShopId();
    if (!auth.shopId) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 },
      );
    }

    // Note: shop param from URL is ignored - we use session-derived shopId
    const storeId = auth.shopId;

    const body = await request.json();
    const { id, name, description, isDefault = false } = body;

    if (!id || !name || !name.trim()) {
      return NextResponse.json(
        { error: "Category ID and name are required" },
        { status: 400 },
      );
    }

    // Check if category exists and belongs to this shop
    const { data: existingCategory } = await supabaseAdmin
      .from("custom_categories")
      .select("id")
      .eq("id", id)
      .eq("store_id", storeId)
      .single();

    if (!existingCategory) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    // Check if another category with the same name exists (excluding current one)
    const { data: duplicateCategory } = await supabaseAdmin
      .from("custom_categories")
      .select("id")
      .eq("store_id", storeId)
      .eq("name", name.trim())
      .neq("id", id)
      .single();

    if (duplicateCategory) {
      return NextResponse.json(
        { error: "Category with this name already exists" },
        { status: 409 },
      );
    }

    // Update the category
    const { data: category, error: updateError } = await supabaseAdmin
      .from("custom_categories")
      .update({
        name: name.trim(),
        description: description?.trim() || null,
        is_default: isDefault,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("store_id", storeId) // SECURITY: Use session-derived storeId
      .select()
      .single();

    if (updateError) {
      logger.error("Category update error", updateError as Error, {
        component: "categories-api",
        operation: "PUT",
        categoryId: id,
        storeId,
      });
      return NextResponse.json(
        { error: "Failed to update category" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: category,
    });
  } catch (error) {
    logger.error("Category update API error", error as Error, {
      component: "categories-api",
      operation: "PUT",
    });
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/categories
 *
 * Delete a custom category for the authenticated shop
 *
 * SECURITY: Uses session-based authentication. The shop param is IGNORED.
 */
export async function DELETE(request: NextRequest) {
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
    // SECURITY: Get shop ID from session, not from query params
    const auth = await getAuthenticatedShopId();
    if (!auth.shopId) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 },
      );
    }

    // Note: shop param from URL is ignored - we use session-derived shopId
    const storeId = auth.shopId;

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("id");

    if (!categoryId) {
      return NextResponse.json(
        { error: "Category ID is required" },
        { status: 400 },
      );
    }

    // Check if category exists and belongs to this shop
    const { data: existingCategory } = await supabaseAdmin
      .from("custom_categories")
      .select("id, name")
      .eq("id", categoryId)
      .eq("store_id", storeId)
      .single();

    if (!existingCategory) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    // Delete the category
    const { error: deleteError } = await supabaseAdmin
      .from("custom_categories")
      .delete()
      .eq("id", categoryId)
      .eq("store_id", storeId); // SECURITY: Use session-derived storeId

    if (deleteError) {
      logger.error("Category deletion error", deleteError as Error, {
        component: "categories-api",
        operation: "DELETE",
        categoryId,
        storeId,
      });
      return NextResponse.json(
        { error: "Failed to delete category" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Category "${existingCategory.name}" deleted successfully`,
    });
  } catch (error) {
    logger.error("Category deletion API error", error as Error, {
      component: "categories-api",
      operation: "DELETE",
    });
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 },
    );
  }
}
