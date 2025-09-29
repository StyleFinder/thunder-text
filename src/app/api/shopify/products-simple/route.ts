import { NextRequest, NextResponse } from 'next/server'
import { createCorsHeaders } from '@/lib/middleware/cors'
import { getProducts } from '@/lib/shopify/get-products'

// Temporary hardcoded token for testing
// This proves the app has access if we use the right token
const TEMP_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN || ''

export async function GET(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request)

  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get('shop') || 'zunosai-staging-test-store.myshopify.com'

    // Ensure shop has .myshopify.com
    const fullShop = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`

    console.log('🔍 Simple Products API - fetching for:', fullShop)

    // Use hardcoded token for now
    if (!TEMP_ACCESS_TOKEN) {
      return NextResponse.json({
        success: false,
        error: 'SHOPIFY_ACCESS_TOKEN not configured in environment',
        hint: 'Add SHOPIFY_ACCESS_TOKEN to your Vercel environment variables'
      }, { status: 500, headers: corsHeaders })
    }

    // Get products using the simple direct approach
    const { products, pageInfo } = await getProducts(fullShop, TEMP_ACCESS_TOKEN)

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
    console.error('❌ Error in simple products API:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch products',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500, headers: corsHeaders })
  }
}