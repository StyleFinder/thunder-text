import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { guardDebugRoute } from '../_middleware-guard'

export async function POST(request: NextRequest) {
  const guardResponse = guardDebugRoute('/api/debug/manual-token-exchange');
  if (guardResponse) return guardResponse;
  try {
    const body = await request.json()
    const { shop, accessToken } = body

    if (!shop || !accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Missing shop or accessToken parameter'
      }, { status: 400 })
    }

    // Store the access token in Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const fullShopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`

    const { error: dbError, data } = await supabase
      .from('shops')
      .upsert({
        shop_domain: fullShopDomain,
        access_token: accessToken,
        scope: 'read_products,write_products', // Default scope
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'shop_domain'
      })
      .select()

    if (dbError) {
      logger.error('❌ Error storing token:', dbError as Error, { component: 'manual-token-exchange' })
      return NextResponse.json({
        success: false,
        error: 'Failed to store access token',
        details: dbError
      }, { status: 500 })
    }


    return NextResponse.json({
      success: true,
      message: 'Token stored successfully',
      shop: fullShopDomain,
      data
    })

  } catch (error) {
    logger.error('❌ Unexpected error:', error as Error, { component: 'manual-token-exchange' })
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to store token'
    }, { status: 500 })
  }
}