import { NextRequest, NextResponse } from 'next/server'
import { getShopToken } from '@/lib/shopify/token-manager'
import { getOrExchangeToken } from '@/lib/shopify/token-exchange'

// GET /api/shopify/products?shop={shop}&page={page}&limit={limit}&query={query}&status={status}&sort={sort}
export async function GET(request: NextRequest) {
  // Check if we're in a build environment without proper configuration
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co') {
    return NextResponse.json(
      { error: 'Application not properly configured' },
      { status: 503 }
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
        { status: 400 }
      )
    }

    console.log('🔄 Fetching products from Shopify:', {
      shop, page, limit, query, status, sort
    })

    // Get session token from Authorization header if provided
    const authHeader = request.headers.get('authorization')
    const sessionToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined

    console.log('🔑 Session token present:', !!sessionToken)

    // Get the access token - try database first, then Token Exchange if needed
    let accessToken: string | undefined

    // First, always try to get from database (for non-embedded access)
    const dbTokenResult = await getShopToken(shop)
    if (dbTokenResult.success && dbTokenResult.accessToken) {
      accessToken = dbTokenResult.accessToken
      console.log('✅ Using stored access token from database')
    } else if (sessionToken) {
      // If no database token but we have a session token, try Token Exchange
      console.log('🔄 No database token, attempting Token Exchange')
      try {
        accessToken = await getOrExchangeToken(shop, sessionToken)
        console.log('✅ Access token obtained via Token Exchange')
      } catch (tokenError) {
        console.error('❌ Token Exchange failed:', tokenError)

        // Check for specific error types
        if (tokenError instanceof Error) {
          // Missing API credentials - configuration issue
          if (tokenError.message.includes('Missing Shopify API credentials')) {
            return NextResponse.json(
              {
                success: false,
                error: 'Server configuration error. Shopify API credentials not configured in environment.',
                details: 'Please contact support or check Vercel environment variables.',
                requiresConfig: true
              },
              { status: 500 }
            )
          }

          // Invalid session token
          if (tokenError.message.includes('Invalid session token') ||
              tokenError.message.includes('expired session token')) {
            return NextResponse.json(
              {
                success: false,
                error: 'Session expired. Please refresh the page.',
                requiresAuth: true
              },
              { status: 401 }
            )
          }
        }
      }
    }

    // IMPORTANT: We now require a valid token for all product fetches
    // No more demo mode or auth bypass
    if (!accessToken) {
      console.error('❌ No access token available for shop:', shop)
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required. Please install the app through Shopify.',
          requiresAuth: true
        },
        { status: 401 }
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

    // Build query string for filtering
    let queryString = ''
    if (query.trim()) {
      queryString = `title:*${query.trim()}* OR tag:*${query.trim()}*`
    }
    // Note: Status filtering will be done after fetching since GraphQL status queries are unreliable
    console.log('🔍 Fetching products with query:', queryString || '(all)')

    const variables = {
      first: limit,
      after: page > 1 ? null : null, // For pagination, we'd need to track cursors
      query: queryString || null,
      sortKey: shopifySort.sortKey,
      reverse: shopifySort.reverse
    }

    // Make request to Shopify Admin API
    const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`
    const shopifyUrl = `https://${shopDomain}/admin/api/2025-01/graphql.json`

    console.log('📡 Calling Shopify API:', {
      url: shopifyUrl,
      hasToken: !!accessToken,
      tokenPreview: accessToken ? accessToken.substring(0, 15) + '...' : null
    })

    const shopifyResponse = await fetch(shopifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken
      },
      body: JSON.stringify({
        query: graphqlQuery,
        variables
      })
    })

    const responseText = await shopifyResponse.text()

    if (!shopifyResponse.ok) {
      console.error('❌ Shopify API error:', {
        status: shopifyResponse.status,
        statusText: shopifyResponse.statusText,
        response: responseText.substring(0, 500)
      })
      throw new Error(`Shopify API error: ${shopifyResponse.status} ${shopifyResponse.statusText}`)
    }

    let shopifyData
    try {
      shopifyData = JSON.parse(responseText)
    } catch (e) {
      console.error('❌ Failed to parse Shopify response:', responseText.substring(0, 500))
      throw new Error('Invalid JSON response from Shopify')
    }

    if (shopifyData.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(shopifyData.errors)}`)
    }

    const allProducts = shopifyData.data.products.edges.map((edge: any) => {
      const product = edge.node
      return {
        id: product.id, // Keep the full GraphQL ID format
        title: product.title,
        handle: product.handle,
        description: product.description || '',
        status: product.status.toLowerCase(),
        tags: product.tags,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        price: product.variants.edges[0]?.node.price || product.priceRangeV2.minVariantPrice.amount,
        images: product.images.edges.map((imageEdge: any) => ({
          url: imageEdge.node.url,
          altText: imageEdge.node.altText
        }))
      }
    })

    // Filter to show both draft AND active products
    // This allows editing descriptions for new products (draft) and updating existing products (active)
    // Exclude only archived products
    const products = allProducts.filter((product: any) =>
      product.status === 'draft' || product.status === 'active'
    )

    console.log(`📦 Filtered products: ${products.length} (draft + active) out of ${allProducts.length} total`)

    // Calculate total for pagination (simplified - in production you'd need a separate count query)
    const total = products.length + (shopifyData.data.products.pageInfo.hasNextPage ? limit : 0)

    console.log('✅ Products fetched successfully:', {
      count: products.length,
      total,
      hasNextPage: shopifyData.data.products.pageInfo.hasNextPage
    })

    return NextResponse.json({
      success: true,
      data: {
        products,
        total,
        page,
        limit,
        hasNextPage: shopifyData.data.products.pageInfo.hasNextPage,
        hasPreviousPage: page > 1
      },
      message: 'Products fetched successfully'
    })

  } catch (error) {
    console.error('❌ Error fetching products:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch products',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function mapSortToShopify(field: string, direction: string) {
  const sortKey = (() => {
    switch (field) {
      case 'title': return 'TITLE'
      case 'created_at': return 'CREATED_AT'
      case 'updated_at': return 'UPDATED_AT'
      case 'price': return 'PRICE'
      default: return 'UPDATED_AT'
    }
  })()

  const reverse = direction === 'desc'

  return { sortKey, reverse }
}