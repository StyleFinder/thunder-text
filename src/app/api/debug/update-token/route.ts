import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { guardDebugRoute } from '../_middleware-guard'

// This endpoint allows manual token updates for development
export async function POST(request: NextRequest) {
  const guardResponse = guardDebugRoute('/api/debug/update-token');
  if (guardResponse) return guardResponse;
  try {
    const { shop, token } = await request.json()

    if (!shop || !token) {
      return NextResponse.json({
        success: false,
        error: 'Missing shop or token parameter'
      }, { status: 400 })
    }

    // Initialize Supabase with service key for admin access
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const fullShopDomain = shop.includes('.myshopify.com')
      ? shop
      : `${shop}.myshopify.com`


    // Update the token in the database
    const { data, error } = await supabase
      .from('shops')
      .upsert({
        shop_domain: fullShopDomain,
        access_token: token,
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'shop_domain'
      })
      .select()
      .single()

    if (error) {
      logger.error('❌ Error updating token:', error as Error, { component: 'update-token' })
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }


    return NextResponse.json({
      success: true,
      message: 'Token updated successfully',
      shop: fullShopDomain
    })

  } catch (error) {
    logger.error('❌ Unexpected error:', error as Error, { component: 'update-token' })
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update token'
    }, { status: 500 })
  }
}

export async function GET() {
  const guardResponse = guardDebugRoute('/api/debug/update-token');
  if (guardResponse) return guardResponse;

  return NextResponse.json({
    message: 'Use POST method to update token',
    example: {
      shop: 'your-store',
      token: 'shpat_xxxxxxxxxxxxxxxxxxxxx'
    }
  })
}