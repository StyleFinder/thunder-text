import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/auth/clear-token?shop={shop}
// Clears the OAuth token for a specific shop
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const shop = searchParams.get('shop')
  const confirm = searchParams.get('confirm')

  if (!shop) {
    return NextResponse.json(
      { error: 'Missing required parameter: shop' },
      { status: 400 }
    )
  }

  // Safety check - require confirmation
  if (confirm !== 'yes') {
    return NextResponse.json({
      message: 'Token clear ready',
      warning: 'This will clear the OAuth token for the shop',
      shop: shop,
      action: 'Add ?confirm=yes to the URL to proceed'
    })
  }

  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Supabase configuration missing' },
      { status: 500 }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`

    console.log('🗑️ Clearing token for shop:', shopDomain)

    // Delete the shop record entirely for a clean slate
    const { error } = await supabase
      .from('shops')
      .delete()
      .eq('shop_domain', shopDomain)

    if (error) {
      console.error('❌ Error clearing token:', error)
      return NextResponse.json(
        { error: 'Failed to clear token', details: error.message },
        { status: 500 }
      )
    }

    console.log('✅ Token cleared successfully for shop:', shopDomain)

    return NextResponse.json({
      success: true,
      message: 'Token cleared successfully',
      shop: shopDomain,
      nextStep: `Install app via OAuth: ${request.nextUrl.origin}/api/auth?shop=${shop}`
    })

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Failed to clear token',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}