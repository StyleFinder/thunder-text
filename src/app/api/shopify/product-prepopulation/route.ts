import { NextRequest, NextResponse } from "next/server";
import {
  createCorsHeaders,
  handleCorsPreflightRequest,
} from "@/lib/middleware/cors";
import { getAccessToken } from "@/lib/shopify-auth";
import { logger } from "@/lib/logger";
import { createClient } from "@supabase/supabase-js";

// Helper to check if a string looks like an email
function isEmail(str: string): boolean {
  return str.includes("@") && !str.includes(".myshopify.com");
}

// Get the linked Shopify domain for a standalone user (by email)
async function getLinkedShopifyDomain(email: string): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    logger.error(
      "Missing Supabase configuration for standalone user lookup",
      undefined,
      { component: "product-prepopulation" },
    );
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from("shops")
    .select("linked_shopify_domain")
    .eq("email", email)
    .eq("is_active", true)
    .single();

  if (error) {
    logger.error("Error looking up linked Shopify domain", error as Error, {
      component: "product-prepopulation",
      email,
    });
    return null;
  }

  return data?.linked_shopify_domain || null;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request);
}

export async function GET(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request);

  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get("productId");
    let shop = searchParams.get("shop");

    if (!productId || !shop) {
      return NextResponse.json(
        { error: "Missing productId or shop parameter" },
        { status: 400, headers: corsHeaders },
      );
    }

    // Check if shop is actually an email (standalone user)
    // If so, look up their linked Shopify domain
    if (isEmail(shop)) {
      logger.info(
        "Standalone user detected, looking up linked Shopify domain",
        { component: "product-prepopulation", email: shop },
      );
      const linkedDomain = await getLinkedShopifyDomain(shop);

      if (!linkedDomain) {
        return NextResponse.json(
          {
            error: "No linked Shopify store",
            details: "Please connect your Shopify store first",
            hint: "Go to Settings > Connections to link your Shopify store",
          },
          { status: 400, headers: corsHeaders },
        );
      }

      logger.info("Found linked Shopify domain", {
        component: "product-prepopulation",
        linkedDomain,
      });
      shop = linkedDomain;
    }

    // Get session token from Authorization header if provided
    const authHeader = request.headers.get("authorization");
    const sessionToken = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : undefined;

    // Ensure shop has .myshopify.com
    const fullShop = shop.includes(".myshopify.com")
      ? shop
      : `${shop}.myshopify.com`;

    console.log("🏪 Using shop:", fullShop);

    // Get access token using proper Token Exchange
    let accessToken: string;
    try {
      accessToken = await getAccessToken(fullShop, sessionToken);
    } catch (error) {
      logger.error("❌ Failed to get access token:", error as Error, {
        component: "product-prepopulation",
      });
      return NextResponse.json(
        {
          error: "Authentication failed",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 401, headers: corsHeaders },
      );
    }

    // Format product ID for GraphQL
    let formattedProductId = productId;
    if (!productId.startsWith("gid://")) {
      formattedProductId = `gid://shopify/Product/${productId}`;
    }

    // GraphQL query for comprehensive product data
    const { GraphQLClient } = await import("graphql-request");
    const client = new GraphQLClient(
      `https://${fullShop}/admin/api/2025-01/graphql.json`,
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      },
    );

    interface ImageNode {
      id: string;
      url: string;
      altText: string | null;
      width: number;
      height: number;
    }

    interface CollectionNode {
      id: string;
      title: string;
      handle: string;
    }

    interface VariantNode {
      id: string;
      title: string;
      price: string;
      sku: string | null;
    }

    interface MetafieldNode {
      id: string;
      namespace: string;
      key: string;
      value: string;
      type: string;
    }

    interface ProductData {
      id: string;
      title: string;
      handle: string;
      description: string;
      descriptionHtml: string;
      vendor: string;
      productType: string;
      tags: string[];
      seo: {
        title: string | null;
        description: string | null;
      };
      images: {
        edges: Array<{ node: ImageNode }>;
      };
      collections: {
        edges: Array<{ node: CollectionNode }>;
      };
      variants: {
        edges: Array<{ node: VariantNode }>;
      };
      metafields: {
        edges: Array<{ node: MetafieldNode }>;
      };
    }

    interface ProductResponse {
      product?: ProductData;
    }

    const query = `
      query GetProduct($id: ID!) {
        product(id: $id) {
          id
          title
          handle
          description
          descriptionHtml
          vendor
          productType
          tags
          seo {
            title
            description
          }
          images(first: 20) {
            edges {
              node {
                id
                url
                altText
                width
                height
              }
            }
          }
          collections(first: 10) {
            edges {
              node {
                id
                title
                handle
              }
            }
          }
          variants(first: 100) {
            edges {
              node {
                id
                title
                price
                sku
              }
            }
          }
          metafields(first: 50) {
            edges {
              node {
                id
                namespace
                key
                value
                type
              }
            }
          }
        }
      }
    `;

    const data = await client.request<ProductResponse>(query, {
      id: formattedProductId,
    });

    if (!data?.product) {
      logger.error("❌ No product found in response", undefined, {
        component: "product-prepopulation",
      });
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404, headers: corsHeaders },
      );
    }

    const product = data.product;

    // Transform to PrePopulatedProductData format
    const processedData = {
      id: product.id,
      title: product.title,
      handle: product.handle,
      images: product.images.edges.map(({ node }: { node: ImageNode }) => ({
        url: node.url,
        altText: node.altText,
        width: node.width,
        height: node.height,
      })),
      category: {
        primary: product.productType || "general",
        collections: product.collections.edges.map(
          ({ node }: { node: CollectionNode }) => node.title,
        ),
      },
      variants: product.variants.edges.map(
        ({ node }: { node: VariantNode }) => ({
          id: node.id,
          title: node.title,
          price: node.price,
          sku: node.sku,
        }),
      ),
      materials: {
        fabric: undefined,
        composition: [],
        careInstructions: [],
      },
      metafields: {
        sizing: undefined,
        specifications: undefined,
        features: undefined,
      },
      vendor: product.vendor,
      productType: product.productType,
      tags: product.tags,
      existingDescription: product.descriptionHtml,
      seoTitle: product.seo?.title,
      seoDescription: product.seo?.description,
    };

    return NextResponse.json(processedData, { headers: corsHeaders });
  } catch (error) {
    logger.error("❌ API: Error fetching product data:", error as Error, {
      component: "product-prepopulation",
    });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch product data",
      },
      { status: 500, headers: corsHeaders },
    );
  }
}
