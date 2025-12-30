import { NextRequest, NextResponse } from "next/server";
import {
  createCorsHeaders,
  handleCorsPreflightRequest,
} from "@/lib/middleware/cors";
import { logger } from "@/lib/logger";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { startRequestTracker } from "@/lib/monitoring/api-logger";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request);
}

/**
 * POST /api/generate
 *
 * Generate product descriptions using AI
 *
 * SECURITY: Requires valid shop domain in request body and verifies shop exists in database.
 * User-Agent header is NOT trusted for authentication - it's easily spoofable.
 * Proper authentication requires shop verification against database.
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

    // SECURITY: Require shop domain in request body
    // This is the primary authentication mechanism for Shopify embedded apps
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
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("id, shopify_access_token, plan")
      .eq("shop_domain", shopDomain)
      .single();

    if (shopError || !shopData) {
      logger.warn("Generate request for unregistered shop", {
        component: "generate",
        shop: shopDomain,
      });
      return NextResponse.json(
        { error: "Shop not found. Please install the app first." },
        { status: 401, headers: corsHeaders },
      );
    }

    shopId = shopData.id;

    // SECURITY: Verify shop has a valid access token (proves active installation)
    if (!shopData.shopify_access_token) {
      logger.warn("Generate request for shop without access token", {
        component: "generate",
        shopId: shopData.id,
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
      storeId: shopData.id,
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
