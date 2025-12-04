import { NextRequest, NextResponse } from "next/server";
import { validateShopifyOAuthState } from "@/lib/security/oauth-validation";
import { ZodError } from "zod";
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  // Check if we're in a build environment without proper configuration
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co"
  ) {
    return NextResponse.json(
      { error: "Application not properly configured" },
      { status: 503 },
    );
  }

  try {
    // Dynamic imports to avoid loading during build
    const { exchangeCodeForToken } = await import("@/lib/shopify");
    const { supabaseAdmin } = await import("@/lib/supabase");
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const shop = searchParams.get("shop");
    const state = searchParams.get("state");

    if (!code || !shop || !state) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 },
      );
    }

    // Validate state parameter with Zod schema
    // This validates structure, timestamp, nonce, and prevents tampering/replay attacks
    try {
      validateShopifyOAuthState(state, shop);
    } catch (error) {
      if (error instanceof ZodError) {
        logger.error(`Shopify OAuth state validation failed: ${JSON.stringify(error.errors)}`, error, { component: 'callback' });
        return NextResponse.json(
          { error: "Invalid state parameter format", details: error.errors },
          { status: 400 },
        );
      }
      logger.error("Shopify OAuth state validation error:", error as Error, { component: 'callback' });
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Invalid state parameter",
        },
        { status: 400 },
      );
    }

    // Exchange the authorization code for an access token
    const tokenData = await exchangeCodeForToken(shop, code);

    if (!tokenData.access_token) {
      return NextResponse.json(
        { error: "Failed to obtain access token" },
        { status: 400 },
      );
    }

    // Store the shop information in Supabase
    // IMPORTANT: Use 'shops' table to match token-manager.ts expectations
    const fullShopDomain = shop.includes(".myshopify.com")
      ? shop
      : `${shop}.myshopify.com`;

    const { data: shopData, error: storeError } = await supabaseAdmin
      .from("shops")
      .upsert(
        {
          shop_domain: fullShopDomain,
          access_token: tokenData.access_token,
          scope: tokenData.scope || "",
          is_active: true,
          installed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "shop_domain",
        },
      )
      .select()
      .single();

    if (storeError || !shopData) {
      logger.error("Failed to store shop data:", storeError as Error, { component: 'callback' });
      return NextResponse.json(
        { error: "Failed to store shop information" },
        { status: 500 },
      );
    }

    // Initialize default prompts and templates for new installations
    try {
      const { initializeDefaultPrompts } = await import("@/lib/prompts");
      await initializeDefaultPrompts(shopData.id);
    } catch (promptError) {
      logger.error("Failed to initialize default prompts:", promptError as Error, { component: 'callback' });
      // Don't fail the whole installation if prompts fail - they can be initialized later
    }

    // Redirect to the app with success
    return NextResponse.redirect(
      new URL(`/dashboard?shop=${shop}&authenticated=true`, request.url),
    );
  } catch (error) {
    logger.error("OAuth callback error:", error as Error, { component: 'callback' });
    return NextResponse.json(
      { error: "OAuth callback failed" },
      { status: 500 },
    );
  }
}
