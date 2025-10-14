import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createCorsHeaders, handleCorsPreflightRequest } from '@/lib/middleware/cors';

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

    // Step 3: Build and log the exact query
    const queryFilter = `store_id.eq.${shopData.id},is_default.eq.true`;
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
      return NextResponse.json(
        {
          error: 'Query failed',
          debug: {
            step: 'shop_sizes_query',
            message: sizesError.message,
            code: sizesError.code,
            details: sizesError.details,
            hint: sizesError.hint,
            queryFilter: queryFilter,
            shopId: shopData.id
          }
        },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`[${requestId}] Step 4 SUCCESS - Retrieved ${shopSizes?.length || 0} sizes`);
    console.log(`[${requestId}] === SHOP SIZES API SUCCESS ===`);

    return NextResponse.json({
      success: true,
      data: shopSizes || [],
      debug: {
        requestId,
        shopId: shopData.id,
        resultCount: shopSizes?.length || 0
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
