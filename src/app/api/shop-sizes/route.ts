import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createCorsHeaders, handleCorsPreflightRequest } from '@/lib/middleware/cors';

type ShopSizeRecord = {
  id: string | null
  store_id: string | null
  name: string
  sizes: string[]
  is_default: boolean
  is_active: boolean
  created_at: string | null
  updated_at: string | null
  source?: 'fallback' | 'database'
}

const FALLBACK_SHOP_SIZES: ShopSizeRecord[] = [
  {
    id: 'fallback-standard',
    store_id: null,
    name: 'Standard Sizes',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    is_default: true,
    is_active: true,
    created_at: null,
    updated_at: null,
    source: 'fallback'
  },
  {
    id: 'fallback-plus',
    store_id: null,
    name: 'Plus Sizes',
    sizes: ['1X', '2X', '3X', '4X', '5X'],
    is_default: false,
    is_active: true,
    created_at: null,
    updated_at: null,
    source: 'fallback'
  },
  {
    id: 'fallback-numeric',
    store_id: null,
    name: 'Numeric Sizes',
    sizes: ['0', '2', '4', '6', '8', '10', '12', '14', '16', '18', '20'],
    is_default: false,
    is_active: true,
    created_at: null,
    updated_at: null,
    source: 'fallback'
  },
  {
    id: 'fallback-shoes',
    store_id: null,
    name: 'Shoe Sizes',
    sizes: ['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11'],
    is_default: false,
    is_active: true,
    created_at: null,
    updated_at: null,
    source: 'fallback'
  },
  {
    id: 'fallback-extended',
    store_id: null,
    name: 'Extended Sizes',
    sizes: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
    is_default: false,
    is_active: true,
    created_at: null,
    updated_at: null,
    source: 'fallback'
  }
];

const annotateShopSizeSource = (records: ShopSizeRecord[]): ShopSizeRecord[] => {
  return records.map((record) => {
    const isFallback =
      record.source === 'fallback' ||
      !record.store_id ||
      (typeof record.id === 'string' && record.id.startsWith('fallback-'));

    return {
      ...record,
      source: isFallback ? 'fallback' : 'database'
    };
  });
};

const isFallbackId = (value: string | null | undefined): boolean =>
  typeof value === 'string' && value.startsWith('fallback-');

