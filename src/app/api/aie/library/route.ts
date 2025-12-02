/**
 * AIE Ad Library API
 * Manages store-specific ad library (save, fetch, update, delete ads)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/ace-compat';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

/**
 * GET /api/aie/library
 * Fetch ads from library for a shop
 */
export const GET = requireAuth('user')(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');
    const status = searchParams.get('status'); // draft, active, paused, archived, or "all"

    if (!shopId) {
      return NextResponse.json(
        { success: false, error: { message: 'shopId is required' } },
        { status: 400 }
      );
    }

    // Look up shop UUID
    const { data: shop, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('id')
      .eq('shop_domain', shopId)
      .single();

    if (shopError || !shop) {
      return NextResponse.json(
        { success: false, error: { message: `Shop not found: ${shopId}` } },
        { status: 404 }
      );
    }

    // Build query
    let query = supabaseAdmin
      .from('ad_library')
      .select('*')
      .eq('shop_id', shop.id)
      .order('created_at', { ascending: false });

    // Filter by status if provided
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: ads, error } = await query;

    if (error) {
      logger.error('Error fetching ad library', new Error(error.message), {
        component: 'aie-library-api',
        operation: 'GET',
        shopId,
        status,
        errorCode: error.code
      });
      return NextResponse.json(
        { success: false, error: { message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { ads, count: ads?.length || 0 },
    });
  } catch (err) {
    logger.error('Ad library fetch error', err as Error, {
      component: 'aie-library-api',
      operation: 'GET',
      shopId: new URL(request.url).searchParams.get('shopId') || undefined
    });
    return NextResponse.json(
      {
        success: false,
        error: { message: err instanceof Error ? err.message : 'Unknown error' },
      },
      { status: 500 }
    );
  }
});

/**
 * POST /api/aie/library
 * Save a new ad to the library
 */
export const POST = requireAuth('user')(async (request) => {
  try {
    const body = await request.json();
    const {
      shopId,
      adRequestId,
      variantId,
      headline,
      primaryText,
      description,
      cta,
      platform,
      campaignGoal,
      variantType,
      imageUrls,
      productMetadata,
      status = 'draft', // Default to draft
    } = body;

    // Validation
    if (!shopId || !headline || !primaryText || !cta || !platform || !campaignGoal) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Missing required fields: shopId, headline, primaryText, cta, platform, campaignGoal' },
        },
        { status: 400 }
      );
    }

    // Look up shop UUID
    const { data: shop, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('id')
      .eq('shop_domain', shopId)
      .single();

    if (shopError || !shop) {
      return NextResponse.json(
        { success: false, error: { message: `Shop not found: ${shopId}` } },
        { status: 404 }
      );
    }

    // Insert ad into library
    const { data: ad, error } = await supabaseAdmin
      .from('ad_library')
      .insert({
        shop_id: shop.id,
        ad_request_id: adRequestId || null,
        variant_id: variantId || null,
        status,
        headline,
        primary_text: primaryText,
        description: description || null,
        cta,
        platform,
        campaign_goal: campaignGoal,
        variant_type: variantType || null,
        image_urls: imageUrls || [],
        product_metadata: productMetadata || {},
      })
      .select()
      .single();

    if (error) {
      logger.error('Error saving ad to library', new Error(error.message), {
        component: 'aie-library-api',
        operation: 'POST',
        shopId,
        platform,
        campaignGoal,
        errorCode: error.code
      });
      return NextResponse.json(
        { success: false, error: { message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { ad },
      message: 'Ad saved to library',
    });
  } catch (err) {
    logger.error('Ad library save error', err as Error, {
      component: 'aie-library-api',
      operation: 'POST'
    });
    return NextResponse.json(
      {
        success: false,
        error: { message: err instanceof Error ? err.message : 'Unknown error' },
      },
      { status: 500 }
    );
  }
});

/**
 * PATCH /api/aie/library
 * Update an existing ad in the library
 */
export const PATCH = requireAuth('user')(async (request) => {
  try {
    const body = await request.json();
    const { adId, ...updates } = body;

    if (!adId) {
      return NextResponse.json(
        { success: false, error: { message: 'adId is required' } },
        { status: 400 }
      );
    }

    // Build update object (only include provided fields)
    const updateData: Record<string, unknown> = {};
    if (updates.headline !== undefined) updateData.headline = updates.headline;
    if (updates.primaryText !== undefined) updateData.primary_text = updates.primaryText;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.cta !== undefined) updateData.cta = updates.cta;
    if (updates.status !== undefined) {
      updateData.status = updates.status;
      // Set published_at when moving to active
      if (updates.status === 'active') {
        updateData.published_at = new Date().toISOString();
      }
      // Set archived_at when archiving
      if (updates.status === 'archived') {
        updateData.archived_at = new Date().toISOString();
      }
    }
    if (updates.imageUrls !== undefined) updateData.image_urls = updates.imageUrls;
    if (updates.impressions !== undefined) updateData.impressions = updates.impressions;
    if (updates.clicks !== undefined) updateData.clicks = updates.clicks;
    if (updates.conversions !== undefined) updateData.conversions = updates.conversions;
    if (updates.spend !== undefined) updateData.spend = updates.spend;
    if (updates.revenue !== undefined) updateData.revenue = updates.revenue;

    const { data: ad, error } = await supabaseAdmin
      .from('ad_library')
      .update(updateData)
      .eq('id', adId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating ad', new Error(error.message), {
        component: 'aie-library-api',
        operation: 'PATCH',
        adId,
        errorCode: error.code
      });
      return NextResponse.json(
        { success: false, error: { message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { ad },
      message: 'Ad updated successfully',
    });
  } catch (err) {
    logger.error('Ad library update error', err as Error, {
      component: 'aie-library-api',
      operation: 'PATCH'
    });
    return NextResponse.json(
      {
        success: false,
        error: { message: err instanceof Error ? err.message : 'Unknown error' },
      },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/aie/library
 * Delete an ad from the library
 */
export const DELETE = requireAuth('user')(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const adId = searchParams.get('adId');

    if (!adId) {
      return NextResponse.json(
        { success: false, error: { message: 'adId is required' } },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('ad_library')
      .delete()
      .eq('id', adId);

    if (error) {
      logger.error('Error deleting ad', new Error(error.message), {
        component: 'aie-library-api',
        operation: 'DELETE',
        adId,
        errorCode: error.code
      });
      return NextResponse.json(
        { success: false, error: { message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Ad deleted successfully',
    });
  } catch (err) {
    logger.error('Ad library delete error', err as Error, {
      component: 'aie-library-api',
      operation: 'DELETE',
      adId: new URL(request.url).searchParams.get('adId') || undefined
    });
    return NextResponse.json(
      {
        success: false,
        error: { message: err instanceof Error ? err.message : 'Unknown error' },
      },
      { status: 500 }
    );
  }
});
