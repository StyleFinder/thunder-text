import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { guardDebugRoute } from '../_middleware-guard'

export async function GET(request: NextRequest) {
  const guardResponse = guardDebugRoute('/api/debug/clear-token');
  if (guardResponse) return guardResponse;
  const { searchParams } = new URL(request.url)
  const shop = searchParams.get('shop')

  if (!shop) {
    return NextResponse.json({
      error: 'Missing shop parameter'
    }, { status: 400 })
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const fullShopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`

    // Clear the token for this shop
    const { error: deleteError } = await supabase
      .from('shops')
      .delete()
      .eq('shop_domain', fullShopDomain)

    if (deleteError) {
      logger.error('❌ Error clearing token:', deleteError as Error, { component: 'clear-token' })
      return NextResponse.json({
        success: false,
        error: 'Failed to clear token',
        details: deleteError
      }, { status: 500 })
    }


    return NextResponse.json({
      success: true,
      message: 'Token cleared successfully',
      shop: fullShopDomain
    })

  } catch (error) {
    logger.error('❌ Unexpected error:', error as Error, { component: 'clear-token' })
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear token'
    }, { status: 500 })
  }
}