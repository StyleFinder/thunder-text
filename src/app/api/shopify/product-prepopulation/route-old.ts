import { NextRequest, NextResponse } from 'next/server'
import { fetchProductDataForPrePopulation } from '@/lib/shopify/product-prepopulation'
import { createCorsHeaders, handleCorsPreflightRequest } from '@/lib/middleware/cors'

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request)
}

export async function GET(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request)

  try {
    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get('productId')
    const shop = searchParams.get('shop')

    if (!productId || !shop) {
      return NextResponse.json(
        { error: 'Missing productId or shop parameter' },
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('📦 API: Fetching product data for prepopulation:', { productId, shop })

    // Get session token from Authorization header if provided
    const authHeader = request.headers.get('authorization')
    const sessionToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined

    // This will run server-side where environment variables are available
    const productData = await fetchProductDataForPrePopulation(productId, shop, sessionToken)

    if (!productData) {
      console.error('❌ API: No product data found for ID:', productId)
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    console.log('✅ API: Successfully fetched product data')
    return NextResponse.json(productData, { headers: corsHeaders })

  } catch (error) {
    console.error('❌ API: Error fetching product data:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch product data' },
      { status: 500, headers: corsHeaders }
    )
  }
}