import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  createCorsHeaders,
  handleCorsPreflightRequest,
} from "@/lib/middleware/cors";
import { logger } from "@/lib/logger";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { startRequestTracker } from "@/lib/monitoring/api-logger";
import { authOptions } from "@/lib/auth/auth-options";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request);
}

/**
 * POST /api/generate
 *
 * Generate product descriptions using AI
 *
 * SECURITY H3: Supports two authentication modes:
 * 1. Session-based: User is logged in with a session (shopId from session)
 * 2. Shopify embedded: Request from Shopify admin iframe (shop domain verified)
 *
 * Session takes priority - if logged in, user can only generate for their own shop.
 */
export async function POST(request: NextRequest) {
  // Use secure CORS headers that restrict to Shopify domains
  const corsHeaders = createCorsHeaders(request);
  const tracker = startRequestTracker();

  // Check if we're in a build environment without proper configuration
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co"
  ) {
    return NextResponse.json(
      { error: "Application not properly configured" },
      { status: 503, headers: corsHeaders },
    );
  }

  let shopId: string | null = null;
  let shopData: { id: string; shopify_access_token: string | null; plan: string | null } | null = null;

  try {
    const body = await request.json();
    const {
      shop,
      images,
      productTitle,
      category,
      brandVoice,
      targetLength,
      keywords,
    } = body;

    // SECURITY H3: Check for authenticated session first
    const session = await getServerSession(authOptions);

    if (session?.user?.shopId) {
      // Session-based authentication: User is logged in
      // They can ONLY generate content for their own shop
      const { data: sessionShopData, error: sessionShopError } = await supabaseAdmin
        .from("shops")
        .select("id, shopify_access_token, plan, shop_domain")
        .eq("id", session.user.shopId)
        .single();

      if (sessionShopError || !sessionShopData) {
        logger.warn("Generate request from session with invalid shop", {
          component: "generate",
          sessionShopId: session.user.shopId,
        });
        return NextResponse.json(
          { error: "Shop not found. Please log in again." },
          { status: 401, headers: corsHeaders },
        );
      }

      // SECURITY H3: If shop domain provided in body, verify it matches session
      if (shop) {
        let requestedDomain = shop;
        if (!requestedDomain.includes(".myshopify.com")) {
          requestedDomain = `${requestedDomain}.myshopify.com`;
        }
        if (sessionShopData.shop_domain && requestedDomain !== sessionShopData.shop_domain) {
          logger.warn("Generate request shop domain mismatch", {
            component: "generate",
            sessionShopId: session.user.shopId,
            sessionDomain: sessionShopData.shop_domain,
            requestedDomain,
          });
          return NextResponse.json(
            { error: "Unauthorized: Cannot generate for a different shop" },
            { status: 403, headers: corsHeaders },
          );
        }
      }

      shopId = sessionShopData.id;
      shopData = sessionShopData;

      logger.info("Generate request authenticated via session", {
        component: "generate",
        shopId,
        userId: session.user.id,
      });
    } else {
      // Shopify embedded app mode: No session, verify shop domain from body
      // SECURITY: Require shop domain in request body
      if (!shop) {
        return NextResponse.json(
          { error: "Shop domain is required" },
          { status: 400, headers: corsHeaders },
        );
      }

      // Normalize shop domain
      let shopDomain = shop;
      if (!shopDomain.includes(".myshopify.com")) {
        shopDomain = `${shopDomain}.myshopify.com`;
      }

      // SECURITY: Verify shop exists in database (proves they went through OAuth)
      // This prevents arbitrary requests with fake shop domains
      const { data: embedShopData, error: shopError } = await supabaseAdmin
        .from("shops")
        .select("id, shopify_access_token, plan")
        .eq("shop_domain", shopDomain)
        .single();

      if (shopError || !embedShopData) {
        logger.warn("Generate request for unregistered shop", {
          component: "generate",
          shop: shopDomain,
        });
        return NextResponse.json(
          { error: "Shop not found. Please install the app first." },
          { status: 401, headers: corsHeaders },
        );
      }

      shopId = embedShopData.id;
      shopData = embedShopData;
    }

    // SECURITY: Verify shop has a valid access token (proves active installation)
    if (!shopData?.shopify_access_token) {
      logger.warn("Generate request for shop without access token", {
        component: "generate",
        shopId,
      });
      return NextResponse.json(
        { error: "Shop installation incomplete. Please reinstall the app." },
        { status: 401, headers: corsHeaders },
      );
    }

    // Dynamic imports to avoid loading during build
    const { aiGenerator } = await import("@/lib/openai");

    // Generate product description
    const result = await aiGenerator.generateProductDescription({
      images: images || [],
      productTitle,
      category,
      brandVoice,
      targetLength,
      keywords,
      storeId: shopId!,
    });

    // Log successful API request
    await tracker.log({
      shopId,
      operationType: 'product_description',
      endpoint: '/api/generate',
      model: 'gpt-4o-mini',
      inputTokens: result.tokenUsage.prompt,
      outputTokens: result.tokenUsage.completion,
      status: 'success',
      metadata: {
        category,
        targetLength,
        imageCount: images?.length || 0,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    logger.error("Generation API error:", error as Error, {
      component: "generate",
    });

    // Log failed API request
    await tracker.logError({
      shopId,
      operationType: 'product_description',
      endpoint: '/api/generate',
      model: 'gpt-4o-mini',
      errorType: 'api_error',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders },
    );
  }
}
