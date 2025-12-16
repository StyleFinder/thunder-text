import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import {
  importProductData,
  detectProductCategory,
  generateSuggestedKeywords,
  analyzeExistingDescription,
} from "@/lib/product-data-import";
import {
  createCorsHeaders,
  handleCorsPreflightRequest,
} from "@/lib/middleware/cors";
import { logger } from "@/lib/logger";

/**
 * GET /api/product-import
 * Import product data from Shopify
 *
 * SECURITY: Requires session authentication with shop ownership validation.
 * Previously trusted X-Shopify-Shop-Domain and X-Shopify-Access-Token headers
 * which could be forged by attackers.
 */
export async function GET(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request);

  try {
    // SECURITY: Require session authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401, headers: corsHeaders },
      );
    }

    const url = new URL(request.url);
    const productId = url.searchParams.get("productId");
    const shopDomain = request.headers.get("X-Shopify-Shop-Domain");
    const accessToken = request.headers.get("X-Shopify-Access-Token");

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400, headers: corsHeaders },
      );
    }

    if (!shopDomain || !accessToken) {
      return NextResponse.json(
        { error: "Missing authentication headers" },
        { status: 401, headers: corsHeaders },
      );
    }

    // SECURITY: Validate shop ownership - user can only import from their own shop
    const sessionShopDomain = (session.user as { shopDomain?: string })
      .shopDomain;
    const normalizedRequestShop = shopDomain.includes(".myshopify.com")
      ? shopDomain
      : `${shopDomain}.myshopify.com`;
    const normalizedSessionShop = sessionShopDomain?.includes(".myshopify.com")
      ? sessionShopDomain
      : `${sessionShopDomain}.myshopify.com`;

    if (normalizedRequestShop !== normalizedSessionShop) {
      logger.warn("Shop ownership mismatch in product-import", {
        component: "product-import",
        requestedShop: normalizedRequestShop,
        sessionShop: normalizedSessionShop,
      });
      return NextResponse.json(
        { error: "Access denied: Shop mismatch" },
        { status: 403, headers: corsHeaders },
      );
    }

    // Import product data from Shopify
    const productData = await importProductData(
      productId,
      shopDomain,
      accessToken,
    );

    // Generate additional insights
    const detectedCategory = detectProductCategory(productData);
    const suggestedKeywords = generateSuggestedKeywords(productData);
    const descriptionAnalysis = analyzeExistingDescription(
      productData.description,
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          product: productData,
          insights: {
            detectedCategory,
            suggestedKeywords,
            descriptionAnalysis,
          },
        },
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    logger.error("Product import error:", error as Error, {
      component: "product-import",
    });

    return NextResponse.json(
      { error: "Failed to import product data" },
      { status: 500, headers: corsHeaders },
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request);
}
