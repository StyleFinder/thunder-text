import { NextRequest, NextResponse } from "next/server";
import { aieEngine } from "@/lib/aie/engine";
import { AiePlatform, AieGoal, AdLengthMode } from "@/types/aie";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      productInfo,
      platform,
      goal,
      adLengthMode,
      targetAudience,
      imageUrls,
      audienceTemperature,
      productComplexity,
      productPrice,
      hasStrongStory,
      isPremiumBrand,
    } = body;

    if (!productInfo || !platform || !goal) {
      return NextResponse.json(
        { error: "Missing required fields: productInfo, platform, goal" },
        { status: 400 },
      );
    }

    // Validate enum values (basic check)
    const validPlatforms: AiePlatform[] = [
      "meta",
      "instagram",
      "google",
      "tiktok",
      "pinterest",
    ];
    const validGoals: AieGoal[] = [
      "awareness",
      "engagement",
      "conversion",
      "traffic",
      "app_installs",
    ];
    const validAdLengthModes: AdLengthMode[] = [
      "AUTO",
      "SHORT",
      "MEDIUM",
      "LONG",
    ];

    if (!validPlatforms.includes(platform as AiePlatform)) {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }

    if (!validGoals.includes(goal as AieGoal)) {
      return NextResponse.json({ error: "Invalid goal" }, { status: 400 });
    }

    // Validate adLengthMode if provided
    if (
      adLengthMode &&
      !validAdLengthModes.includes(adLengthMode as AdLengthMode)
    ) {
      return NextResponse.json(
        { error: "Invalid adLengthMode" },
        { status: 400 },
      );
    }

    // Run the AIE Engine
    const result = await aieEngine.generateAds({
      productInfo,
      platform: platform as AiePlatform,
      goal: goal as AieGoal,
      shopId: body.shopId, // Pass shopId if provided
      adLengthMode: (adLengthMode as AdLengthMode) || "AUTO", // Default to AUTO if not provided
      targetAudience: targetAudience || undefined, // Pass target audience if provided
      imageUrls: imageUrls || undefined, // Pass image URLs for vision analysis
      // Advanced ad length selection inputs
      audienceTemperature: audienceTemperature || undefined,
      productComplexity: productComplexity || undefined,
      productPrice: productPrice || undefined,
      hasStrongStory: hasStrongStory || undefined,
      isPremiumBrand: isPremiumBrand || undefined,
    });

    // Transform snake_case to camelCase for frontend compatibility
    const transformedVariants = result.variants.map(
      (v: any, index: number) => ({
        id: `variant-${Date.now()}-${index}`,
        variantNumber: v.variant_number || index + 1,
        variantType: v.variant_type,
        headline: v.headline,
        headlineAlternatives: v.headline_alternatives || [],
        primaryText: v.primary_text,
        description: v.description,
        cta: v.cta || "Shop Now",
        ctaRationale: v.cta_rationale,
        hookTechnique: v.hook_technique,
        tone: v.tone,
        selectedLength: v.selected_length,
        isSelected: v.is_selected,
        predictedScore: v.predicted_score || 0,
        scoreBreakdown: v.score_breakdown || {
          brand_fit: 0,
          context_relevance: 0,
          platform_compliance: 0,
          hook_strength: 0,
          cta_clarity: 0,
        },
        generationReasoning: v.generation_reasoning,
      }),
    );

    return NextResponse.json({
      success: true,
      data: {
        variants: transformedVariants,
        researchSummary: result.researchSummary,
      },
    });
  } catch (error: any) {
    logger.error("AIE Generation Error:", error as Error, {
      component: "generate",
    });
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
