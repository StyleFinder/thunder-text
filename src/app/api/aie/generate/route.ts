import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { aieEngine } from "@/lib/aie/engine";
import { AiePlatform, AieGoal, AdLengthMode } from "@/types/aie";
import { logger } from "@/lib/logger";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { canGenerateAdByDomain } from "@/lib/usage/limits";

/**
 * POST /api/aie/generate
 *
 * Generate AI-powered ad variants
 *
 * SECURITY: Requires session authentication to prevent AI abuse.
 * Usage is tracked and limited based on subscription plan.
 */
export async function POST(req: NextRequest) {
  try {
    // SECURITY: Require session authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Parse body first to get shopId for standalone users
    const body = await req.json();
    const {
      shopId: shopIdFromBody, // Shop domain sent from frontend
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

    // Get shop domain from session OR request body (for standalone users)
    const shopDomain =
      (session.user as { shopDomain?: string }).shopDomain || shopIdFromBody;
    if (!shopDomain) {
      return NextResponse.json(
        { error: "No shop associated with account" },
        { status: 403 },
      );
    }

    // Verify shop exists and get shop ID
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("id, is_active, plan")
      .eq("shop_domain", shopDomain)
      .single();

    if (shopError || !shopData) {
      logger.error("Shop not found for AIE generate:", shopError as Error, {
        component: "generate",
        shopDomain,
      });
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    if (!shopData.is_active) {
      return NextResponse.json(
        { error: "Shop is not active" },
        { status: 403 },
      );
    }

    // Check usage limits before generating
    const usageCheck = await canGenerateAdByDomain(shopDomain);
    if (!usageCheck.allowed) {
      logger.info("[AIE Generate] Usage limit reached", {
        component: "aie-generate",
        shopDomain,
        plan: usageCheck.plan,
        used: usageCheck.used,
        limit: usageCheck.limit,
      });
      return NextResponse.json(
        {
          error: usageCheck.error || "Monthly ad limit reached",
          usage: {
            current: usageCheck.used,
            limit: usageCheck.limit,
            remaining: usageCheck.remaining,
            plan: usageCheck.plan,
          },
        },
        { status: 403 },
      );
    }

    // Use session-derived shop ID
    const shopId = shopData.id;

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

    // Run the AIE Engine with session-derived shopId
    const result = await aieEngine.generateAds({
      productInfo,
      platform: platform as AiePlatform,
      goal: goal as AieGoal,
      shopId, // SECURITY: Use session-derived shopId
      adLengthMode: (adLengthMode as AdLengthMode) || "AUTO",
      targetAudience: targetAudience || undefined,
      imageUrls: imageUrls || undefined,
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
