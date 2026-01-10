import { NextRequest, NextResponse } from "next/server";
import {
  createCorsHeaders,
  handleCorsPreflightRequest,
} from "@/lib/middleware/cors";
import { ShopifyAPI } from "@/lib/shopify";
import { getShopToken } from "@/lib/shopify/token-manager";
import { logger } from "@/lib/logger";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { sanitizeDescriptionForShopify } from "@/lib/security/input-sanitization";
import type { DiscoverMoreSection } from "@/types/blog-linking";

// Lazy-initialized Supabase client
let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) return supabaseClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  logger.info("🔧 Initializing Supabase client", {
    component: "update",
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseKey,
  });

  if (!supabaseUrl || !supabaseKey) {
    logger.error("❌ Missing Supabase configuration", undefined, {
      component: "update",
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
    });
    throw new Error("Missing Supabase configuration");
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey);
  return supabaseClient;
}

/**
 * Find shop by domain and return the shop record with access token
 */
async function findShopByDomain(shopDomain: string): Promise<{
  shop_domain: string;
  shopify_access_token: string | null;
  shopify_access_token_legacy: string | null;
} | null> {
  const fullShopDomain = shopDomain.includes(".myshopify.com")
    ? shopDomain
    : `${shopDomain}.myshopify.com`;

  const supabase = getSupabaseClient();

  const { data: shopByDomain } = await supabase
    .from("shops")
    .select("shop_domain, shopify_access_token, shopify_access_token_legacy")
    .eq("shop_domain", fullShopDomain)
    .single();

  if (shopByDomain) {
    logger.info("Found shop by shop_domain", {
      component: "update",
      shopDomain: fullShopDomain,
    });
    return shopByDomain;
  }

  logger.warn("Shop not found by domain", {
    component: "update",
    searchedDomain: fullShopDomain,
  });
  return null;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request);
}

