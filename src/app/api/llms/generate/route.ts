/* eslint-disable security/detect-object-injection -- Dynamic object access with validated keys is safe here */
import { NextRequest, NextResponse } from "next/server";
import { createCorsHeaders } from "@/lib/middleware/cors";
import { getAccessToken } from "@/lib/shopify-auth";
import { logger } from "@/lib/logger";
import { GraphQLClient } from "graphql-request";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

interface ProductNode {
  id: string;
  title: string;
  description: string;
  handle: string;
  productType: string;
  vendor: string;
  tags: string[];
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
}

interface ProductEdge {
  node: ProductNode;
}

interface ProductsResponse {
  products: {
    edges: ProductEdge[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
  };
  shop: {
    name: string;
    description: string;
    primaryDomain: {
      url: string;
    };
  };
}

/**
 * Fetches all products from Shopify for llms.txt generation
 * Uses pagination to get all products, not just first 100
 */
async function fetchAllProducts(
  shop: string,
  accessToken: string,
): Promise<{ products: ProductNode[]; shopInfo: ProductsResponse["shop"] }> {
  const client = new GraphQLClient(
    `https://${shop}/admin/api/2025-01/graphql.json`,
    {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    },
  );

  const query = `
    query getProductsForLLMs($first: Int!, $after: String) {
      products(first: $first, after: $after, query: "status:active") {
        edges {
          node {
            id
            title
            description
            handle
            productType
            vendor
            tags
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
      shop {
        name
        description
        primaryDomain {
          url
        }
      }
    }
  `;

  const allProducts: ProductNode[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;
  let shopInfo: ProductsResponse["shop"] | null = null;

  while (hasNextPage) {
    const apiResponse: ProductsResponse =
      await client.request<ProductsResponse>(query, {
        first: 250, // Max allowed by Shopify
        after: cursor,
      });

    if (!shopInfo) {
      shopInfo = apiResponse.shop;
    }

    allProducts.push(
      ...apiResponse.products.edges.map((edge: ProductEdge) => edge.node),
    );
    hasNextPage = apiResponse.products.pageInfo.hasNextPage;
    cursor = apiResponse.products.pageInfo.endCursor;

    // Safety limit: max 10,000 products
    if (allProducts.length >= 10000) {
      break;
    }
  }

  return {
    products: allProducts,
    shopInfo: shopInfo!,
  };
}

/**
 * Formats currency amount for display
 */
function formatPrice(amount: string, currencyCode: string): string {
  const num = parseFloat(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(num);
}

/**
 * Cleans HTML from description text
 */
function cleanDescription(html: string): string {
  if (!html) return "";
  // Remove HTML tags
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 500); // Limit length
}

/**
 * Generates llms.txt content from products
 */
function generateLlmsTxt(
  products: ProductNode[],
  shopInfo: ProductsResponse["shop"],
): string {
  const lines: string[] = [];
  const storeUrl = shopInfo.primaryDomain?.url || "";

  // Header section
  lines.push(`# ${shopInfo.name}`);
  lines.push("");

  if (shopInfo.description) {
    lines.push(`> ${shopInfo.description}`);
    lines.push("");
  }

  lines.push(
    `This file contains product information for ${shopInfo.name} to help AI assistants provide accurate product recommendations and information.`,
  );
  lines.push("");
  lines.push(`Store URL: ${storeUrl}`);
  lines.push(`Total Products: ${products.length}`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // Group products by type
  const productsByType: Record<string, ProductNode[]> = {};
  products.forEach((product) => {
    const type = product.productType || "Other";
    if (!productsByType[type]) {
      productsByType[type] = [];
    }
    productsByType[type].push(product);
  });

  // Generate product sections by type
  Object.keys(productsByType)
    .sort()
    .forEach((type) => {
      lines.push(`## ${type}`);
      lines.push("");

      productsByType[type].forEach((product) => {
        const price = formatPrice(
          product.priceRange.minVariantPrice.amount,
          product.priceRange.minVariantPrice.currencyCode,
        );
        const productUrl = `${storeUrl}/products/${product.handle}`;

        lines.push(`### ${product.title}`);
        lines.push("");
        lines.push(`- **Price**: ${price}`);
        if (product.vendor) {
          lines.push(`- **Brand**: ${product.vendor}`);
        }
        lines.push(`- **URL**: ${productUrl}`);

        const description = cleanDescription(product.description);
        if (description) {
          lines.push("");
          lines.push(description);
        }

        if (product.tags && product.tags.length > 0) {
          lines.push("");
          lines.push(`Tags: ${product.tags.join(", ")}`);
        }

        lines.push("");
      });
    });

  // Footer
  lines.push("---");
  lines.push("");
  lines.push(
    `This llms.txt file was generated by Thunder Text (https://thundertext.app)`,
  );
  lines.push(`For more information about llms.txt, visit: https://llmstxt.org`);

  return lines.join("\n");
}

export async function POST(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request);

  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get("shop");

    if (!shop) {
      return NextResponse.json(
        { success: false, error: "Shop parameter required" },
        { status: 400, headers: corsHeaders },
      );
    }

    // Get session token from Authorization header
    const authHeader = request.headers.get("authorization");
    const sessionToken = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : undefined;

    // Get access token
    const fullShop = shop.includes(".myshopify.com")
      ? shop
      : `${shop}.myshopify.com`;

    let accessToken: string;
    try {
      accessToken = await getAccessToken(fullShop, sessionToken);
    } catch (error) {
      logger.error("Failed to get access token for llms.txt:", error as Error, {
        component: "llms-generate",
      });
      return NextResponse.json(
        { success: false, error: "Authentication failed" },
        { status: 401, headers: corsHeaders },
      );
    }

    // Fetch all products
    logger.info("Fetching products for llms.txt generation", {
      component: "llms-generate",
      shop: fullShop,
    });

    const { products, shopInfo } = await fetchAllProducts(
      fullShop,
      accessToken,
    );

    logger.info(`Fetched ${products.length} products for llms.txt`, {
      component: "llms-generate",
      shop: fullShop,
      productCount: products.length,
    });

    // Generate llms.txt content
    const llmsTxtContent = generateLlmsTxt(products, shopInfo);
    const generatedAt = new Date().toISOString();

    // Update llms_settings with generation stats
    try {
      const supabase = getSupabaseAdmin();

      // Get shop_id
      const { data: shopData } = await supabase
        .from("shops")
        .select("id")
        .eq("shop_domain", fullShop)
        .single();

      if (shopData) {
        // Calculate next sync time based on current schedule
        const { data: currentSettings } = await supabase
          .from("llms_settings")
          .select("sync_schedule")
          .eq("shop_id", shopData.id)
          .single();

        let next_sync_at: string | null = null;
        if (currentSettings?.sync_schedule === "daily") {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(0, 0, 0, 0);
          next_sync_at = tomorrow.toISOString();
        } else if (currentSettings?.sync_schedule === "weekly") {
          const nextWeek = new Date();
          nextWeek.setDate(nextWeek.getDate() + 7);
          nextWeek.setHours(0, 0, 0, 0);
          next_sync_at = nextWeek.toISOString();
        }

        // Upsert the settings with updated stats
        await supabase.from("llms_settings").upsert(
          {
            shop_id: shopData.id,
            last_generated_at: generatedAt,
            last_product_count: products.length,
            next_sync_at,
          },
          {
            onConflict: "shop_id",
          },
        );

        logger.info("Updated llms_settings with generation stats", {
          component: "llms-generate",
          shop: fullShop,
          productCount: products.length,
        });
      }
    } catch (dbError) {
      // Log but don't fail the request if DB update fails
      logger.error("Failed to update llms_settings:", dbError as Error, {
        component: "llms-generate",
        shop: fullShop,
      });
    }

    return NextResponse.json(
      {
        success: true,
        content: llmsTxtContent,
        stats: {
          productCount: products.length,
          generatedAt,
          shopName: shopInfo.name,
        },
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    logger.error("Error generating llms.txt:", error as Error, {
      component: "llms-generate",
    });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate llms.txt",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: corsHeaders },
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request);
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
