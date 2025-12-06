import { NextRequest, NextResponse } from "next/server";
import {
  createCorsHeaders,
  handleCorsPreflightRequest,
} from "@/lib/middleware/cors";
import { logger } from "@/lib/logger";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request);
}

export async function POST(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request);

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
    // Dynamic imports to avoid loading during build
    const { aiGenerator } = await import("@/lib/openai");

    // Check for session token in Authorization header
    const authHeader = request.headers.get("authorization");
    const sessionToken = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : undefined;

    console.log("🔐 Enhance API - Auth check:", {
      hasAuthHeader: !!authHeader,
      hasSessionToken: !!sessionToken,
      userAgent: request.headers.get("user-agent"),
      referer: request.headers.get("referer"),
    });

    // Check if this is a legitimate request (from Shopify embed or our app domain)
    const userAgent = request.headers.get("user-agent") || "";
    const referer = request.headers.get("referer") || "";
    const isShopifyRequest =
      userAgent.includes("Shopify") ||
      referer.includes(".myshopify.com") ||
      referer.includes("thunder-text");
    const isZunosaiRequest =
      referer.includes("zunosai.com") || referer.includes("app.zunosai.com");

    let storeId = null;

    // For development/testing with authenticated=true flag
    const url = new URL(request.url);
    const isAuthenticatedDev =
      url.searchParams.get("authenticated") === "true" ||
      referer.includes("authenticated=true");

    // Thunder Text uses Shopify OAuth authentication, not session-based auth
    // Authentication is handled via shop parameter and access token from database
    // Also allow requests from our production domain (app.zunosai.com) for standalone users
    if (
      !isShopifyRequest &&
      !isZunosaiRequest &&
      !referer.includes("vercel.app") &&
      !isAuthenticatedDev
    ) {
      logger.error(
        "❌ Authentication required - not a valid request",
        undefined,
        {
          component: "enhance",
          referer,
          isShopifyRequest,
          isZunosaiRequest,
        },
      );
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401, headers: corsHeaders },
      );
    }

    storeId = "shopify-embedded-app";

    // Parse FormData (since we're using FormData for image uploads)
    const formData = await request.formData();

    // Extract form data
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

    console.log("📸 Processing images:", {
      existingImagesCount: existingImages.length,
      existingImages: existingImages,
      uploadedImagesCount: uploadedImages.length,
    });

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
      } else {
        console.warn("⚠️ Invalid image URL skipped:", imgUrl);
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

    // Log final processed images for debugging
    console.log("🎨 Final processed images:", {
      count: processedImages.length,
      images: processedImages.slice(0, 2), // Log first 2 URLs for debugging
    });

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
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: corsHeaders },
    );
  }
}
