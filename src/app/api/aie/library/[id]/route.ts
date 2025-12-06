/**
 * AIE Ad Library Single Ad API
 * GET, PATCH, DELETE operations for a single ad by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

/**
 * GET /api/aie/library/[id]
 * Fetch a single ad by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: ad, error } = await supabaseAdmin
      .from('ad_library')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !ad) {
      logger.error('Error fetching ad', error ? new Error(error.message) : new Error('Ad not found'), {
        component: 'aie-library-single',
        operation: 'GET',
        adId: id,
        errorCode: error?.code
      });
      return NextResponse.json(
        { success: false, error: { message: 'Ad not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { ad }
    });
  } catch (err) {
    logger.error('Ad fetch error', err as Error, {
      component: 'aie-library-single',
      operation: 'GET'
    });
    return NextResponse.json(
      { success: false, error: { message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/aie/library/[id]
 * Update a single ad
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { headline, primaryText, description, cta, status } = body;

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (headline !== undefined) updateData.headline = headline;
    if (primaryText !== undefined) updateData.primary_text = primaryText;
    if (description !== undefined) updateData.description = description;
    if (cta !== undefined) updateData.cta = cta;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'active') {
        updateData.published_at = new Date().toISOString();
      }
      if (status === 'archived') {
        updateData.archived_at = new Date().toISOString();
      }
    }

    const { data: ad, error } = await supabaseAdmin
      .from('ad_library')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating ad', new Error(error.message), {
        component: 'aie-library-single',
        operation: 'PATCH',
        adId: id,
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
      message: 'Ad updated successfully'
    });
  } catch (err) {
    logger.error('Ad update error', err as Error, {
      component: 'aie-library-single',
      operation: 'PATCH'
    });
    return NextResponse.json(
      { success: false, error: { message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/aie/library/[id]
 * Delete a single ad
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error } = await supabaseAdmin
      .from('ad_library')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting ad', new Error(error.message), {
        component: 'aie-library-single',
        operation: 'DELETE',
        adId: id,
        errorCode: error.code
      });
      return NextResponse.json(
        { success: false, error: { message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Ad deleted successfully'
    });
  } catch (err) {
    logger.error('Ad delete error', err as Error, {
      component: 'aie-library-single',
      operation: 'DELETE'
    });
    return NextResponse.json(
      { success: false, error: { message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 }
    );
  }
}
