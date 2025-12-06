import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

// GET single ad by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const shopDomain = req.cookies.get('shopify_shop')?.value;

    if (!shopDomain) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get shop_id from shops table
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('id')
      .eq('shop_domain', shopDomain)
      .single();

    if (shopError || !shopData) {
      logger.error('Error fetching shop:', shopError as Error, { component: 'ads-library-single' });
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      );
    }

    // Fetch the ad
    const { data: ad, error: adError } = await supabaseAdmin
      .from('ads_library')
      .select('*')
      .eq('id', id)
      .eq('shop_id', shopData.id)
      .single();

    if (adError || !ad) {
      logger.error('Error fetching ad:', adError as Error, { component: 'ads-library-single' });
      return NextResponse.json(
        { error: 'Ad not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ad });

  } catch (error: any) {
    logger.error('Error fetching ad:', error as Error, { component: 'ads-library-single' });
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// PATCH update ad
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const shopDomain = req.cookies.get('shopify_shop')?.value;

    if (!shopDomain) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { headline, primaryText, description, cta } = body;

    // Get shop_id from shops table
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('id')
      .eq('shop_domain', shopDomain)
      .single();

    if (shopError || !shopData) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      );
    }

    // Update the ad
    const { data: ad, error: updateError } = await supabaseAdmin
      .from('ads_library')
      .update({
        headline,
        primary_text: primaryText,
        description,
        cta,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('shop_id', shopData.id)
      .select()
      .single();

    if (updateError) {
      logger.error('Error updating ad:', updateError as Error, { component: 'ads-library-single' });
      return NextResponse.json(
        { error: 'Failed to update ad', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, ad });

  } catch (error: any) {
    logger.error('Error updating ad:', error as Error, { component: 'ads-library-single' });
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE ad
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const shopDomain = req.cookies.get('shopify_shop')?.value;

    if (!shopDomain) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get shop_id from shops table
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('id')
      .eq('shop_domain', shopDomain)
      .single();

    if (shopError || !shopData) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      );
    }

    // Delete the ad
    const { error: deleteError } = await supabaseAdmin
      .from('ads_library')
      .delete()
      .eq('id', id)
      .eq('shop_id', shopData.id);

    if (deleteError) {
      logger.error('Error deleting ad:', deleteError as Error, { component: 'ads-library-single' });
      return NextResponse.json(
        { error: 'Failed to delete ad', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    logger.error('Error deleting ad:', error as Error, { component: 'ads-library-single' });
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
