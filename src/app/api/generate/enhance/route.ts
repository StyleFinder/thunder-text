import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import {
  enhancementGenerator,
  type EnhancementRequest,
} from "@/lib/openai-enhancement";
import { type EnhancementProductData } from "@/lib/shopify/product-enhancement";
import { logger } from "@/lib/logger";

/**
 * POST /api/generate/enhance
 * Generate enhanced description for existing product
 *
 * SECURITY: Requires session authentication to prevent API abuse.
 * OpenAI API calls are expensive and must be protected.
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require session authentication instead of trusting Bearer tokens
    // Bearer tokens from headers can be easily forged
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      logger.error("❌ No valid session for enhance API", undefined, {
        component: "enhance",
      });
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const {
      existingProduct,
      enhancementInputs,
      template,
      preserveElements = ["images", "price", "variants"],
      enhancementGoals = {},
    } = body;

    // Validate required inputs
    if (!existingProduct || !enhancementInputs) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: existingProduct and enhancementInputs",
        },
        { status: 400 },
      );
    }

    // Validate that the product has an existing description to enhance
    if (!existingProduct.originalDescription && !existingProduct.description) {
      return NextResponse.json(
        {
          success: false,
          error: "Product must have an existing description to enhance",
        },
        { status: 400 },
      );
    }

    // Ensure the product has the originalDescription field
    const productData: EnhancementProductData = {
      ...existingProduct,
      originalDescription:
        existingProduct.originalDescription ||
        existingProduct.description ||
        "",
      performance: existingProduct.performance || {
        lastModified: new Date().toISOString(),
        viewCount: 0,
        conversionRate: 0,
      },
      seoAnalysis: existingProduct.seoAnalysis || {
        keywordDensity: {},
        titleLength: existingProduct.title?.length || 0,
        descriptionLength: (
          existingProduct.originalDescription ||
          existingProduct.description ||
          ""
        ).length,
        missingAltTexts: 0,
      },
    };

    // Prepare the enhancement request
    const enhancementRequest: EnhancementRequest = {
      originalProduct: productData,
      enhancementInputs,
      template,
      preserveElements,
      enhancementGoals: {
        improveSeo: enhancementGoals.improveSeo ?? true,
        increaseLength: enhancementGoals.increaseLength ?? false,
        addEmotionalAppeals: enhancementGoals.addEmotionalAppeals ?? true,
        enhanceFeatures: enhancementGoals.enhanceFeatures ?? true,
        improveReadability: enhancementGoals.improveReadability ?? true,
        ...enhancementGoals,
      },
    };

    // Generate the enhanced description using OpenAI
    const enhancedContent =
      await enhancementGenerator.generateEnhancedDescription(
        enhancementRequest,
      );

    return NextResponse.json({
      success: true,
      data: {
        generatedContent: enhancedContent,
        originalProduct: productData,
        enhancementInputs,
        template: template || "default",
        timestamp: new Date().toISOString(),
        processingTime: enhancedContent.processingTime,
        tokenUsage: enhancedContent.tokenUsage,
      },
      message: "Enhanced description generated successfully",
    });
  } catch (error) {
    logger.error("❌ Error generating enhanced description:", error as Error, {
      component: "enhance",
    });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate enhanced description",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
