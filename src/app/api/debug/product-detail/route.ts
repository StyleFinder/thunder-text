import { NextRequest, NextResponse } from 'next/server'
import { createCorsHeaders } from '@/lib/middleware/cors'
import { getAccessToken } from '@/lib/shopify-auth'

export async function GET(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request)

  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get('shop') || 'zunosai-staging-test-store.myshopify.com'
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json({
        success: false,
        error: 'productId is required'
      }, { status: 400, headers: corsHeaders })
    }

    // Get session token from Authorization header
    const authHeader = request.headers.get('authorization')
    const sessionToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined

    // Ensure shop has .myshopify.com
    const fullShop = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`

    console.log('🔍 Debug Product Detail - fetching for:', {
      shop: fullShop,
      productId,
      hasSessionToken: !!sessionToken
    })

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
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 401, headers: corsHeaders })
    }

    // Format product ID for GraphQL
    let formattedProductId = productId
    if (!productId.startsWith('gid://')) {
      formattedProductId = `gid://shopify/Product/${productId}`
    }

    console.log('📝 Formatted product ID:', formattedProductId)

    // Test with a simple product query
    const { GraphQLClient } = await import('graphql-request')
    const client = new GraphQLClient(
      `https://${fullShop}/admin/api/2025-01/graphql.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      }
    )

    const query = `
      query GetProduct($id: ID!) {
        product(id: $id) {
          id
          title
          handle
          description
          vendor
          productType
          tags
          images(first: 5) {
            edges {
              node {
                url
                altText
              }
            }
          }
        }
      }
    `

    console.log('🔍 Executing query with ID:', formattedProductId)

    const response = await client.request(query, { id: formattedProductId })

    if (!response?.product) {
      console.error('❌ No product found in response')
      return NextResponse.json({
        success: false,
        error: 'Product not found',
        productId: formattedProductId,
        response
      }, { status: 404, headers: corsHeaders })
    }

    console.log('✅ Product found:', response.product.title)

    return NextResponse.json({
      success: true,
      product: response.product,
      message: `Successfully fetched product: ${response.product.title}`
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('❌ Error in debug endpoint:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch product',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500, headers: corsHeaders })
  }
}