import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

// Initialize Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase configuration");
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * GET /api/shopify/check-token
 *
 * Checks if a shop has a stored access token in the database.
 * Used by the client to determine if non-embedded access is allowed.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get("shop");

    if (!shop) {
      return NextResponse.json(
        { error: "Missing shop parameter", hasToken: false },
        { status: 400 },
      );
    }

    // Normalize shop domain
    const fullShopDomain = shop.includes(".myshopify.com")
      ? shop
      : `${shop}.myshopify.com`;

    const supabase = getSupabaseClient();

    // Check if shop has a stored access token
    const { data: shopData, error } = await supabase
      .from("shops")
      .select("shopify_access_token, shopify_access_token_legacy")
      .eq("shop_domain", fullShopDomain)
      .single();

    if (error) {
      // Shop not found is not an error, just means no token
      if (error.code === "PGRST116") {
        logger.info("Shop not found in database", {
          component: "check-token",
          shop: fullShopDomain,
        });
        return NextResponse.json({ hasToken: false });
      }

      logger.error("Database error checking shop token", error, {
        component: "check-token",
        shop: fullShopDomain,
      });
      return NextResponse.json(
        { error: "Database error", hasToken: false },
        { status: 500 },
      );
    }

    const hasToken = !!(
      shopData?.shopify_access_token || shopData?.shopify_access_token_legacy
    );

    logger.info("Token check completed", {
      component: "check-token",
      shop: fullShopDomain,
      hasToken,
    });

    return NextResponse.json({ hasToken });
  } catch (error) {
    logger.error("Error checking shop token", error as Error, {
      component: "check-token",
    });
    return NextResponse.json(
      { error: "Internal server error", hasToken: false },
      { status: 500 },
    );
  }
}
