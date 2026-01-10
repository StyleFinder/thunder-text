import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { lookupShopWithFallback } from "@/lib/shop-lookup";
import { toError } from "@/lib/api/route-config";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

/**
 * DELETE /api/settings/connections/[provider]
 *
 * Disconnects a specific integration
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const shop = searchParams.get("shop");

    if (!shop) {
      return NextResponse.json(
        { error: "Missing shop parameter" },
        { status: 400 },
      );
    }

    // Get shop ID using fallback lookup (supports standalone users)
    const {
      data: shopData,
      error: shopError,
      lookupMethod,
    } = await lookupShopWithFallback<{
      id: string;
      shop_domain: string;
    }>(supabaseAdmin, shop, "id, shop_domain", "disconnect-provider");

    if (shopError || !shopData) {
      logger.error("Shop not found for disconnect", shopError as Error, {
        component: "disconnect-provider",
        shop,
        lookupMethod,
      });
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    logger.info("Found shop for disconnect", {
      component: "disconnect-provider",
      shop,
      shopId: shopData.id,
      shopDomain: shopData.shop_domain,
      lookupMethod,
    });

    const { provider } = await params;

    // Can't disconnect Shopify through this endpoint
    if (provider === "shopify") {
      return NextResponse.json(
        { error: "Cannot disconnect Shopify through this endpoint" },
        { status: 400 },
      );
    }

    // Map display provider name to database provider name
    // 'meta' in UI maps to 'facebook' in database
    const dbProviderName = provider === "meta" ? "facebook" : provider;

    // Delete or deactivate the integration
    const { error: deleteError } = await supabaseAdmin
      .from("integrations")
      .update({ is_active: false })
      .eq("shop_id", shopData.id)
      .eq("provider", dbProviderName);

    if (deleteError) {
      logger.error(`Error disconnecting ${provider}:`, deleteError as Error, {
        component: "[provider]",
      });
      return NextResponse.json(
        { error: "Failed to disconnect integration" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `${provider} disconnected successfully`,
    });
  } catch (error) {
    const err = toError(error);
    logger.error(`Error disconnecting provider:`, err, {
      component: "[provider]",
    });
    return NextResponse.json(
      { error: "Internal Server Error", message: err.message },
      { status: 500 },
    );
  }
}
