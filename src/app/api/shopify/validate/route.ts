import { NextRequest, NextResponse } from 'next/server'

// This endpoint validates that the app is properly configured
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const shop = searchParams.get('shop')
  const embedded = searchParams.get('embedded')

  // Get request headers to check embedding context
  const origin = request.headers.get('origin') || ''
  const referer = request.headers.get('referer') || ''
  const userAgent = request.headers.get('user-agent') || ''

  // Check if request is from Shopify admin
  const isShopifyContext =
    origin.includes('.myshopify.com') ||
    origin.includes('admin.shopify.com') ||
    referer.includes('.myshopify.com') ||
    referer.includes('admin.shopify.com') ||
    referer.includes('.spin.dev')

  return NextResponse.json({
    success: true,
    shop,
    embedded: embedded === '1' || embedded === 'true',
    shopifyContext: isShopifyContext,
    configured: {
      apiKey: !!process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
      apiSecret: !!process.env.SHOPIFY_API_SECRET,
      supabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    },
    credentials: {
      apiKeyLength: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY?.length || 0,
      secretLength: process.env.SHOPIFY_API_SECRET?.length || 0,
      apiKeyPrefix: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY?.substring(0, 8) || 'not-set',
    },
    headers: {
      origin: origin || 'none',
      referer: referer || 'none',
      userAgent: userAgent.substring(0, 50)
    },
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  })
}

export async function OPTIONS(request: NextRequest) {
  // SECURITY: Use middleware CORS handling instead of wildcard
  // This endpoint is already protected by middleware.ts CORS
  return new Response(null, {
    status: 204
  })
}