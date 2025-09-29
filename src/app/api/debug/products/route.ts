import { NextRequest, NextResponse } from 'next/server'
import { createCorsHeaders } from '@/lib/middleware/cors'

export async function GET(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request)

  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get('shop') || 'zunosai-staging-test-store.myshopify.com'

    // Get session token from Authorization header
    const authHeader = request.headers.get('authorization')
    const sessionToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined

    console.log('🔍 Debug Products API:', {
      shop,
      hasSessionToken: !!sessionToken,
      tokenLength: sessionToken?.length,
      authHeader: authHeader?.substring(0, 50) + '...'
    })

    // Try to get access token
    const { getAccessToken } = await import('@/lib/shopify-auth')
    let accessToken: string

    try {
      accessToken = await getAccessToken(shop, sessionToken)
      console.log('✅ Got access token successfully')
    } catch (error) {
      console.error('❌ Failed to get access token:', error)
      return NextResponse.json({
        success: false,
        error: 'Authentication failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        shop,
        hasSessionToken: !!sessionToken
      }, { status: 401, headers: corsHeaders })
    }

    // Make a simple GraphQL query to get products
    const { GraphQLClient } = await import('graphql-request')
    const client = new GraphQLClient(
      `https://${shop}/admin/api/2025-01/graphql.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      }
    )

    const query = `
      query {
        products(first: 10) {
          edges {
            node {
              id
              title
              status
            }
          }
          pageInfo {
            hasNextPage
          }
        }
      }
    `

    console.log('📊 Making GraphQL query to Shopify...')
    const response = await client.request(query)
    console.log('📦 GraphQL Response:', JSON.stringify(response, null, 2))

    const productCount = response.products?.edges?.length || 0
    const products = response.products?.edges?.map((edge: any) => ({
      id: edge.node.id,
      title: edge.node.title,
      status: edge.node.status
    })) || []

    return NextResponse.json({
      success: true,
      debug: {
        shop,
        hasSessionToken: !!sessionToken,
        hasAccessToken: !!accessToken,
        productCount,
        hasMoreProducts: response.products?.pageInfo?.hasNextPage || false
      },
      products,
      message: productCount > 0
        ? `Found ${productCount} products in store`
        : 'No products found in store - store might be empty'
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('❌ Debug endpoint error:', error)
    return NextResponse.json({
      success: false,
      error: 'Debug endpoint failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500, headers: corsHeaders })
  }
}