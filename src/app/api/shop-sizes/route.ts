/**
 * Shop Sizes API
 *
 * SECURITY: Requires authentication via Shopify session token or API key
 * All operations verify the authenticated shop matches the requested shop
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createCorsHeaders, handleCorsPreflightRequest } from '@/lib/middleware/cors';
import { logger } from '@/lib/logger';
import { authenticateRequest } from '@/lib/auth/content-center-auth';

export async function GET(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request);

  try {
    // SECURITY: Authenticate request first
    const authResult = await authenticateRequest(request);
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

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

    // SECURITY: Verify authenticated user matches requested shop
    if (shopData.id !== authResult.userId) {
      logger.warn('Shop access denied - user/shop mismatch', {
        component: 'shop-sizes-api',
        authenticatedUserId: authResult.userId,
        requestedShopId: shopData.id,
      });
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Get shop sizes for this shop (both custom and default)
    const { data: allSizes, error: sizesError } = await supabaseAdmin
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
      .or(`store_id.eq.${shopData.id},store_id.is.null`)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('name');

    if (sizesError) {
      logger.error('Shop sizes query error', new Error(sizesError.message), {
        component: 'shop-sizes-api',
        operation: 'GET',
        shop: fullShopDomain,
        errorCode: sizesError.code
      });
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

    // Filter: If a custom set exists with same name as template, hide the template
    const nameMap = new Map<string, {
      id: string
      store_id: string | null
      name: string
      sizes: string[]
      is_default: boolean
      is_active: boolean
      created_at: string | null
      updated_at: string | null
    }>()

    for (const size of (allSizes || [])) {
      const existing = nameMap.get(size.name);

      // Prioritize custom sets (with store_id) over templates (null store_id)
      if (!existing || (size.store_id && !existing.store_id)) {
        nameMap.set(size.name, size);
      }
    }

    const shopSizes = Array.from(nameMap.values());

    return NextResponse.json({
      success: true,
      data: shopSizes || [],
    }, { headers: corsHeaders });

  } catch (error) {
    logger.error('Shop sizes API error', error as Error, {
      component: 'shop-sizes-api',
      operation: 'GET',
      shop: request.nextUrl.searchParams.get('shop') || undefined
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request);

  try {
    // SECURITY: Authenticate request first
    const authResult = await authenticateRequest(request);
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

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

    // SECURITY: Verify authenticated user matches requested shop
    if (shopData.id !== authResult.userId) {
      logger.warn('Shop access denied - user/shop mismatch', {
        component: 'shop-sizes-api',
        operation: 'POST',
        authenticatedUserId: authResult.userId,
        requestedShopId: shopData.id,
      });
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403, headers: corsHeaders }
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
      logger.error('Shop size insert error', new Error(insertError.message), {
        component: 'shop-sizes-api',
        operation: 'POST',
        shop: fullShopDomain,
        name,
        errorCode: insertError.code
      });
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      data: newSize
    }, { headers: corsHeaders });

  } catch (error) {
    logger.error('Shop sizes create API error', error as Error, {
      component: 'shop-sizes-api',
      operation: 'POST'
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PUT(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request);

  try {
    // SECURITY: Authenticate request first
    const authResult = await authenticateRequest(request);
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

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

    // SECURITY: Verify authenticated user matches requested shop
    if (shopData.id !== authResult.userId) {
      logger.warn('Shop access denied - user/shop mismatch', {
        component: 'shop-sizes-api',
        operation: 'PUT',
        authenticatedUserId: authResult.userId,
        requestedShopId: shopData.id,
      });
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403, headers: corsHeaders }
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

    const updateData: {
      updated_at: string
      name?: string
      sizes?: string[]
      is_default?: boolean
    } = {
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
      logger.error('Shop size update error', new Error(updateError.message), {
        component: 'shop-sizes-api',
        operation: 'PUT',
        shop: fullShopDomain,
        id,
        errorCode: updateError.code
      });
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      data: updatedSize
    }, { headers: corsHeaders });

  } catch (error) {
    logger.error('Shop sizes update API error', error as Error, {
      component: 'shop-sizes-api',
      operation: 'PUT'
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request);

  try {
    // SECURITY: Authenticate request first
    const authResult = await authenticateRequest(request);
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

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

    // SECURITY: Verify authenticated user matches requested shop
    if (shopData.id !== authResult.userId) {
      logger.warn('Shop access denied - user/shop mismatch', {
        component: 'shop-sizes-api',
        operation: 'DELETE',
        authenticatedUserId: authResult.userId,
        requestedShopId: shopData.id,
      });
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Soft delete by setting is_active to false
    const { error: deleteError } = await supabaseAdmin
      .from('shop_sizes')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('store_id', shopData.id);

    if (deleteError) {
      logger.error('Shop size delete error', new Error(deleteError.message), {
        component: 'shop-sizes-api',
        operation: 'DELETE',
        shop: fullShopDomain,
        id,
        errorCode: deleteError.code
      });
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: 'Shop size deleted successfully'
    }, { headers: corsHeaders });

  } catch (error) {
    logger.error('Shop sizes delete API error', error as Error, {
      component: 'shop-sizes-api',
      operation: 'DELETE',
      shop: request.nextUrl.searchParams.get('shop') || undefined,
      id: request.nextUrl.searchParams.get('id') || undefined
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request);
}
