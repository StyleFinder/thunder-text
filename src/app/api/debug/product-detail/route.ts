import { NextRequest, NextResponse } from 'next/server'
import { createCorsHeaders } from '@/lib/middleware/cors'
import { getAccessToken } from '@/lib/shopify-auth'
import { logger } from '@/lib/logger'
import { guardDebugRoute } from '../_middleware-guard'

export async function GET(request: NextRequest) {
  const guardResponse = guardDebugRoute('/api/debug/product-detail');
  if (guardResponse) return guardResponse;
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

    // Get access token using proper Token Exchange
    let accessToken: string
    try {
      accessToken = await getAccessToken(fullShop, sessionToken)
    } catch (error) {
      logger.error('❌ Failed to get access token:', error as Error, { component: 'product-detail' })
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


    const response = await client.request<{ product?: { title?: string; [key: string]: unknown } }>(query, { id: formattedProductId })

    if (!response?.product) {
      logger.error('❌ No product found in response', undefined, { component: 'product-detail' })
      return NextResponse.json({
        success: false,
        error: 'Product not found',
        productId: formattedProductId,
        response
      }, { status: 404, headers: corsHeaders })
    }


    return NextResponse.json({
      success: true,
      product: response.product,
      message: `Successfully fetched product: ${response.product.title}`
    }, { headers: corsHeaders })

  } catch (error) {
    logger.error('❌ Error in debug endpoint:', error as Error, { component: 'product-detail' })
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch product',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500, headers: corsHeaders })
  }
}