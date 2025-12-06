import { NextRequest, NextResponse } from "next/server";
import {
  createStandaloneShopifyLinkState,
  storeOAuthState,
} from "@/lib/security/oauth-validation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/**
 * Shopify Link for Standalone Users
 *
 * This endpoint initiates the Shopify OAuth flow for standalone users
 * who want to link their account to a Shopify store they have staff access to.
 *
 * Required params:
 * - standalone_user_id: UUID of the standalone user
 * - target_shop: Shopify store domain to link to
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const standaloneUserId = searchParams.get("standalone_user_id");
  const targetShop = searchParams.get("target_shop");

  if (!standaloneUserId || !targetShop) {
    return NextResponse.json(
      { error: "standalone_user_id and target_shop parameters required" },
      { status: 400 },
    );
  }

  try {
    // Verify the standalone user exists and is valid
    const { data: standaloneUser, error: userError } = await supabaseAdmin
      .from("shops")
      .select("id, shop_domain, shop_type, email")
      .eq("id", standaloneUserId)
      .eq("shop_type", "standalone")
      .single();

    if (userError || !standaloneUser) {
      logger.error("[Shopify Link] Standalone user not found", undefined, {
        component: "shopify-link",
        standaloneUserId,
        error: userError?.message,
      });
      return NextResponse.json(
        { error: "Invalid standalone user" },
        { status: 400 },
      );
    }

    // Normalize shop domain
    const shopDomain = targetShop.includes(".myshopify.com")
      ? targetShop.toLowerCase()
      : `${targetShop.toLowerCase()}.myshopify.com`;

    // Create secure state with standalone user info
    // Use the 'email' column which contains the actual email address
    const secureState = createStandaloneShopifyLinkState({
      standalone_user_id: standaloneUser.id,
      standalone_email: standaloneUser.email,
      target_shop: shopDomain,
    });

    // Store state hash in cookie for replay attack prevention
    await storeOAuthState(secureState, "shopify_link");

    const scopes = process.env.SCOPES || "read_products,write_products";
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/shopify/callback`;

    const authUrl =
      `https://${shopDomain}/admin/oauth/authorize?` +
      `client_id=${process.env.SHOPIFY_API_KEY}&` +
      `scope=${scopes}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${secureState}`;

    logger.info("[Shopify Link] Redirecting standalone user to Shopify OAuth", {
      component: "shopify-link",
      standaloneUserId: standaloneUser.id,
      targetShop: shopDomain,
    });

    return NextResponse.redirect(authUrl);
  } catch (error) {
    logger.error("[Shopify Link] Error initiating OAuth", error as Error, {
      component: "shopify-link",
      standaloneUserId,
      targetShop,
    });
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/auth/error?error=link_failed`,
    );
  }
}
