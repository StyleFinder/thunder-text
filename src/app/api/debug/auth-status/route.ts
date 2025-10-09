import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Check if we're in a build environment
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co') {
      return NextResponse.json(
        { error: 'Application not properly configured' },
        { status: 503 }
      )
    }

    // Dynamic import to avoid loading during build
    const { getShopToken } = await import('@/lib/shopify/token-manager')

    const { searchParams } = new URL(request.url)
    const shop = searchParams.get('shop') || 'zunosai-staging-test-store'

    console.log('🔍 Checking auth status for shop:', shop)

    // Try to retrieve token from database
    const tokenResult = await getShopToken(shop)

    // Get all environment info
    const debugInfo = {
      shop,
      fullShopDomain: shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`,
      tokenFound: tokenResult.success,
      tokenError: tokenResult.error,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    }

    return NextResponse.json({
      success: tokenResult.success,
      authenticated: tokenResult.success,
      debug: debugInfo,
      message: tokenResult.success
        ? 'Token found in database'
        : `No token found: ${tokenResult.error}`
    })

  } catch (error) {
    console.error('❌ Error checking auth status:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check auth status',
      timestamp: new Date().toISOString()
    })
  }
}