export async function GET(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request);
  const requestId = Math.random().toString(36).substring(7);

  try {
    console.log(`[${requestId}] === SHOP SIZES API START ===`);

    // Step 1: Extract shop parameter
    const searchParams = request.nextUrl.searchParams;
    const shop = searchParams.get('shop');
    console.log(`[${requestId}] Step 1 - Shop parameter:`, shop);

    if (!shop) {
      console.error(`[${requestId}] ERROR: Missing shop parameter`);
      return NextResponse.json(
        { error: 'Missing shop parameter' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Step 2: Get shop ID from database
    const fullShopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;
    console.log(`[${requestId}] Step 2 - Looking up shop domain:`, fullShopDomain);

    const { data: shopData, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('id')
      .eq('shop_domain', fullShopDomain)
      .single();

    if (shopError) {
      console.error(`[${requestId}] ERROR: Shop lookup failed:`, {
        message: shopError.message,
        code: shopError.code,
        details: shopError.details,
        hint: shopError.hint
      });
      return NextResponse.json(
        {
          error: 'Shop lookup failed',
          debug: {
            message: shopError.message,
            code: shopError.code,
            domain: fullShopDomain
          }
        },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!shopData) {
      console.error(`[${requestId}] ERROR: Shop not found for domain:`, fullShopDomain);
      return NextResponse.json(
        { error: 'Shop not found', domain: fullShopDomain },
        { status: 404, headers: corsHeaders }
      );
    }

    console.log(`[${requestId}] Step 2 SUCCESS - Shop ID:`, shopData.id);

    const queryFilter = `store_id.eq.${shopData.id},store_id.is.null`;
    console.log(`[${requestId}] Step 3 - Query filter:`, queryFilter);
    console.log(`[${requestId}] Step 3 - Query details:`, {
      table: 'shop_sizes',
      shopId: shopData.id,
      shopIdType: typeof shopData.id,
      filter: queryFilter
    });

    // Step 4: Execute query
    const { data: shopSizes, error: sizesError } = await supabaseAdmin
      .from('shop_sizes')
      .select(`
        id,
        store_id,
        name,
        sizes,
        is_default,
        is_active,
        created_at,
        updated_at
      `)
      .or(queryFilter)
      .eq('is_active', true)
      .order('store_id', { ascending: false, nullsFirst: false })
      .order('is_default', { ascending: false })
      .order('name');

    if (sizesError) {
      console.error(`[${requestId}] ERROR: Shop sizes query failed:`, {
        message: sizesError.message,
        code: sizesError.code,
        details: sizesError.details,
        hint: sizesError.hint,
        queryFilter: queryFilter,
        shopId: shopData.id
      });
      console.warn(`[${requestId}] Returning fallback shop sizes due to query failure`);
      return NextResponse.json(
        {
          success: true,
          data: annotateShopSizeSource(FALLBACK_SHOP_SIZES),
          debug: {
            requestId,
            step: 'shop_sizes_query',
            fallback: true,
            message: sizesError.message,
            code: sizesError.code,
            details: sizesError.details,
            hint: sizesError.hint,
            queryFilter: queryFilter,
            shopId: shopData.id
          }
        },
        { status: 200, headers: corsHeaders }
      );
    }

    const responseData =
      (shopSizes?.length ?? 0) > 0 ? shopSizes! : FALLBACK_SHOP_SIZES;
    const annotatedData = annotateShopSizeSource(responseData);

    if (!shopSizes?.length) {
      console.warn(`[${requestId}] No shop-specific sizes found. Using fallback defaults.`);
    }

    console.log(`[${requestId}] Step 4 SUCCESS - Retrieved ${annotatedData.length} sizes`);
    console.log(`[${requestId}] === SHOP SIZES API SUCCESS ===`);

    return NextResponse.json({
      success: true,
      data: annotatedData,
      debug: {
        requestId,
        shopId: shopData.id,
        resultCount: annotatedData.length,
        fallback: !shopSizes?.length
      }
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error(`[${requestId}] === UNCAUGHT ERROR ===`, {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
      fullError: JSON.stringify(error, null, 2)
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        debug: {
          requestId,
          errorName: error?.name,
          errorMessage: error?.message,
          errorCode: error?.code
        }
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request);

  try {
    const body = await request.json();
    const { shop, name, sizes, is_default } = body;

    if (!shop || !name || !sizes || !Array.isArray(sizes)) {
      return NextResponse.json(
        { error: 'Missing required fields: shop, name, sizes (array)' },
        { status: 400, headers: corsHeaders }
      );
    }

    const fullShopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('id')
      .eq('shop_domain', fullShopDomain)
      .single();

    if (shopError || !shopData) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // If setting as default, unset other defaults first
    if (is_default) {
      await supabaseAdmin
        .from('shop_sizes')
        .update({ is_default: false })
        .eq('store_id', shopData.id)
        .eq('is_default', true);
    }

    const { data: newSize, error: insertError } = await supabaseAdmin
      .from('shop_sizes')
      .insert({
        store_id: shopData.id,
        name,
        sizes,
        is_default: is_default || false,
        is_active: true
      })
      .select()
      .single();

    if (insertError) {
      console.error('Shop size insert error:', insertError);
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      data: newSize
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Shop sizes create API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PUT(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request);

  try {
    const body = await request.json();
    const { shop, id, name, sizes, is_default } = body;

    if (!shop || !id) {
      return NextResponse.json(
        { error: 'Missing required fields: shop, id' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (isFallbackId(id)) {
      return NextResponse.json(
        { error: 'Default sizing templates cannot be updated directly. Save changes as a new sizing set instead.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const fullShopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('id')
      .eq('shop_domain', fullShopDomain)
      .single();

    if (shopError || !shopData) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // If setting as default, unset other defaults first
    if (is_default) {
      await supabaseAdmin
        .from('shop_sizes')
        .update({ is_default: false })
        .eq('store_id', shopData.id)
        .eq('is_default', true)
        .neq('id', id);
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (name !== undefined) updateData.name = name;
    if (sizes !== undefined) updateData.sizes = sizes;
    if (is_default !== undefined) updateData.is_default = is_default;

    const { data: updatedSize, error: updateError } = await supabaseAdmin
      .from('shop_sizes')
      .update(updateData)
      .eq('id', id)
      .eq('store_id', shopData.id)
      .select()
      .single();

    if (updateError) {
      console.error('Shop size update error:', updateError);
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      data: updatedSize
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Shop sizes update API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request);

  try {
    const searchParams = request.nextUrl.searchParams;
    const shop = searchParams.get('shop');
    const id = searchParams.get('id');

    if (!shop || !id) {
      return NextResponse.json(
        { error: 'Missing required parameters: shop, id' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (isFallbackId(id)) {
      return NextResponse.json(
        { error: 'Default sizing templates cannot be deleted. Create a custom sizing set instead.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const fullShopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('id')
      .eq('shop_domain', fullShopDomain)
      .single();

    if (shopError || !shopData) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Soft delete by setting is_active to false
    const { error: deleteError } = await supabaseAdmin
      .from('shop_sizes')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('store_id', shopData.id);

    if (deleteError) {
      console.error('Shop size delete error:', deleteError);
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: 'Shop size deleted successfully'
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Shop sizes delete API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request);
}
