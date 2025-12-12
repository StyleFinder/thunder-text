import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createCorsHeaders } from '@/lib/middleware/cors'
import { logger } from '@/lib/logger'

/**
 * GET /api/auth/token
 * Retrieves the current OAuth access token for a shop
 * Used for external (non-embedded) authentication
 */
export async function GET(request: NextRequest) {
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

    // Get shop and access token from database
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('id, shopify_access_token, shopify_access_token_legacy')
      .eq('shop_domain', fullShopDomain)
      .eq('is_active', true)
      .single()

    if (shopError || !shopData) {
      logger.error('Shop not found:', shopError as Error, { component: 'token' })
      return NextResponse.json(
        { success: false, error: 'Shop not found or not authenticated' },
        { status: 404, headers: corsHeaders }
      )
    }

    const accessToken = shopData.shopify_access_token || shopData.shopify_access_token_legacy

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'No access token available. Please reinstall the app.' },
        { status: 401, headers: corsHeaders }
      )
    }

    // Return the access token
    return NextResponse.json(
      {
        success: true,
        token: accessToken,
      },
      { headers: corsHeaders }
    )

  } catch (error) {
    logger.error('Token retrieval error:', error as Error, { component: 'token' })
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
