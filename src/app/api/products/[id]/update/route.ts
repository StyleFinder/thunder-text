import { NextRequest, NextResponse } from 'next/server'
import { createCorsHeaders, handleCorsPreflightRequest } from '@/lib/middleware/cors'
import { ShopifyAPI } from '@/lib/shopify'

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request)
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const corsHeaders = createCorsHeaders(request)
  const productId = params.id

  try {
    const body = await request.json()
    const { shop, updates } = body

    if (!shop || !updates) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('📝 Updating product:', productId, updates)

    // Get the access token from environment variable
    // In production, you'd get this from your database for the specific shop
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN

    if (!accessToken) {
      console.error('❌ No access token available for shop:', shop)
      return NextResponse.json(
        { error: 'Shop not authenticated' },
        { status: 401, headers: corsHeaders }
      )
    }

    // Initialize Shopify API client
    const shopifyAPI = new ShopifyAPI(shop, accessToken)

    // Prepare the update input
    const updateInput: any = {}

    if (updates.title) {
      updateInput.title = updates.title
    }

    if (updates.description) {
      // Shopify uses descriptionHtml for HTML content
      updateInput.descriptionHtml = updates.description
    }

    // Prepare metafields for SEO and bullet points
    const metafields = []

    if (updates.seoTitle) {
      metafields.push({
        namespace: 'global',
        key: 'title_tag',
        value: updates.seoTitle,
        type: 'single_line_text_field'
      })
    }

    if (updates.seoDescription) {
      metafields.push({
        namespace: 'global',
        key: 'description_tag',
        value: updates.seoDescription,
        type: 'multi_line_text_field'
      })
    }

    if (updates.bulletPoints && Array.isArray(updates.bulletPoints)) {
      metafields.push({
        namespace: 'thunder_text',
        key: 'bullet_points',
        value: JSON.stringify(updates.bulletPoints),
        type: 'json'
      })
    }

    // Add metafields to the update input if any
    if (metafields.length > 0) {
      updateInput.metafields = metafields
    }

    // Update the product
    const gid = `gid://shopify/Product/${productId}`

    try {
      const result = await shopifyAPI.updateProduct(gid, updateInput)

      if (result.productUpdate?.userErrors?.length > 0) {
        console.error('Product update errors:', result.productUpdate.userErrors)
        return NextResponse.json(
          {
            error: 'Failed to update product',
            details: result.productUpdate.userErrors
          },
          { status: 400, headers: corsHeaders }
        )
      }

      console.log('✅ Product updated successfully:', productId)

      return NextResponse.json(
        {
          success: true,
          message: 'Product updated successfully',
          productId,
          product: result.productUpdate?.product
        },
        { headers: corsHeaders }
      )

    } catch (graphqlError) {
      console.error('GraphQL error:', graphqlError)
      return NextResponse.json(
        {
          error: 'Failed to update product in Shopify',
          details: graphqlError instanceof Error ? graphqlError.message : 'Unknown GraphQL error'
        },
        { status: 500, headers: corsHeaders }
      )
    }

  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    )
  }
}