export async function POST(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request);

  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      logger.error("❌ Failed to parse request body:", parseError as Error, {
        component: "update",
      });
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400, headers: corsHeaders },
      );
    }

    const { shop, productId, updates, blogLink } = body as {
      shop: string;
      productId: string;
      updates: {
        title?: string;
        description?: string;
        seoTitle?: string;
        seoDescription?: string;
        bulletPoints?: string[];
      };
      blogLink?: DiscoverMoreSection;
    };

    logger.info("📥 Update request received", {
      component: "update",
      shop,
      productId,
      hasUpdates: !!updates,
    });

    if (!shop || !productId || !updates) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          details: { shop: !!shop, productId: !!productId, updates: !!updates },
        },
        { status: 400, headers: corsHeaders },
      );
    }

    // Get session token from the request (used when embedded in Shopify admin)
    const sessionToken = request.headers
      .get("authorization")
      ?.replace("Bearer ", "");

    // Check if shop has a stored access token
    // This allows shops with existing tokens to update products without being embedded
    const shopRecord = await findShopByDomain(shop);
    const hasStoredToken = !!(
      shopRecord?.shopify_access_token ||
      shopRecord?.shopify_access_token_legacy
    );

    if (!sessionToken && !hasStoredToken) {
      logger.error("❌ No session token or stored token available", undefined, {
        component: "update",
        shop,
      });
      return NextResponse.json(
        {
          error: "Authentication required",
          details:
            "No stored access token found for this shop. Please reinstall the app from Shopify admin.",
          shop,
        },
        { status: 401, headers: corsHeaders },
      );
    }

    // Get access token
    let accessToken: string;

    try {
      // First, try to get a stored token from the database
      const tokenResult = await getShopToken(shop);

      if (tokenResult.success && tokenResult.accessToken) {
        accessToken = tokenResult.accessToken;
        logger.info("✅ Using stored access token from token manager", {
          component: "update",
          shop,
        });
      } else if (
        shopRecord &&
        (shopRecord.shopify_access_token ||
          shopRecord.shopify_access_token_legacy)
      ) {
        // Fallback to direct database lookup
        accessToken =
          shopRecord.shopify_access_token ||
          shopRecord.shopify_access_token_legacy!;
        logger.info("✅ Using stored access token from database", {
          component: "update",
          shop,
        });
      } else if (sessionToken) {
        // If no stored token, perform token exchange with the session token
        logger.info("Performing token exchange with session token", {
          component: "update",
          shop,
        });

        const { exchangeToken } = await import("@/lib/shopify/token-exchange");
        const exchangeResult = await exchangeToken({
          shop,
          sessionToken,
          clientId: process.env.SHOPIFY_API_KEY!,
          clientSecret: process.env.SHOPIFY_API_SECRET!,
          requestedTokenType: "offline",
        });

        accessToken = exchangeResult.access_token;

        // Save the token for future use
        const { saveShopToken } = await import("@/lib/shopify/token-manager");
        await saveShopToken(shop, accessToken, "online", exchangeResult.scope);
        logger.info("✅ Token exchange successful, saved new token", {
          component: "update",
          shop,
        });
      } else {
        throw new Error(
          "No access token available and no session token provided",
        );
      }
    } catch (tokenError) {
      logger.error("❌ Failed to obtain access token:", tokenError as Error, {
        component: "update",
      });
      return NextResponse.json(
        {
          error: "Authentication failed",
          details:
            tokenError instanceof Error
              ? tokenError.message
              : "Failed to authenticate with Shopify",
          shop,
        },
        { status: 401, headers: corsHeaders },
      );
    }

    // Initialize Shopify API client with the access token
    // Ensure shop domain includes .myshopify.com
    const fullShopDomain = shop.includes(".myshopify.com")
      ? shop
      : `${shop}.myshopify.com`;

    // M4 SECURITY: Verify the authenticated shop matches the requested shop
    // This prevents attackers from using one shop's credentials to modify another shop's products
    if (shopRecord && shopRecord.shop_domain !== fullShopDomain) {
      logger.warn("Shop ownership mismatch detected", {
        component: "update",
        requestedShop: fullShopDomain,
        authenticatedShop: shopRecord.shop_domain,
      });
      return NextResponse.json(
        {
          error: "Forbidden",
          details: "You can only update products for your own shop",
        },
        { status: 403, headers: corsHeaders },
      );
    }

    logger.info("🔐 Initializing Shopify API client", {
      component: "update",
      shop: fullShopDomain,
    });
    const shopifyClient = new ShopifyAPI(fullShopDomain, accessToken);

    // Format product ID for GraphQL (must be gid://shopify/Product/123 format)
    let formattedProductId = productId;
    if (!productId.startsWith("gid://")) {
      formattedProductId = `gid://shopify/Product/${productId}`;
    }
    logger.info("📦 Updating product", {
      component: "update",
      productId: formattedProductId,
    });

    // Prepare the update input for Shopify GraphQL
    const productInput: {
      title?: string;
      descriptionHtml?: string;
    } = {};

    // Map our updates to Shopify's productUpdate input format
    if (updates.title) {
      productInput.title = updates.title;
    }

    if (updates.description) {
      // Shopify uses descriptionHtml for the product description
      // Sanitize to remove &nbsp; entities that cause copy/paste issues
      productInput.descriptionHtml = sanitizeDescriptionForShopify(updates.description);
    }

    // SEO fields are updated through metafields
    const metafieldsToUpdate = [];

    if (updates.seoTitle) {
      metafieldsToUpdate.push({
        namespace: "global",
        key: "title_tag",
        value: updates.seoTitle,
        type: "single_line_text_field",
      });
    }

    if (updates.seoDescription) {
      metafieldsToUpdate.push({
        namespace: "global",
        key: "description_tag",
        value: updates.seoDescription,
        type: "single_line_text_field",
      });
    }

    // Custom metafield for bullet points
    if (updates.bulletPoints && Array.isArray(updates.bulletPoints)) {
      metafieldsToUpdate.push({
        namespace: "thunder_text",
        key: "bullet_points",
        value: JSON.stringify(updates.bulletPoints),
        type: "json",
      });
    }

    // Update the product
    let updateResult:
      | { productUpdate?: { product?: unknown; userErrors?: unknown[] } }
      | undefined;
    try {
      logger.info("📤 Sending update to Shopify GraphQL API...", {
        component: "update",
        productId: formattedProductId,
        hasTitle: !!productInput.title,
        hasDescription: !!productInput.descriptionHtml,
        shop: fullShopDomain,
      });
      updateResult = (await shopifyClient.updateProduct(
        formattedProductId,
        productInput,
      )) as { productUpdate?: { product?: unknown; userErrors?: unknown[] } };
      logger.info("📥 Shopify API response received", {
        component: "update",
        hasProduct: !!updateResult?.productUpdate?.product,
        hasErrors: !!updateResult?.productUpdate?.userErrors?.length,
      });
    } catch (apiError) {
      logger.error("❌ Shopify API call failed:", apiError as Error, {
        component: "update",
        errorMessage: apiError instanceof Error ? apiError.message : "Unknown",
        productId: formattedProductId,
        shop: fullShopDomain,
      });
      throw new Error(
        `Shopify API error: ${apiError instanceof Error ? apiError.message : "Unknown error"}`,
      );
    }

    if (
      updateResult.productUpdate?.userErrors &&
      updateResult.productUpdate.userErrors.length > 0
    ) {
      logger.error("❌ Shopify API errors:", undefined, {
        errors: updateResult.productUpdate.userErrors,
        component: "update",
      });
      return NextResponse.json(
        {
          error: "Failed to update product",
          details: (
            updateResult.productUpdate.userErrors as Array<{ message: string }>
          )
            .map((e) => e.message)
            .join(", "),
          userErrors: updateResult.productUpdate.userErrors,
        },
        { status: 400, headers: corsHeaders },
      );
    }

    // Update metafields if any
    if (metafieldsToUpdate.length > 0) {
      for (const metafield of metafieldsToUpdate) {
        try {
          await shopifyClient.createProductMetafield(
            formattedProductId,
            metafield,
          );
        } catch (metaError) {
          logger.error("⚠️ Error updating metafield", metaError as Error, {
            metafieldKey: metafield.key,
            component: "update",
          });
          // Continue with other metafields even if one fails
        }
      }
    }

    // Store blog link in database if provided
    if (blogLink && blogLink.title && blogLink.summary && blogLink.url) {
      try {
        const supabase = getSupabaseClient();

        // Get the shop ID from the shops table
        const { data: shopData } = await supabase
          .from("shops")
          .select("id")
          .eq("shop_domain", fullShopDomain)
          .single();

        if (shopData?.id) {
          // Extract numeric product ID from GID
          const productIdNumeric = formattedProductId
            .replace("gid://shopify/Product/", "")
            .split("/")[0];

          await supabase.from("product_blog_links").upsert(
            {
              store_id: shopData.id,
              product_id: productIdNumeric,
              blog_id: blogLink.blogSource === "library" ? blogLink.blogId : null,
              shopify_blog_id:
                blogLink.blogSource === "shopify" ? blogLink.blogId : null,
              blog_source: blogLink.blogSource,
              blog_title: blogLink.title,
              summary: blogLink.summary,
              blog_url: blogLink.url,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "store_id,product_id" },
          );

          logger.info("✅ Blog link stored in database", {
            component: "update",
            productId: productIdNumeric,
            blogId: blogLink.blogId,
            blogSource: blogLink.blogSource,
          });
        }
      } catch (blogLinkError) {
        // Log but don't fail the request if blog link storage fails
        logger.error("⚠️ Error storing blog link:", blogLinkError as Error, {
          component: "update",
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Product updated successfully",
        productId,
        shopDomain: fullShopDomain,
        updates: {
          title: updates.title || null,
          description: updates.description || null,
          seoTitle: updates.seoTitle || null,
          seoDescription: updates.seoDescription || null,
          bulletPoints: updates.bulletPoints || null,
        },
        mode: "production",
        shopifyResult: updateResult.productUpdate?.product,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    // SECURITY M2: Log full error details server-side, but never expose to client
    logger.error("Error in update endpoint:", error as Error, {
      component: "update",
    });

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500, headers: corsHeaders },
    );
  }
}
