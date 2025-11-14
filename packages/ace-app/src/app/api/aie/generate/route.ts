/**
 * AIE Ad Generation API Route
 * POST /api/aie/generate
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApp } from '@thunder-text/shared-backend';
import { generateAds, type GenerateAdsParams } from '@/lib/aie';
import { isValidPlatform, isValidGoal } from '@/lib/aie/utils';
import {
  ensureBestPracticeEmbeddings,
  checkEmbeddingsAvailable,
} from '@/lib/aie/embedding-manager';
import { withRateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit';

// Track if embeddings have been checked this session
let embeddingsChecked = false;

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require ACE app subscription
    const claims = await requireApp('ace')(request);
    if (claims instanceof NextResponse) return claims;

    const body = await request.json();

    // SECURITY: Rate limit AI generation - expensive operation
    const rateLimitUserId = body.userId || body.shopId || 'anonymous';
    const rateLimitResponse = await withRateLimit(RATE_LIMITS.GENERATION)(request, rateLimitUserId);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // First-time check: ensure best practices have embeddings
    if (!embeddingsChecked) {
      console.log('🔍 First AIE request - checking embeddings...');
      const available = await checkEmbeddingsAvailable();

      if (!available) {
        console.log('⚡ No embeddings found - generating now...');
        await ensureBestPracticeEmbeddings();
      } else {
        console.log('✅ Embeddings already available');
      }

      embeddingsChecked = true;
    }

    // Validate required fields
    const {
      shopId,
      userId,
      productId,
      platform,
      goal,
      format,
      description,
      imageUrl,
      imageUrls, // New: array of image URLs for multi-image/carousel ads
      brandVoice,
      targetAudience,
      budgetRange,
      productMetadata, // New: array of product metadata for collection ads
      isCollectionAd, // New: flag indicating multi-product ad
    } = body;

    // Validation
    if (!shopId) {
      return NextResponse.json(
        { error: 'shopId is required' },
        { status: 400 }
      );
    }

    if (!platform || !isValidPlatform(platform)) {
      return NextResponse.json(
        {
          error: 'Invalid platform. Must be one of: meta, instagram, google, tiktok, pinterest',
        },
        { status: 400 }
      );
    }

    if (!goal || !isValidGoal(goal)) {
      return NextResponse.json(
        {
          error: 'Invalid goal. Must be one of: awareness, engagement, conversion, traffic, app_installs',
        },
        { status: 400 }
      );
    }

    if (!description || description.trim().length === 0) {
      return NextResponse.json(
        { error: 'description is required and cannot be empty' },
        { status: 400 }
      );
    }

    if (description.length > 1000) {
      return NextResponse.json(
        { error: 'description must be under 1000 characters' },
        { status: 400 }
      );
    }

    // Build params - use first image from imageUrls if available, fallback to imageUrl
    const finalImageUrl = imageUrls && imageUrls.length > 0 ? imageUrls[0] : imageUrl;

    const params: GenerateAdsParams = {
      shopId,
      userId,
      productId,
      platform,
      goal,
      format,
      description,
      imageUrl: finalImageUrl,
      brandVoice,
      targetAudience,
      budgetRange,
    };

    console.log(`📥 AIE generation request: ${platform}/${goal} for shop ${shopId}${isCollectionAd ? ' (collection ad)' : ''}`);

    // Log additional context for multi-product/multi-image ads
    if (productMetadata && productMetadata.length > 1) {
      console.log(`   📦 Collection: ${productMetadata.length} products`);
    }
    if (imageUrls && imageUrls.length > 1) {
      console.log(`   🖼️  Carousel: ${imageUrls.length} images`);
    }

    // Generate ads
    const result = await generateAds(params);

    console.log(
      `✅ AIE generation complete: ${result.variants.length} variants, ${result.generationTimeMs}ms`
    );

    // Return result
    return NextResponse.json({
      success: true,
      data: {
        adRequestId: result.adRequestId,
        variants: result.variants.map((v) => ({
          id: v.id,
          variantNumber: v.variant_number,
          variantType: v.variant_type,
          headline: v.headline,
          headlineAlternatives: v.headline_alternatives,
          primaryText: v.primary_text,
          description: v.description,
          cta: v.cta,
          ctaRationale: v.cta_rationale,
          hookTechnique: v.hook_technique,
          tone: v.tone,
          predictedScore: v.predicted_score,
          scoreBreakdown: v.score_breakdown,
          generationReasoning: v.generation_reasoning,
        })),
        imageAnalysis: result.imageAnalysis,
        metadata: {
          generationTimeMs: result.generationTimeMs,
          aiCost: result.aiCost,
        },
      },
    });
  } catch (error) {
    console.error('❌ AIE generation error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Ad generation failed',
          type: error?.constructor.name || 'Error',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/aie/generate?requestId=xxx
 * Retrieve a completed ad generation request
 */
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Require ACE app subscription
    const claims = await requireApp('ace')(request);
    if (claims instanceof NextResponse) return claims;

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');

    if (!requestId) {
      return NextResponse.json(
        { error: 'requestId query parameter is required' },
        { status: 400 }
      );
    }

    const { getAdRequest } = await import('@/lib/aie');
    const adRequest = await getAdRequest(requestId);

    return NextResponse.json({
      success: true,
      data: {
        request: {
          id: adRequest.id,
          shopId: adRequest.shop_id,
          platform: adRequest.platform,
          goal: adRequest.goal,
          description: adRequest.description,
          status: adRequest.status,
          createdAt: adRequest.created_at,
          generationTimeMs: adRequest.generation_time_ms,
          aiCost: adRequest.ai_cost,
        },
        variants: adRequest.variants.map((v) => ({
          id: v.id,
          variantNumber: v.variant_number,
          variantType: v.variant_type,
          headline: v.headline,
          headlineAlternatives: v.headline_alternatives,
          primaryText: v.primary_text,
          description: v.description,
          cta: v.cta,
          predictedScore: v.predicted_score,
          scoreBreakdown: v.score_breakdown,
          isSelected: v.is_selected,
          publishedAt: v.published_at,
        })),
      },
    });
  } catch (error) {
    console.error('❌ Error fetching ad request:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          message:
            error instanceof Error ? error.message : 'Failed to fetch ad request',
        },
      },
      { status: 500 }
    );
  }
}
