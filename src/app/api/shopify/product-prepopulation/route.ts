import { NextRequest, NextResponse } from 'next/server'
import { fetchProductDataForPrePopulation } from '@/lib/shopify/product-prepopulation'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get('productId')
    const shop = searchParams.get('shop')

    if (!productId || !shop) {
      return NextResponse.json(
        { error: 'Missing productId or shop parameter' },
        { status: 400 }
      )
    }

    console.log('📦 API: Fetching product data for prepopulation:', { productId, shop })

    // This will run server-side where environment variables are available
    const productData = await fetchProductDataForPrePopulation(productId, shop)

    if (!productData) {
      console.error('❌ API: No product data found for ID:', productId)
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    console.log('✅ API: Successfully fetched product data')
    return NextResponse.json(productData)

  } catch (error) {
    console.error('❌ API: Error fetching product data:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch product data' },
      { status: 500 }
    )
  }
}