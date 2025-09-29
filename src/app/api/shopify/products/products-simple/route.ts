import { NextRequest, NextResponse } from 'next/server'
import { createCorsHeaders } from '@/lib/middleware/cors'
import { getProducts } from '@/lib/shopify/get-products'
import { getAccessToken } from '@/lib/shopify-auth'

export async function GET(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request)

  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get('shop') || 'zunosai-staging-test-store.myshopify.com'

    // Get session token from Authorization header
    const authHeader = request.headers.get('authorization')
    const sessionToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined

    // Ensure shop has .myshopify.com
    const fullShop = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`

    console.log('🔍 Products API - fetching for:', fullShop)
    console.log('🔐 Has session token:', !!sessionToken)

    // Get access token using proper Token Exchange
    let accessToken: string
    try {
      accessToken = await getAccessToken(fullShop, sessionToken)
      console.log('✅ Got access token via Token Exchange')
    } catch (error) {
      console.error('❌ Failed to get access token:', error)
      return NextResponse.json({
        success: false,
        error: 'Authentication failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Ensure the app is properly installed and you have a valid session token'
      }, { status: 401, headers: corsHeaders })
    }

    // Get products using the obtained access token
    const { products, pageInfo } = await getProducts(fullShop, accessToken)

    console.log(`✅ Found ${products.length} products`)

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
    console.error('❌ Error in products API:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch products',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500, headers: corsHeaders })
  }
}