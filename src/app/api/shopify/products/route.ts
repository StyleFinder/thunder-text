import { NextRequest, NextResponse } from 'next/server'
import { createCorsHeaders } from '@/lib/middleware/cors'
import { getProducts } from '@/lib/shopify/get-products'
import { getAccessToken } from '@/lib/shopify-auth'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request)

  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get('shop') || 'zunosai-staging-test-store.myshopify.com'
    const query = searchParams.get('query') || undefined

    // Get session token from Authorization header
    const authHeader = request.headers.get('authorization')
    const sessionToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined

    // Ensure shop has .myshopify.com
    const fullShop = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`

    console.log('🔐 Has session token:', !!sessionToken)

    // Get access token using proper Token Exchange
    let accessToken: string
    try {
      accessToken = await getAccessToken(fullShop, sessionToken)
    } catch (error) {
      logger.error('❌ Failed to get access token:', error as Error, { component: 'products' })
      return NextResponse.json({
        success: false,
        error: 'Authentication failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Ensure the app is properly installed and you have a valid session token'
      }, { status: 401, headers: corsHeaders })
    }

    // Get products using the obtained access token
    const { products, pageInfo } = await getProducts(fullShop, accessToken, query)


    return NextResponse.json({
      success: true,
      products,
      pageInfo: {
        hasNextPage: pageInfo.hasNextPage,
        endCursor: pageInfo.endCursor,
        total: products.length
      },
      message: `Successfully fetched ${products.length} products`
    }, { headers: corsHeaders })

  } catch (error) {
    logger.error('❌ Error in products API:', error as Error, { component: 'products' })
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch products',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500, headers: corsHeaders })
  }
}