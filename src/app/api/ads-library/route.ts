import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  try {
    // Get shop domain from cookie
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
      logger.error('Error fetching shop:', shopError as Error, { component: 'ads-library' });
      return NextResponse.json(
        { error: 'Shop not found in database', details: shopError?.message },
        { status: 404 }
      );
    }

    // Fetch ads from ads_library for this shop
    const { data: ads, error: adsError } = await supabaseAdmin
      .from('ads_library')
      .select('*')
      .eq('shop_id', shopData.id)
      .order('created_at', { ascending: false });

    if (adsError) {
      logger.error('Error fetching ads:', adsError as Error, { component: 'ads-library' });
      return NextResponse.json(
        { error: 'Failed to fetch ads', details: adsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ads: ads || [] });

  } catch (error: any) {
    logger.error('Error in ads library endpoint:', error as Error, { component: 'ads-library' });
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
