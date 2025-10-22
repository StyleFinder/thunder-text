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

    // First, let's check what access we have
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

    // Check the shop and current app installation
    const shopQuery = `
      query {
        shop {
          name
          id
        }
        currentAppInstallation {
          id
          accessScopes {
            handle
          }
        }
      }
    `

    interface ShopResponse {
      shop?: { name?: string; id?: string }
      currentAppInstallation?: {
        id?: string
        accessScopes?: Array<{ handle?: string }>
      }
    }

    console.log('📊 Checking shop and scopes...')
    const shopResponse = await client.request<ShopResponse>(shopQuery)
    console.log('🏪 Shop info:', JSON.stringify(shopResponse, null, 2))

    // Now try to get products with different query approaches
    const query = `
      query {
        products(first: 10, query: "status:active") {
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

    interface ProductNode {
      id: string
      title: string
      status: string
    }

    interface ProductsResponse {
      products?: {
        edges?: Array<{ node: ProductNode }>
        pageInfo?: { hasNextPage?: boolean }
      }
    }

    console.log('📊 Making GraphQL query to Shopify...')
    const response = await client.request<ProductsResponse>(query)
    console.log('📦 GraphQL Response:', JSON.stringify(response, null, 2))

    const productCount = response.products?.edges?.length || 0
    const products = response.products?.edges?.map((edge: { node: ProductNode }) => ({
      id: edge.node.id,
      title: edge.node.title,
      status: edge.node.status
    })) || []

    // Also try REST API as a comparison
    let restProducts = []
    try {
      const restUrl = `https://${shop}/admin/api/2025-01/products.json?limit=10`
      const restResponse = await fetch(restUrl, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        }
      })
      const restData = await restResponse.json()
      restProducts = restData.products || []
      console.log('🔄 REST API products count:', restProducts.length)
    } catch (restError) {
      console.error('REST API error:', restError)
    }

    return NextResponse.json({
      success: true,
      debug: {
        shop,
        hasSessionToken: !!sessionToken,
        hasAccessToken: !!accessToken,
        accessScopes: shopResponse.currentAppInstallation?.accessScopes || [],
        shopName: shopResponse.shop?.name,
        graphqlProductCount: productCount,
        restProductCount: restProducts.length,
        hasMoreProducts: response.products?.pageInfo?.hasNextPage || false
      },
      products,
      restProducts: restProducts.slice(0, 3).map((p: {
        id: string | number
        title: string
        status: string
      }) => ({
        id: p.id,
        title: p.title,
        status: p.status
      })),
      message: productCount > 0
        ? `Found ${productCount} products in store`
        : 'Check if app has read_products scope and is properly installed'
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