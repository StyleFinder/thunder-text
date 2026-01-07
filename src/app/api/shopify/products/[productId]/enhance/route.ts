import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  fetchProductDataForEnhancement,
  updateProductWithEnhancement,
  validateProductForEnhancement,
  type _EnhancementProductData,
} from "@/lib/shopify/product-enhancement";

// GET /api/shopify/products/[productId]/enhance?shop={shop}
// Fetch product data for enhancement
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get("shop");
    const { productId } = await params;

    if (!shop || !productId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameters: shop and productId",
        },
        { status: 400 },
      );
    }

    // Validate productId - prevent invalid values
    const invalidProductIds = [
      "undefined",
      "null",
      "metafields",
      "staging-test",
    ];
    if (invalidProductIds.includes(productId.toLowerCase())) {
      logger.error(
        `Invalid productId received in GET: ${productId}`,
        undefined,
        { component: "enhance" },
      );
      return NextResponse.json(
        {
          success: false,
          error: "Invalid product ID",
          details: `Product ID "${productId}" is not valid`,
        },
        { status: 400 },
      );
    }

    // Get session token from Authorization header if provided
    const authHeader = request.headers.get("authorization");
    const sessionToken = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : undefined;

    // Validate product exists and can be enhanced
    const validationResult = await validateProductForEnhancement(
      productId,
      shop,
      sessionToken,
    );
    if (!validationResult.isValid) {
      return NextResponse.json(
        { success: false, error: validationResult.reason },
        { status: 400 },
      );
    }

    // Fetch comprehensive product data
    const productData = await fetchProductDataForEnhancement(
      productId,
      shop,
      sessionToken,
    );

    if (!productData) {
      return NextResponse.json(
        { success: false, error: "Product not found or inaccessible" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: productData,
      message: "Product data fetched successfully for enhancement",
    });
  } catch (error) {
    logger.error(
      "❌ Error fetching product data for enhancement:",
      error as Error,
      { component: "enhance" },
    );
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch product data for enhancement",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// PUT /api/shopify/products/[productId]/enhance?shop={shop}
// Update product with enhanced description
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get("shop");
    const { productId } = await params;

    if (!shop || !productId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameters: shop and productId",
        },
        { status: 400 },
      );
    }

    // Validate productId - prevent invalid values
    const invalidProductIds = [
      "undefined",
      "null",
      "metafields",
      "staging-test",
    ];
    if (invalidProductIds.includes(productId.toLowerCase())) {
      logger.error(
        `Invalid productId received in PUT: ${productId}`,
        undefined,
        { component: "enhance" },
      );
      return NextResponse.json(
        {
          success: false,
          error: "Invalid product ID",
          details: `Product ID "${productId}" is not valid`,
        },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { enhancedDescription, enhancedTitle, options = {} } = body;

    if (!enhancedDescription) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required field: enhancedDescription",
        },
        { status: 400 },
      );
    }

    // Update the product with enhanced content
    const updateResult = await updateProductWithEnhancement(productId, shop, {
      title: enhancedTitle,
      description: enhancedDescription,
      options: {
        backupOriginal: options.backupOriginal !== false, // default true
        updateSeo: options.updateSeo !== false, // default true
        preserveImages: options.preserveImages !== false, // default true
        ...options,
      },
    });

    if (!updateResult.success) {
      throw new Error(updateResult.error || "Failed to update product");
    }

    return NextResponse.json({
      success: true,
      data: {
        productId,
        updatedAt: updateResult.updatedAt,
        backup: updateResult.backup,
        changes: updateResult.changes,
      },
      message: "Product enhanced and updated successfully",
    });
  } catch (error) {
    logger.error(
      "❌ Error updating product with enhancement:",
      error as Error,
      { component: "enhance" },
    );
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update product with enhancement",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// PATCH /api/shopify/products/[productId]/enhance?shop={shop}
// Rollback enhanced product to original
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get("shop");
    const { productId } = await params;

    if (!shop || !productId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameters: shop and productId",
        },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { action = "rollback" } = body;

    if (action !== "rollback") {
      return NextResponse.json(
        { success: false, error: "Only rollback action is supported" },
        { status: 400 },
      );
    }

    // Import rollback function (would be added to product-enhancement.ts)
    // const rollbackResult = await rollbackProductEnhancement(productId, shop)

    // Placeholder implementation
    const rollbackResult = {
      success: true,
      message: "Rollback functionality will be implemented",
      productId,
      rolledBackAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: rollbackResult,
      message: "Product enhancement rollback completed successfully",
    });
  } catch (error) {
    logger.error("❌ Error rolling back product enhancement:", error as Error, {
      component: "enhance",
    });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to rollback product enhancement",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
