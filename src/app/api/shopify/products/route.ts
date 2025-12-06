import { NextRequest, NextResponse } from "next/server";
import { createCorsHeaders } from "@/lib/middleware/cors";
import { getProducts } from "@/lib/shopify/get-products";
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
      { component: "products" },
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
      component: "products",
      email,
    });
    return null;
  }

  return data?.linked_shopify_domain || null;
}

export async function GET(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request);

  try {
    const { searchParams } = new URL(request.url);
    let shop =
      searchParams.get("shop") || "zunosai-staging-test-store.myshopify.com";
    const query = searchParams.get("query") || undefined;

    // Get session token from Authorization header
    const authHeader = request.headers.get("authorization");
    const sessionToken = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : undefined;

    // Check if shop is actually an email (standalone user)
    // If so, look up their linked Shopify domain
    if (isEmail(shop)) {
      logger.info(
        "Standalone user detected, looking up linked Shopify domain",
        { component: "products", email: shop },
      );
      const linkedDomain = await getLinkedShopifyDomain(shop);

      if (!linkedDomain) {
        return NextResponse.json(
          {
            success: false,
            error: "No linked Shopify store",
            details: "Please connect your Shopify store first",
            hint: "Go to Settings > Connections to link your Shopify store",
          },
          { status: 400, headers: corsHeaders },
        );
      }

      logger.info("Found linked Shopify domain", {
        component: "products",
        linkedDomain,
      });
      shop = linkedDomain;
    }

    // Ensure shop has .myshopify.com
    const fullShop = shop.includes(".myshopify.com")
      ? shop
      : `${shop}.myshopify.com`;

    console.log("🔐 Has session token:", !!sessionToken);
    console.log("🏪 Using shop:", fullShop);

    // Get access token using proper Token Exchange
    let accessToken: string;
    try {
      accessToken = await getAccessToken(fullShop, sessionToken);
    } catch (error) {
      logger.error("❌ Failed to get access token:", error as Error, {
        component: "products",
      });
      return NextResponse.json(
        {
          success: false,
          error: "Authentication failed",
          details: error instanceof Error ? error.message : "Unknown error",
          hint: "Ensure the app is properly installed and you have a valid session token",
        },
        { status: 401, headers: corsHeaders },
      );
    }

    // Get products using the obtained access token
    const { products, pageInfo } = await getProducts(
      fullShop,
      accessToken,
      query,
    );

    return NextResponse.json(
      {
        success: true,
        products,
        pageInfo: {
          hasNextPage: pageInfo.hasNextPage,
          endCursor: pageInfo.endCursor,
          total: products.length,
        },
        message: `Successfully fetched ${products.length} products`,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    logger.error("❌ Error in products API:", error as Error, {
      component: "products",
    });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch products",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: corsHeaders },
    );
  }
}
