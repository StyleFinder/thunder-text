import { NextRequest, NextResponse } from 'next/server'

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
    const authBypass = process.env.SHOPIFY_AUTH_BYPASS === 'true'

    if (!shop) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: shop' },
        { status: 400 }
      )
    }

    console.log('🔄 Fetching products from Shopify:', { 
      shop, page, limit, query, status, sort, authBypass 
    })

    // Development mode with auth bypass - return mock data
    if (authBypass && process.env.NODE_ENV === 'development') {
      console.log('🧪 Development mode: returning mock products data')
      
      // Generate mock products that match the expected structure
      const mockProducts = [
        {
          id: '8123456789',
          title: 'Effortless Elegance: Wrinkle-Resistant Tops',
          handle: 'effortless-elegance-wrinkle-resistant-tops',
          description: 'Step into a world of effortless elegance with these wrinkle-resistant tops, crafted from a luxurious blend of premium fabrics.',
          status: 'active',
          tags: ['wrinkle-resistant tops', 'women\'s fashion'],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-15T00:00:00Z',
          price: '49.99',
          images: [
            {
              url: 'https://cdn.shopify.com/s/files/1/0234/567/890/products/elegant-top-1.jpg',
              altText: 'Elegant wrinkle-resistant top in navy blue'
            }
          ]
        },
        {
          id: '8123456790',
          title: 'Premium Cotton Casual Shirt',
          handle: 'premium-cotton-casual-shirt',
          description: 'Comfortable and stylish casual shirt made from 100% premium cotton.',
          status: 'active',
          tags: ['cotton shirt', 'casual wear'],
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-16T00:00:00Z',
          price: '39.99',
          images: [
            {
              url: 'https://cdn.shopify.com/s/files/1/0234/567/890/products/cotton-shirt-1.jpg',
              altText: 'Premium cotton casual shirt in white'
            }
          ]
        },
        {
          id: '8123456791',
          title: 'Designer Leather Handbag',
          handle: 'designer-leather-handbag',
          description: 'Luxury designer handbag crafted from genuine Italian leather.',
          status: 'active',
          tags: ['leather handbag', 'luxury accessories'],
          createdAt: '2024-01-03T00:00:00Z',
          updatedAt: '2024-01-17T00:00:00Z',
          price: '199.99',
          images: [
            {
              url: 'https://cdn.shopify.com/s/files/1/0234/567/890/products/leather-handbag-1.jpg',
              altText: 'Designer leather handbag in brown'
            }
          ]
        }
      ]

      // Filter products based on query if provided
      let filteredProducts = mockProducts
      if (query.trim()) {
        filteredProducts = mockProducts.filter(product => 
          product.title.toLowerCase().includes(query.toLowerCase()) ||
          product.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
        )
      }

      return NextResponse.json({
        success: true,
        data: {
          products: filteredProducts,
          total: filteredProducts.length,
          page,
          limit,
          hasNextPage: false,
          hasPreviousPage: false
        },
        message: 'Products fetched successfully (development mode)'
      })
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
      queryString += `title:*${query.trim()}* OR tag:*${query.trim()}*`
    }
    if (status && status !== 'active,draft,archived') {
      const statusFilters = status.split(',')
      const statusQuery = statusFilters.map(s => `status:${s}`).join(' OR ')
      queryString += queryString ? ` AND (${statusQuery})` : statusQuery
    }

    const variables = {
      first: limit,
      after: page > 1 ? null : null, // For pagination, we'd need to track cursors
      query: queryString || null,
      sortKey: shopifySort.sortKey,
      reverse: shopifySort.reverse
    }

    // Make request to Shopify Admin API
    const shopifyResponse = await fetch(`https://${shop}.myshopify.com/admin/api/2023-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN || ''
      },
      body: JSON.stringify({
        query: graphqlQuery,
        variables
      })
    })

    if (!shopifyResponse.ok) {
      throw new Error(`Shopify API error: ${shopifyResponse.statusText}`)
    }

    const shopifyData = await shopifyResponse.json()

    if (shopifyData.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(shopifyData.errors)}`)
    }

    const products = shopifyData.data.products.edges.map((edge: any) => {
      const product = edge.node
      return {
        id: product.id.replace('gid://shopify/Product/', ''),
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