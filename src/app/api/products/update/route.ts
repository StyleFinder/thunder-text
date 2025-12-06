import { NextRequest, NextResponse } from "next/server";
import {
  createCorsHeaders,
  handleCorsPreflightRequest,
} from "@/lib/middleware/cors";
import { ShopifyAPI } from "@/lib/shopify";
import { getShopToken } from "@/lib/shopify/token-manager";
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
      { component: "update" },
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
      component: "update",
      email,
    });
    return null;
  }

  return data?.linked_shopify_domain || null;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request);
}

export async function POST(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request);

  try {
    const body = await request.json();
    let { shop } = body;
    const { productId, updates } = body;

    if (!shop || !productId || !updates) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400, headers: corsHeaders },
      );
    }

    // Check if shop is actually an email (standalone user)
    // If so, look up their linked Shopify domain
    const isStandaloneUser = isEmail(shop);
    if (isStandaloneUser) {
      logger.info(
        "Standalone user detected, looking up linked Shopify domain",
        { component: "update", email: shop },
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
        component: "update",
        linkedDomain,
      });
      shop = linkedDomain;
    }

    // Get session token from the request
    const sessionToken = request.headers
      .get("authorization")
      ?.replace("Bearer ", "");

    // For the staging test store or standalone users, we'll use a direct approach if no session token
    const isTestStore = shop.includes("zunosai-staging-test-store");

    // Standalone users use stored tokens, not session tokens
    if (!sessionToken && !isTestStore && !isStandaloneUser) {
      logger.error("❌ No session token provided in request", undefined, {
        component: "update",
      });
      return NextResponse.json(
        {
          error: "Authentication required",
          details:
            "Session token is missing. Please ensure you are accessing the app through Shopify admin.",
          shop,
        },
        { status: 401, headers: corsHeaders },
      );
    }

    // Get access token
    let accessToken: string;

    try {
      // For the test store, use the environment variable access token
      if (isTestStore && process.env.SHOPIFY_ACCESS_TOKEN) {
        accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
      } else {
        // For production stores, try to get a stored offline token first
        const tokenResult = await getShopToken(shop);

        if (tokenResult.success && tokenResult.accessToken) {
          accessToken = tokenResult.accessToken;
        } else if (sessionToken) {
          // If no offline token, perform token exchange with the session token

          const { exchangeToken } = await import(
            "@/lib/shopify/token-exchange"
          );
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
          await saveShopToken(
            shop,
            accessToken,
            "online",
            exchangeResult.scope,
          );
        } else {
          throw new Error(
            "No access token available and no session token provided",
          );
        }
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
    console.log("🔐 Initializing Shopify API client for shop:", shop);
    const shopifyClient = new ShopifyAPI(shop, accessToken);

    // Format product ID for GraphQL (must be gid://shopify/Product/123 format)
    let formattedProductId = productId;
    if (!productId.startsWith("gid://")) {
      formattedProductId = `gid://shopify/Product/${productId}`;
    }
    console.log("📦 Using product ID:", formattedProductId);

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
      productInput.descriptionHtml = updates.description;
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
      console.log("📤 Sending update to Shopify GraphQL API...");
      updateResult = (await shopifyClient.updateProduct(
        formattedProductId,
        productInput,
      )) as { productUpdate?: { product?: unknown; userErrors?: unknown[] } };
    } catch (apiError) {
      logger.error("❌ Shopify API call failed:", apiError as Error, {
        component: "update",
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

    return NextResponse.json(
      {
        success: true,
        message: "Product updated successfully",
        productId,
        shopDomain: shop, // Return the resolved Shopify domain (not email for standalone users)
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
    logger.error("Error in update endpoint:", error as Error, {
      component: "update",
    });
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: corsHeaders },
    );
  }
}
