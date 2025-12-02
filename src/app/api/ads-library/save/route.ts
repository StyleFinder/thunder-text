import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      shopId,
      headline,
      primary_text,
      description,
      platform,
      goal,
      variant_type,
      product_id,
      product_title,
      product_image,
      product_data,
      predicted_score,
      selected_length
    } = body;

    // Validate required fields
    if (!shopId) {
      return NextResponse.json(
        { error: 'Shop ID is required' },
        { status: 400 }
      );
    }

    if (!headline || !primary_text) {
      return NextResponse.json(
        { error: 'Headline and primary text are required' },
        { status: 400 }
      );
    }

    if (!platform || !goal) {
      return NextResponse.json(
        { error: 'Platform and goal are required' },
        { status: 400 }
      );
    }


    // Insert ad into ads_library using admin client
    const { data, error } = await supabaseAdmin
      .from('ads_library')
      .insert({
        shop_id: shopId,
        headline,
        primary_text,
        description,
        platform,
        goal,
        variant_type,
        product_id,
        product_title,
        product_image,
        product_data,
        predicted_score,
        selected_length,
        status: 'draft'
      })
      .select()
      .single();

    if (error) {
      logger.error('[Save Ad] Error saving ad to library:', error as Error, { component: 'save' });
      return NextResponse.json(
        { error: 'Failed to save ad to library', details: error.message },
        { status: 500 }
      );
    }


    return NextResponse.json({
      success: true,
      ad: data
    });

  } catch (error: any) {
    logger.error('Error in save ad endpoint:', error as Error, { component: 'save' });
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
