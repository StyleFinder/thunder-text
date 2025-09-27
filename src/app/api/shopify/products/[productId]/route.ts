import { NextRequest, NextResponse } from 'next/server'
import { getShopToken } from '@/lib/shopify/token-manager'
import { shopifyGraphQL } from '@/lib/shopify/client'

// GET /api/shopify/products/[productId]?shop={shop}
// Fetch a single product by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get('shop')
    const { productId } = params

    if (!shop) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: shop' },
        { status: 400 }
      )
    }

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: productId' },
        { status: 400 }
      )
    }

    // Validate productId - prevent invalid values
    const invalidProductIds = ['undefined', 'null', 'metafields', 'staging-test']
    if (invalidProductIds.includes(productId.toLowerCase())) {
      console.error('❌ Invalid productId received:', productId)
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid product ID',
          details: `Product ID "${productId}" is not valid`
        },
        { status: 400 }
      )
    }

    console.log('🔄 Fetching single product from Shopify:', { shop, productId })

    // Get session token from Authorization header if provided
    const authHeader = request.headers.get('authorization')
    const sessionToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined

    // Format product ID for GraphQL
    let formattedProductId = productId
    if (!productId.startsWith('gid://')) {
      formattedProductId = `gid://shopify/Product/${productId}`
    }

    // GraphQL query to fetch single product
    const query = `
      query GetProduct($id: ID!) {
        product(id: $id) {
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
    `

    // Execute GraphQL query
    const response = await shopifyGraphQL(
      query,
      { id: formattedProductId },
      shop,
      sessionToken
    )

    if (!response?.data?.product) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product not found',
          productId: formattedProductId
        },
        { status: 404 }
      )
    }

    const product = response.data.product

    // Transform to consistent format
    const transformedProduct = {
      id: product.id,
      title: product.title,
      handle: product.handle,
      description: product.description || '',
      status: product.status?.toLowerCase() || 'active',
      tags: product.tags || [],
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      price: product.variants?.edges[0]?.node?.price ||
             product.priceRangeV2?.minVariantPrice?.amount || '0.00',
      images: product.images?.edges?.map((edge: any) => ({
        url: edge.node.url,
        altText: edge.node.altText
      })) || []
    }

    console.log('✅ Product fetched successfully:', transformedProduct.title)

    return NextResponse.json({
      success: true,
      data: transformedProduct,
      message: 'Product fetched successfully'
    })

  } catch (error) {
    console.error('❌ Error fetching product:', error)

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('Access token not available')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Authentication required. Please ensure the app is properly installed.',
            requiresAuth: true
          },
          { status: 401 }
        )
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch product',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}