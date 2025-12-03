import { NextRequest, NextResponse } from "next/server";
import { createShopifyOAuthState } from "@/lib/security/oauth-validation";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const shop = searchParams.get("shop");

  if (!shop) {
    return NextResponse.json(
      { error: "Shop parameter required" },
      { status: 400 },
    );
  }

  // Normalize shop domain
  const shopDomain = shop.includes(".myshopify.com")
    ? shop
    : `${shop}.myshopify.com`;

  // Use the same secure state generation as /install flow
  const secureState = createShopifyOAuthState(shopDomain);

  const scopes = process.env.SCOPES || "read_products,write_products";
  // Update callback to match the actual callback route
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/shopify/auth/callback`;

  const authUrl =
    `https://${shopDomain}/admin/oauth/authorize?` +
    `client_id=${process.env.SHOPIFY_API_KEY}&` +
    `scope=${scopes}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `state=${secureState}`;

  return NextResponse.redirect(authUrl);
}
