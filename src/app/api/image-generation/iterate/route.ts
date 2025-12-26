import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { generateImage } from '@/lib/services/image-generation-client';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { ImageProvider, AspectRatio, ImageQuality } from '@/types/image-generation';
import { CREDIT_LIMITS } from '@/types/image-generation';

/**
 * POST /api/image-generation/iterate
 *
 * Iterate on a previously generated image with feedback.
 * Uses the previous image as a reference for refinement.
 *
 * SECURITY: Requires session authentication. Shop ID is derived from session.
 *
 * Request body:
 * - conversationId: string (required) - Conversation ID from previous generation
 * - previousImageUrl: string (required) - Base64 URL of previous image
 * - feedback: string (required) - Refinement instructions
 * - provider: 'openai' (optional) - Provider for this iteration
 * - aspectRatio: string (optional) - Image aspect ratio
 * - quality: string (optional) - Image quality level
 */
export async function POST(req: NextRequest) {
  try {
    // SECURITY: Require session authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get shop domain from session
    const shopDomain = (session.user as { shopDomain?: string }).shopDomain;
    if (!shopDomain) {
      return NextResponse.json({ error: 'No shop associated with account' }, { status: 403 });
    }

    // Verify shop exists and get shop data
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('id, is_active, plan')
      .eq('shop_domain', shopDomain)
      .single();

    if (shopError || !shopData) {
      logger.error('Shop not found for image iteration:', shopError as Error, {
        component: 'image-generation-iterate',
        shopDomain,
      });
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    if (!shopData.is_active) {
      return NextResponse.json({ error: 'Shop is not active' }, { status: 403 });
    }

    const shopId = shopData.id;
    const plan = shopData.plan || 'starter';

    // Check usage limits
    const usageCheck = await checkUsageLimits(shopId, plan);
    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Monthly image generation limit reached',
          details: {
            used: usageCheck.used,
            limit: usageCheck.limit,
            remaining: 0,
          },
        },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await req.json();
    const {
      conversationId,
      previousImageUrl,
      feedback,
      provider = 'openai', // Default to OpenAI for iterations
      aspectRatio = '1:1',
      quality = 'standard',
    } = body;

    // Validate required fields
    if (!conversationId || typeof conversationId !== 'string') {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    if (!previousImageUrl || typeof previousImageUrl !== 'string') {
      return NextResponse.json({ error: 'Previous image URL is required' }, { status: 400 });
    }

    if (!feedback || typeof feedback !== 'string' || feedback.trim().length === 0) {
      return NextResponse.json({ error: 'Feedback is required' }, { status: 400 });
    }

    if (provider !== 'openai') {
      return NextResponse.json(
        { error: 'Valid provider (openai) is required' },
        { status: 400 }
      );
    }

    // Validate feedback length
    if (feedback.length > 2000) {
      return NextResponse.json(
        { error: 'Feedback exceeds maximum length of 2000 characters' },
        { status: 400 }
      );
    }

    logger.info('Starting image iteration request', {
      component: 'image-generation-iterate',
      shopId,
      conversationId,
      provider,
      feedbackLength: feedback.length,
    });

    // Build the iteration prompt
    // Combine the feedback with context about iteration
    const iterationPrompt = `Based on the provided image, make these changes: ${feedback}.
Maintain the overall style and composition while applying the requested modifications.`;

    // Generate iterated image using the previous image as reference
    const result = await generateImage(iterationPrompt, previousImageUrl, {
      provider: provider as ImageProvider,
      aspectRatio: aspectRatio as AspectRatio,
      quality: quality as ImageQuality,
      shopId,
      conversationId,
    });

    // Record usage
    await recordUsage(shopId, result.costCents, result.provider, result.model);

    // Return result with usage info
    return NextResponse.json({
      ...result,
      isIteration: true,
      usage: {
        used: usageCheck.used + 1,
        limit: usageCheck.limit,
        remaining: usageCheck.limit - usageCheck.used - 1,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Image iteration error:', error as Error, {
      component: 'image-generation-iterate',
    });

    // Check for specific error types
    if (errorMessage.includes('circuit breaker')) {
      return NextResponse.json(
        { error: 'Service temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    if (errorMessage.includes('content policy') || errorMessage.includes('safety')) {
      return NextResponse.json(
        { error: 'Your feedback was flagged by content safety filters. Please revise and try again.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: errorMessage || 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * Check if shop has remaining usage credits
 */
async function checkUsageLimits(
  shopId: string,
  plan: string
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const limit = CREDIT_LIMITS[plan] || CREDIT_LIMITS.starter;

  // Get current month's usage
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count, error } = await supabaseAdmin
    .from('generated_images')
    .select('id', { count: 'exact', head: true })
    .eq('shop_id', shopId)
    .gte('created_at', startOfMonth.toISOString());

  if (error) {
    logger.error('Error checking usage limits:', error as Error, {
      component: 'image-generation-iterate',
      shopId,
    });
    // Allow on error to avoid blocking users
    return { allowed: true, used: 0, limit };
  }

  const used = count || 0;
  return {
    allowed: used < limit,
    used,
    limit,
  };
}

/**
 * Record image generation usage
 */
async function recordUsage(
  shopId: string,
  costCents: number,
  provider: string,
  model: string
): Promise<void> {
  try {
    await supabaseAdmin.from('image_generation_usage').insert({
      shop_id: shopId,
      cost_cents: costCents,
      provider,
      model,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error recording usage:', error as Error, {
      component: 'image-generation-iterate',
      shopId,
    });
  }
}
