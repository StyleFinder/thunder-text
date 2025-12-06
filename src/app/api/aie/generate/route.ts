import { NextRequest, NextResponse } from 'next/server';
import { aieEngine } from '@/lib/aie/engine';
import { AiePlatform, AieGoal, AdLengthMode } from '@/types/aie';
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productInfo, platform, goal, adLengthMode } = body;

    if (!productInfo || !platform || !goal) {
      return NextResponse.json(
        { error: 'Missing required fields: productInfo, platform, goal' },
        { status: 400 }
      );
    }

    // Validate enum values (basic check)
    const validPlatforms: AiePlatform[] = ['meta', 'instagram', 'google', 'tiktok', 'pinterest'];
    const validGoals: AieGoal[] = ['awareness', 'engagement', 'conversion', 'traffic', 'app_installs'];
    const validAdLengthModes: AdLengthMode[] = ['AUTO', 'SHORT', 'MEDIUM', 'LONG'];

    if (!validPlatforms.includes(platform as AiePlatform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }

    if (!validGoals.includes(goal as AieGoal)) {
      return NextResponse.json({ error: 'Invalid goal' }, { status: 400 });
    }

    // Validate adLengthMode if provided
    if (adLengthMode && !validAdLengthModes.includes(adLengthMode as AdLengthMode)) {
      return NextResponse.json({ error: 'Invalid adLengthMode' }, { status: 400 });
    }

    // Run the AIE Engine
    const result = await aieEngine.generateAds({
      productInfo,
      platform: platform as AiePlatform,
      goal: goal as AieGoal,
      shopId: body.shopId, // Pass shopId if provided
      adLengthMode: adLengthMode as AdLengthMode || 'AUTO' // Default to AUTO if not provided
    });

    // Transform snake_case to camelCase for frontend compatibility
    const transformedVariants = result.variants.map((v: any, index: number) => ({
      id: `variant-${Date.now()}-${index}`,
      variantType: v.variant_type,
      headline: v.headline,
      primaryText: v.primary_text,
      description: v.description,
      callToAction: v.call_to_action || 'Shop Now',
      selectedLength: v.selected_length,
      isSelected: v.is_selected,
      predictedScore: v.predicted_score,
      scoreBreakdown: v.score_breakdown,
      headlineAlternatives: v.headline_alternatives || [],
    }));

    return NextResponse.json({
      success: true,
      data: {
        variants: transformedVariants,
        researchSummary: result.researchSummary
      }
    });

  } catch (error: any) {
    logger.error('AIE Generation Error:', error as Error, { component: 'generate' });
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
