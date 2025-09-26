import { NextRequest, NextResponse } from 'next/server'
import { getShopToken } from '@/lib/shopify/token-manager'

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

    // Get the access token from database
    // Note: Session tokens from App Bridge are NOT valid Shopify API access tokens
    // They must be exchanged for access tokens via Token Exchange API
    let accessToken: string | undefined

    // Always get the permanent access token from database (obtained via Token Exchange)
    const tokenResult = await getShopToken(shop)
    if (tokenResult.success && tokenResult.accessToken) {
      accessToken = tokenResult.accessToken
      console.log('✅ Retrieved access token from database for shop:', shop)
    } else {
      // Fallback to environment variable for backward compatibility (dev/test only)
      accessToken = process.env.SHOPIFY_ACCESS_TOKEN
      if (accessToken && accessToken !== '' && accessToken !== 'placeholder-token') {
        console.log('⚠️ Using environment variable token (legacy)')
      } else {
        accessToken = undefined
        console.log('❌ No access token found in database for shop:', shop)
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

    // Only show demo products if explicitly requested (for testing)
    const useDemoMode = searchParams.get('demo') === 'true'
    if (useDemoMode) {
      console.log('🧪 Demo mode explicitly requested')

      // Generate comprehensive mock products that match the expected structure
      const mockProducts = [
        {
          id: 'gid://shopify/Product/8123456789',
          title: 'Effortless Elegance: Wrinkle-Resistant Tops',
          handle: 'effortless-elegance-wrinkle-resistant-tops',
          description: 'Step into a world of effortless elegance with these wrinkle-resistant tops, crafted from a luxurious blend of premium fabrics. Perfect for the modern professional who values style and convenience.',
          status: 'active',
          tags: ['wrinkle-resistant tops', 'women\'s fashion', 'professional', 'easy-care'],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-15T00:00:00Z',
          price: '49.99',
          images: [
            {
              url: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800',
              altText: 'Elegant wrinkle-resistant top in navy blue'
            }
          ]
        },
        {
          id: 'gid://shopify/Product/8123456790',
          title: 'Premium Cotton Casual Shirt',
          handle: 'premium-cotton-casual-shirt',
          description: 'Comfortable and stylish casual shirt made from 100% premium cotton. Breathable fabric perfect for all-day wear.',
          status: 'active',
          tags: ['cotton shirt', 'casual wear', 'comfortable', 'breathable'],
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-16T00:00:00Z',
          price: '39.99',
          images: [
            {
              url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800',
              altText: 'Premium cotton casual shirt in white'
            }
          ]
        },
        {
          id: 'gid://shopify/Product/8123456791',
          title: 'Designer Leather Handbag',
          handle: 'designer-leather-handbag',
          description: 'Luxury designer handbag crafted from genuine Italian leather. Features multiple compartments and gold-plated hardware for the ultimate in sophistication.',
          status: 'active',
          tags: ['leather handbag', 'luxury accessories', 'Italian leather', 'designer'],
          createdAt: '2024-01-03T00:00:00Z',
          updatedAt: '2024-01-17T00:00:00Z',
          price: '199.99',
          images: [
            {
              url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800',
              altText: 'Designer leather handbag in brown'
            }
          ]
        },
        {
          id: 'gid://shopify/Product/8123456792',
          title: 'Organic Cotton T-Shirt',
          handle: 'organic-cotton-t-shirt',
          description: 'Sustainable and comfortable t-shirt made from 100% organic cotton. Eco-friendly dyes and ethical manufacturing.',
          status: 'active',
          tags: ['organic', 'cotton', 't-shirt', 'sustainable', 'eco-friendly'],
          createdAt: '2024-01-04T00:00:00Z',
          updatedAt: '2024-01-18T00:00:00Z',
          price: '29.99',
          images: [
            {
              url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800',
              altText: 'Organic cotton t-shirt in natural color'
            }
          ]
        },
        {
          id: 'gid://shopify/Product/8123456793',
          title: 'Vintage Denim Jacket',
          handle: 'vintage-denim-jacket',
          description: 'Classic vintage-style denim jacket with modern comfort. Pre-washed for softness and featuring brass buttons.',
          status: 'active',
          tags: ['denim', 'jacket', 'vintage', 'outerwear'],
          createdAt: '2024-01-05T00:00:00Z',
          updatedAt: '2024-01-19T00:00:00Z',
          price: '79.99',
          images: [
            {
              url: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800',
              altText: 'Vintage denim jacket in classic blue'
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
        message: accessToken ? 'Products fetched successfully (development mode)' : 'Products fetched successfully (demo mode)'
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