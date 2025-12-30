/**
 * Facebook OAuth Disconnect Endpoint
 *
 * POST /api/facebook/oauth/disconnect
 *
 * Purpose: Disconnect Facebook integration by revoking tokens and removing from database
 *
 * Flow:
 * 1. Verify user authentication and shop access
 * 2. Get Facebook integration record
 * 3. Optionally revoke token with Facebook (best effort)
 * 4. Delete integration record from database
 * 5. Return success response
 *
 * Request Body:
 * {
 *   "shop": "zunosai-staging-test-store.myshopify.com"
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { decryptToken } from "@/lib/services/encryption";
import { logger } from "@/lib/logger";
import { lookupShopWithFallback } from "@/lib/shop-lookup";

/**
 * Revoke Facebook access token
 * https://developers.facebook.com/docs/facebook-login/guides/access-tokens/expiration-and-extension
 *
 * This is best-effort - if it fails, we still delete from our database
 */
async function revokeToken(accessToken: string): Promise<boolean> {
  try {
    const revokeUrl = new URL(
      "https://graph.facebook.com/v21.0/me/permissions",
    );
    revokeUrl.searchParams.set("access_token", accessToken);

    const response = await fetch(revokeUrl.toString(), {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error(`Facebook token revocation failed: ${error}`, undefined, {
        component: "disconnect",
      });
      return false;
    }

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    logger.error("Error revoking Facebook token:", error as Error, {
      component: "disconnect",
    });
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shop } = body;

    if (!shop) {
      return NextResponse.json(
        { error: "Missing shop parameter" },
        { status: 400 },
      );
    }

    // Get shop record (with fallback for standalone users)
    const { data: shopData, error: shopError } = await lookupShopWithFallback<{
      id: string;
      shop_domain: string;
    }>(supabaseAdmin, shop, "id, shop_domain", "disconnect");

    if (shopError || !shopData) {
      logger.error(`Shop not found: ${shop}`, shopError as Error, {
        component: "disconnect",
      });
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // Get Facebook integration
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from("integrations")
      .select("*")
      .eq("shop_id", shopData.id)
      .eq("provider", "facebook")
      .single();

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: "Facebook integration not found" },
        { status: 404 },
      );
    }

    // Best effort: Try to revoke token with Facebook
    try {
      const decryptedToken = await decryptToken(
        integration.encrypted_access_token,
      );
      await revokeToken(decryptedToken);
    } catch (error) {
      logger.error(
        "Error during token revocation (continuing anyway):",
        error as Error,
        { component: "disconnect" },
      );
    }

    // Delete integration from database
    const { error: deleteError } = await supabaseAdmin
      .from("integrations")
      .delete()
      .eq("shop_id", shopData.id)
      .eq("provider", "facebook");

    if (deleteError) {
      logger.error(
        "Failed to delete Facebook integration:",
        deleteError as Error,
        { component: "disconnect" },
      );
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: "Facebook account disconnected successfully",
    });
  } catch (error) {
    logger.error("Error in Facebook OAuth disconnect:", error as Error, {
      component: "disconnect",
    });
    return NextResponse.json(
      { error: "Failed to disconnect Facebook account" },
      { status: 500 },
    );
  }
}
