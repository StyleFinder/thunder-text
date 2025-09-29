import { NextRequest, NextResponse } from 'next/server'
import { getAccessToken } from '@/lib/shopify-auth'
import { createCorsHeaders, handleCorsPreflightRequest } from '@/lib/middleware/cors'

// OPTIONS handler for CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request)
}

// GET /api/shopify/products?shop={shop}&page={page}&limit={limit}&query={query}&status={status}&sort={sort}
export async function GET(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request)

  // Log environment status for debugging
  console.log('🔍 Environment check:', {
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    nodeEnv: process.env.NODE_ENV,
    platform: process.env.VERCEL ? 'Vercel' : 'Local'
  })

  // Only fail on obvious placeholder values, not missing env vars
  if (process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co') {
    return NextResponse.json(
      {
        error: 'Application not properly configured',
        details: 'Placeholder configuration detected'
      },
      { status: 503, headers: corsHeaders }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get('shop')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const query = searchParams.get('query') || ''
    const status = searchParams.get('status') || 'active'
    const sort = searchParams.get('sort') || 'updated_at_desc'

    if (!shop) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: shop' },
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('🔄 Fetching products from Shopify:', {
      shop, page, limit, query, status, sort
    })

    // Get session token from Authorization header if provided
    const authHeader = request.headers.get('authorization')
    const sessionToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined

    console.log('🔑 Session token present:', !!sessionToken)
    console.log('🏪 Shop:', shop)

    // Get the access token using official Shopify authentication
    let accessToken: string
    try {
      // For embedded apps, we need to handle session tokens properly
      if (sessionToken) {
        console.log('📱 Using session token for embedded app authentication')
      }

      accessToken = await getAccessToken(shop, sessionToken)
      console.log('✅ Got access token successfully')
    } catch (error) {
      console.error('❌ Failed to get access token:', error)

      // Return appropriate error response
      if (error instanceof Error) {
        if (error.message.includes('expired') || error.message.includes('invalid')) {
          return NextResponse.json(
            {
              success: false,
              error: 'Session expired. Please refresh the page.',
              requiresAuth: true
            },
            { status: 401, headers: corsHeaders }
          )
        }
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Authentication failed. Please ensure the app is installed.',
          requiresAuth: true
        },
        { status: 401, headers: corsHeaders }
      )
    }

    // Build GraphQL query for products
    const [sortField, sortDirection] = sort.split('_')
    const shopifySort = mapSortToShopify(sortField, sortDirection)

    const graphqlQuery = `
      query getProducts($first: Int!, $after: String, $query: String, $sortKey: ProductSortKeys!, $reverse: Boolean!) {
        products(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
          edges {
            cursor
            node {
              id
              title
              handle
              description
              status
              tags
              createdAt
              updatedAt
              priceRangeV2 {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              images(first: 5) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
              variants(first: 1) {
                edges {
                  node {
                    price
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
        }
      }
    `

    // Calculate pagination cursor
    let afterCursor = null
    if (page > 1) {
      // For simplicity, we'll fetch all pages up to the current one
      // In production, you'd want to store cursors
      console.log('📄 Fetching page:', page)
    }

    // Build query string for Shopify
    let shopifyQuery = ''
    if (query) {
      shopifyQuery += `title:*${query}* OR tag:*${query}*`
    }
    if (status !== 'all') {
      // Handle comma-separated statuses (e.g., "active,draft")
      const statuses = status.split(',').map(s => s.trim()).filter(s => s)
      if (statuses.length === 1) {
        shopifyQuery += shopifyQuery ? ` AND status:${statuses[0]}` : `status:${statuses[0]}`
      } else if (statuses.length > 1) {
        const statusQuery = statuses.map(s => `status:${s}`).join(' OR ')
        shopifyQuery += shopifyQuery ? ` AND (${statusQuery})` : `(${statusQuery})`
      }
    }

    // Make the API call using Shopify Admin API
    const { GraphQLClient } = await import('graphql-request')
    const client = new GraphQLClient(
      `https://${shop}.myshopify.com/admin/api/2025-01/graphql.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      }
    )

    const variables = {
      first: limit,
      after: afterCursor,
      query: shopifyQuery || null,
      sortKey: shopifySort.sortKey,
      reverse: shopifySort.reverse,
    }

    console.log('📊 GraphQL variables:', variables)

    const response = await client.request(graphqlQuery, variables)

    // Transform the response
    const products = response.products.edges.map((edge: any) => ({
      id: edge.node.id,
      title: edge.node.title,
      handle: edge.node.handle,
      description: edge.node.description || '',
      status: edge.node.status?.toLowerCase() || 'active',
      tags: edge.node.tags || [],
      createdAt: edge.node.createdAt,
      updatedAt: edge.node.updatedAt,
      price: edge.node.variants?.edges[0]?.node?.price ||
             edge.node.priceRangeV2?.minVariantPrice?.amount || '0.00',
      images: edge.node.images?.edges?.map((imgEdge: any) => ({
        url: imgEdge.node.url,
        altText: imgEdge.node.altText
      })) || [],
      cursor: edge.cursor,
    }))

    console.log(`✅ Fetched ${products.length} products`)

    return NextResponse.json({
      success: true,
      products,
      pageInfo: {
        page,
        limit,
        hasNextPage: response.products.pageInfo.hasNextPage,
        hasPreviousPage: response.products.pageInfo.hasPreviousPage,
        total: products.length, // Shopify doesn't provide total count easily
      },
      message: 'Products fetched successfully'
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('❌ Error fetching products:', error)

    // Check for specific error types
    if (error instanceof Error) {
      // GraphQL errors
      if (error.message.includes('Invalid API key or access token')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid access token. Please reinstall the app.',
            requiresAuth: true
          },
          { status: 401, headers: corsHeaders }
        )
      }

      // Network errors
      if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to connect to Shopify. Please try again.',
            details: 'Network connection issue'
          },
          { status: 503, headers: corsHeaders }
        )
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch products from Shopify',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    )
  }
}

// Helper function to map sort parameters to Shopify's format
function mapSortToShopify(field: string, direction: string): { sortKey: string; reverse: boolean } {
  const sortKeyMap: Record<string, string> = {
    'updated_at': 'UPDATED_AT',
    'created_at': 'CREATED_AT',
    'title': 'TITLE',
    'price': 'PRICE',
    'status': 'PRODUCT_TYPE',
  }

  return {
    sortKey: sortKeyMap[field] || 'UPDATED_AT',
    reverse: direction === 'desc'
  }
}