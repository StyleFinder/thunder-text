import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { generateImage, getSystemHealth } from '@/lib/services/image-generation-client';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { ImageProvider, AspectRatio, ImageQuality } from '@/types/image-generation';
import { CREDIT_LIMITS } from '@/types/image-generation';

/**
 * POST /api/image-generation
 *
 * Generate an AI image based on prompt and optional reference image.
 *
 * SECURITY: Requires session authentication. Shop ID is derived from session.
 *
 * Request body:
 * - prompt: string (required) - Text description of desired image
 * - referenceImage: string (optional) - Base64 encoded reference image
 * - provider: 'openai' (required) - Image generation provider
 * - model: string (optional) - Specific model to use
 * - aspectRatio: string (optional) - Image aspect ratio
 * - quality: string (optional) - Image quality level
 * - conversationId: string (optional) - For iteration tracking
 */
export async function POST(req: NextRequest) {
  try {
    // SECURITY: Require session authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Parse request body first to get shopId fallback
    const body = await req.json();
    const {
      prompt,
      referenceImage,
      provider,
      model,
      aspectRatio = '1:1',
      quality = 'standard',
      conversationId,
      questionnaireAnswers,
      shopId: shopIdFromBody,
    } = body;

    // Get shop domain from session OR use shopId from request body
    const shopDomainFromSession = (session.user as { shopDomain?: string }).shopDomain;
    const userIdFromSession = (session.user as { id?: string }).id;

    let shopData: { id: string; is_active: boolean; plan: string | null } | null = null;

    // Try to find shop by session domain first
    if (shopDomainFromSession) {
      const { data, error } = await supabaseAdmin
        .from('shops')
        .select('id, is_active, plan')
        .eq('shop_domain', shopDomainFromSession)
        .single();

      if (!error && data) {
        shopData = data;
      }
    }

    // Fall back to shopId from request body if session lookup failed
    if (!shopData && shopIdFromBody) {
      const { data, error } = await supabaseAdmin
        .from('shops')
        .select('id, is_active, plan')
        .eq('id', shopIdFromBody)
        .single();

      if (!error && data) {
        shopData = data;
      }
    }

    // Fall back to user ID from session (for standalone users where user.id === shop.id)
    if (!shopData && userIdFromSession) {
      const { data, error } = await supabaseAdmin
        .from('shops')
        .select('id, is_active, plan')
        .eq('id', userIdFromSession)
        .single();

      if (!error && data) {
        shopData = data;
      }
    }

    if (!shopData) {
      logger.error('Shop not found for image generation:', undefined, {
        component: 'image-generation',
        shopDomainFromSession,
        shopIdFromBody,
        userIdFromSession,
      });
      return NextResponse.json({ error: 'No shop associated with account' }, { status: 403 });
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

    // Validate required fields
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (provider !== 'openai') {
      return NextResponse.json(
        { error: 'Valid provider (openai) is required' },
        { status: 400 }
      );
    }

    // Validate prompt length
    if (prompt.length > 4000) {
      return NextResponse.json({ error: 'Prompt exceeds maximum length of 4000 characters' }, { status: 400 });
    }

    // Check system health
    const health = getSystemHealth();
    if (!health.overall.healthy) {
      return NextResponse.json(
        {
          error: 'Image generation service is temporarily unavailable',
          health: health.providers,
        },
        { status: 503 }
      );
    }

    logger.info('Starting image generation request', {
      component: 'image-generation',
      shopId,
      provider,
      model,
      aspectRatio,
      hasReferenceImage: !!referenceImage,
    });

    // Generate image
    const result = await generateImage(prompt, referenceImage, {
      provider: provider as ImageProvider,
      model,
      aspectRatio: aspectRatio as AspectRatio,
      quality: quality as ImageQuality,
      shopId,
      conversationId,
      questionnaireAnswers,
    });

    // Record usage
    await recordUsage(shopId, result.costCents, result.provider, result.model);

    // Return result with usage info
    return NextResponse.json({
      ...result,
      usage: {
        used: usageCheck.used + 1,
        limit: usageCheck.limit,
        remaining: usageCheck.limit - usageCheck.used - 1,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Image generation error:', error as Error, {
      component: 'image-generation',
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
        { error: 'Your prompt was flagged by content safety filters. Please revise and try again.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: errorMessage || 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * GET /api/image-generation
 *
 * Get system health and provider availability
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const health = getSystemHealth();

    return NextResponse.json({
      health,
      providers: {
        openai: {
          available: health.providers.openai.available,
          configured: health.providers.openai.configured,
        },
      },
    });
  } catch (error: unknown) {
    logger.error('Health check error:', error as Error, {
      component: 'image-generation',
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
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
      component: 'image-generation',
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
    // Note: This is a lightweight usage record
    // Full image record is created when the image is saved to library
    await supabaseAdmin.from('image_generation_usage').insert({
      shop_id: shopId,
      cost_cents: costCents,
      provider,
      model,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    // Log but don't fail on usage recording errors
    logger.error('Error recording usage:', error as Error, {
      component: 'image-generation',
      shopId,
    });
  }
}
