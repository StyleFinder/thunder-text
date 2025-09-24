import { NextRequest, NextResponse } from 'next/server'
import { getShopToken } from '@/lib/shopify/token-manager'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const shop = searchParams.get('shop')

  if (!shop) {
    return NextResponse.json({ error: 'Shop parameter required' }, { status: 400 })
  }

  const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`

  try {
    // Check environment variables
    const envStatus = {
      hasApiKey: !!process.env.SHOPIFY_API_KEY,
      hasApiSecret: !!process.env.SHOPIFY_API_SECRET,
      hasAuthBypass: process.env.SHOPIFY_AUTH_BYPASS === 'true',
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_KEY
    }

    // Try to get token from database
    const tokenResult = await getShopToken(shopDomain)

    return NextResponse.json({
      shop: shopDomain,
      environment: envStatus,
      tokenStatus: {
        found: tokenResult.success,
        hasToken: !!tokenResult.accessToken,
        error: tokenResult.error,
        tokenPreview: tokenResult.accessToken ?
          tokenResult.accessToken.substring(0, 15) + '...' : null
      },
      message: tokenResult.success ?
        'Token found in database' :
        'No token found - OAuth may not have completed successfully'
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check token status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}