import { NextRequest, NextResponse } from 'next/server'
import { importProductData, detectProductCategory, generateSuggestedKeywords, analyzeExistingDescription } from '@/lib/product-data-import'
import { createCorsHeaders, handleCorsPreflightRequest } from '@/lib/middleware/cors'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request)

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
    logger.error('Product import error:', error as Error, { component: 'product-import' })
    
    return NextResponse.json(
      { error: 'Failed to import product data' },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request)
}