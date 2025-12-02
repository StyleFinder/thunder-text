import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createCorsHeaders } from '@/lib/middleware/cors'
import { logger } from '@/lib/logger'

/**
 * POST /api/auth/refresh
 * Refreshes the OAuth access token for a shop
 * Note: Shopify offline access tokens don't expire, but this endpoint
 * is here for future compatibility if token refresh is needed
 */
export async function POST(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request)

  try {
    const searchParams = request.nextUrl.searchParams
    const shop = searchParams.get('shop')

    if (!shop) {
      return NextResponse.json(
        { success: false, error: 'Missing shop parameter' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Normalize shop domain
    const fullShopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`

    // Get shop data
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('id, access_token, shop_domain')
      .eq('shop_domain', fullShopDomain)
      .eq('is_active', true)
      .single()

    if (shopError || !shopData) {
      logger.error('Shop not found:', shopError as Error, { component: 'refresh' })
      return NextResponse.json(
        { success: false, error: 'Shop not found or not authenticated' },
        { status: 404, headers: corsHeaders }
      )
    }

    if (!shopData.access_token) {
      return NextResponse.json(
        { success: false, error: 'No access token available. Please reinstall the app.' },
        { status: 401, headers: corsHeaders }
      )
    }

    // For Shopify offline access tokens, they don't expire
    // So we can just return the existing token
    // If Shopify changes this in the future or if you implement online tokens,
    // you would make a refresh request to Shopify here

    // Update last_refreshed_at timestamp
    await supabaseAdmin
      .from('shops')
      .update({
        updated_at: new Date().toISOString()
      })
      .eq('id', shopData.id)

    return NextResponse.json(
      {
        success: true,
        token: shopData.access_token,
        message: 'Token validated successfully'
      },
      { headers: corsHeaders }
    )

  } catch (error) {
    logger.error('Token refresh error:', error as Error, { component: 'refresh' })
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
