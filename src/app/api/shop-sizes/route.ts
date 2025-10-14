import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createCorsHeaders, handleCorsPreflightRequest } from '@/lib/middleware/cors';

export async function GET(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request);

  try {
    const searchParams = request.nextUrl.searchParams;
    const shop = searchParams.get('shop');

    if (!shop) {
      return NextResponse.json(
        { error: 'Missing shop parameter' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get shop ID from shop domain
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

    // BYPASS PostgREST ENTIRELY - Use Supabase's sql query builder
    // PostgREST cache won't reload after shop_sizes table creation
    const query = `
      SELECT
        id::text,
        store_id::text,
        name,
        sizes,
        is_default,
        is_active,
        created_at,
        updated_at
      FROM shop_sizes
      WHERE is_active = true
        AND (store_id = $1 OR store_id IS NULL)
      ORDER BY is_default DESC, name ASC
    `;

    // Use raw SQL query that bypasses PostgREST
    const { data: shopSizes, error: sizesError } = await supabaseAdmin
      .rpc('exec_sql_query', {
        sql_query: query,
        params: [shopData.id]
      });

    if (sizesError) {
      console.error('Shop sizes query error:', sizesError);
      return NextResponse.json(
        {
          error: 'Failed to fetch shop sizes',
          debug: {
            message: sizesError.message,
            code: sizesError.code
          }
        },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      data: shopSizes || [],
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Shop sizes API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
