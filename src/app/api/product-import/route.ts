import { NextRequest, NextResponse } from 'next/server'
import { importProductData, detectProductCategory, generateSuggestedKeywords, analyzeExistingDescription } from '@/lib/product-data-import'

export async function GET(request: NextRequest) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Shopify-Shop-Domain, X-Shopify-Access-Token',
  }

  try {
    const url = new URL(request.url)
    const productId = url.searchParams.get('productId')
    const shopDomain = request.headers.get('X-Shopify-Shop-Domain')
    const accessToken = request.headers.get('X-Shopify-Access-Token')

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    if (!shopDomain || !accessToken) {
      return NextResponse.json(
        { error: 'Missing authentication headers' },
        { status: 401, headers: corsHeaders }
      )
    }

    // Import product data from Shopify
    const productData = await importProductData(productId, shopDomain, accessToken)

    // Generate additional insights
    const detectedCategory = detectProductCategory(productData)
    const suggestedKeywords = generateSuggestedKeywords(productData)
    const descriptionAnalysis = analyzeExistingDescription(productData.description)

    return NextResponse.json({
      success: true,
      data: {
        product: productData,
        insights: {
          detectedCategory,
          suggestedKeywords,
          descriptionAnalysis
        }
      }
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('Product import error:', error)
    
    return NextResponse.json(
      { error: 'Failed to import product data' },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Shopify-Shop-Domain, X-Shopify-Access-Token',
    },
  })
}