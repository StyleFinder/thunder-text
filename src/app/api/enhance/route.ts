import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
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
 * POST /api/enhance
 *
 * Enhance product descriptions using AI
 *
 * SECURITY: Supports two authentication methods:
 * 1. NextAuth session (for email/password users)
 * 2. Shopify shop domain from form data (for embedded app access)
 */
export async function POST(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request);
  const tracker = startRequestTracker();
  let shopId: string | null = null;

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

  try {
    // Parse FormData first to extract shop domain for embedded auth
    const formData = await request.formData();
    const shopParam = formData.get("shop") as string | null;

    // First try NextAuth session
    const session = await getServerSession(authOptions);
    let shopDomain: string | null = null;

    if (session?.user) {
      shopDomain = (session.user as { shopDomain?: string }).shopDomain || null;
    }

    // Fall back to shop param from form data (for embedded Shopify access)
    if (!shopDomain && shopParam) {
      // Normalize shop domain
      shopDomain = shopParam.includes(".myshopify.com")
        ? shopParam
        : `${shopParam}.myshopify.com`;
    }

    if (!shopDomain) {
      return NextResponse.json(
        {
          error: "Authentication required",
          details: "Please sign in or provide shop parameter",
        },
        { status: 401, headers: corsHeaders },
      );
    }

    // Verify shop exists and get shop ID from database
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("id, is_active, shopify_access_token")
      .eq("shop_domain", shopDomain)
      .single();

    if (shopError || !shopData) {
      logger.error("Shop not found for enhance:", shopError as Error, {
        component: "enhance",
        shopDomain,
      });
      return NextResponse.json(
        { error: "Shop not found" },
        { status: 404, headers: corsHeaders },
      );
    }

    // For embedded access (no session), verify shop has app installed
    if (!session?.user && !shopData.shopify_access_token) {
      logger.warn("Shop found but no access token - app may not be installed", {
        component: "enhance",
        shopDomain,
      });
      return NextResponse.json(
        { error: "App not installed for this shop" },
        { status: 403, headers: corsHeaders },
      );
    }

    if (!shopData.is_active) {
      return NextResponse.json(
        { error: "Shop is not active" },
        { status: 403, headers: corsHeaders },
      );
    }

    // Use database-derived shop ID
    const storeId = shopData.id;
    shopId = storeId;

    // Dynamic imports to avoid loading during build
    const { aiGenerator } = await import("@/lib/openai");

    // Extract form data (formData already parsed above for authentication)
    const productId = formData.get("productId") as string;
    // shop is available in formData but not needed here - storeId is hardcoded for embedded app context
    const template = formData.get("template") as string;
    const parentCategory = formData.get("parentCategory") as string;
    const availableSizing = formData.get("availableSizing") as string;
    const fabricMaterial = formData.get("fabricMaterial") as string;
    const occasionUse = formData.get("occasionUse") as string;
    const targetAudience = formData.get("targetAudience") as string;
    const keyFeatures = formData.get("keyFeatures") as string;
    const additionalNotes = formData.get("additionalNotes") as string;
    const enhancementOptions = JSON.parse(
      (formData.get("enhancementOptions") as string) || "{}",
    );

    // Extract images - both existing URLs and new uploads
    const existingImages = formData
      .getAll("existingImages")
      .map((img) => String(img))
      .filter((img) => img && img.length > 0);
    const uploadedImages = formData.getAll("images") as File[];

    // Process uploaded images if any
    const processedImages = [];

    // Add existing images (validate URLs first)
    for (const imgUrl of existingImages) {
      if (
        imgUrl &&
        imgUrl.length > 0 &&
        (imgUrl.startsWith("http") || imgUrl.startsWith("data:"))
      ) {
        processedImages.push(imgUrl);
      }
    }

    // Process new uploads (in a real app, you'd upload these to storage first)
    for (const file of uploadedImages) {
      if (file && file.size > 0) {
        // In production, upload to storage and get URL
        // For now, we'll convert to base64 for the AI
        const buffer = await file.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const dataUri = `data:${file.type};base64,${base64}`;
        processedImages.push(dataUri);
      }
    }

    // Ensure we have valid images for AI processing
    const imagesToProcess =
      processedImages.length > 0
        ? processedImages
        : ["https://via.placeholder.com/400x400/cccccc/969696?text=No+Image"];

    // Generate enhanced description using AI with enhancement-specific method
    const enhancedContent = await aiGenerator.enhanceProductDescription({
      productId,
      images: imagesToProcess,
      template: template || "general",
      productDetails: {
        parentCategory: parentCategory || "general",
        availableSizing: availableSizing || "",
        fabricMaterial: fabricMaterial || "",
        occasionUse: occasionUse || "",
        targetAudience: targetAudience || "",
        keyFeatures: keyFeatures || "",
        additionalNotes: additionalNotes || "",
      },
      enhancementOptions,
      storeId,
    });

    // Transform the response to match enhancement format
    const formattedContent = {
      title: enhancementOptions.generateTitle
        ? enhancedContent.title
        : undefined,
      description: enhancementOptions.enhanceDescription
        ? enhancedContent.description
        : undefined,
      seoTitle: enhancementOptions.generateSEO
        ? enhancedContent.seoTitle
        : undefined,
      seoDescription: enhancementOptions.generateSEO
        ? enhancedContent.seoDescription
        : undefined,
      promoText: enhancementOptions.createPromo
        ? enhancedContent.promoText
        : undefined,
      bulletPoints: enhancedContent.bulletPoints || [],
      confidence: enhancedContent.confidence,
      tokenUsage: enhancedContent.tokenUsage,
      processingTime: enhancedContent.processingTime,
    };

    // Log successful API request
    await tracker.log({
      shopId,
      operationType: 'product_description',
      endpoint: '/api/enhance',
      model: 'gpt-4o-mini',
      inputTokens: enhancedContent.tokenUsage?.prompt || 0,
      outputTokens: enhancedContent.tokenUsage?.completion || 0,
      status: 'success',
      metadata: {
        template,
        category: parentCategory,
        imageCount: imagesToProcess.length,
        enhancementOptions,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: formattedContent,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    logger.error("Enhancement API error:", error as Error, {
      component: "enhance",
    });

    // Log failed API request
    await tracker.logError({
      shopId,
      operationType: 'product_description',
      endpoint: '/api/enhance',
      model: 'gpt-4o-mini',
      errorType: 'api_error',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: corsHeaders },
    );
  }
}
