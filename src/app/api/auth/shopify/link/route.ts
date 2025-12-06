import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createStandaloneShopifyLinkState } from "@/lib/security/oauth-validation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

// Maximum age of state parameter (10 minutes)
const MAX_STATE_AGE_MS = 10 * 60 * 1000;
const OAUTH_STATE_COOKIE_PREFIX = "oauth_state_";

function getStateHash(state: string): string {
  return createHash("sha256").update(state).digest("hex").substring(0, 16);
}

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

    // Create redirect response and set cookie directly on it
    // This ensures the cookie is included in the redirect response
    const response = NextResponse.redirect(authUrl);
    const cookieName = `${OAUTH_STATE_COOKIE_PREFIX}shopify_link`;
    const stateHash = getStateHash(secureState);

    response.cookies.set(cookieName, stateHash, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: MAX_STATE_AGE_MS / 1000,
      path: "/",
    });

    logger.info("[Shopify Link] Set OAuth state cookie", {
      component: "shopify-link",
      cookieName,
      stateHashPrefix: stateHash.substring(0, 8),
    });

    return response;
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
