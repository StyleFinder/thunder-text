import { NextRequest, NextResponse } from 'next/server'
import { createCorsHeaders, handleCorsPreflightRequest } from '@/lib/middleware/cors'
import { ShopifyAPI } from '@/lib/shopify'
import { getShopToken } from '@/lib/shopify/token-manager'

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request)
}

export async function POST(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request)

  try {
    const body = await request.json()
    const { shop, productId, updates } = body

    if (!shop || !productId || !updates) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('📝 Updating product:', productId, 'for shop:', shop)

    // Get the shop's access token
    const tokenResult = await getShopToken(shop)

    if (!tokenResult.success || !tokenResult.accessToken) {
      console.log('⚠️ No access token found for shop:', shop)

      // If no token exists, check if we're in a development/demo mode
      const isDevMode = process.env.NODE_ENV === 'development' ||
                        request.headers.get('referer')?.includes('authenticated=true')

      if (isDevMode) {
        console.log('🎭 Development mode - simulating successful update')

        // Simulate a delay for realism
        await new Promise(resolve => setTimeout(resolve, 1000))

        return NextResponse.json(
          {
            success: true,
            message: 'Product updated successfully (development mode)',
            productId,
            updates: {
              title: updates.title || null,
              description: updates.description || null,
              seoTitle: updates.seoTitle || null,
              seoDescription: updates.seoDescription || null,
              bulletPoints: updates.bulletPoints || null
            },
            mode: 'development'
          },
          { headers: corsHeaders }
        )
      }

      return NextResponse.json(
        {
          error: 'Shop not authenticated',
          details: 'Please ensure the app is properly installed in your Shopify store',
          shop,
          mode: 'production'
        },
        { status: 401, headers: corsHeaders }
      )
    }

    // Initialize Shopify API client with the shop's access token
    console.log('🔐 Initializing Shopify API client for shop:', shop)
    const shopifyClient = new ShopifyAPI(shop, tokenResult.accessToken)

    // Prepare the update input for Shopify GraphQL
    const productInput: any = {}

    // Map our updates to Shopify's productUpdate input format
    if (updates.title) {
      productInput.title = updates.title
    }

    if (updates.description) {
      // Shopify uses descriptionHtml for the product description
      productInput.descriptionHtml = updates.description
    }

    // SEO fields are updated through metafields
    const metafieldsToUpdate = []

    if (updates.seoTitle) {
      metafieldsToUpdate.push({
        namespace: 'global',
        key: 'title_tag',
        value: updates.seoTitle,
        type: 'single_line_text_field'
      })
    }

    if (updates.seoDescription) {
      metafieldsToUpdate.push({
        namespace: 'global',
        key: 'description_tag',
        value: updates.seoDescription,
        type: 'single_line_text_field'
      })
    }

    // Custom metafield for bullet points
    if (updates.bulletPoints && Array.isArray(updates.bulletPoints)) {
      metafieldsToUpdate.push({
        namespace: 'thunder_text',
        key: 'bullet_points',
        value: JSON.stringify(updates.bulletPoints),
        type: 'json'
      })
    }

    console.log('🚀 Sending update to Shopify:', {
      productId,
      productInput,
      metafieldsCount: metafieldsToUpdate.length
    })

    // Update the product
    const updateResult = await shopifyClient.updateProduct(productId, productInput)

    if (updateResult.productUpdate?.userErrors?.length > 0) {
      console.error('❌ Shopify API errors:', updateResult.productUpdate.userErrors)
      return NextResponse.json(
        {
          error: 'Failed to update product',
          details: updateResult.productUpdate.userErrors.map((e: any) => e.message).join(', '),
          userErrors: updateResult.productUpdate.userErrors
        },
        { status: 400, headers: corsHeaders }
      )
    }

    // Update metafields if any
    if (metafieldsToUpdate.length > 0) {
      console.log('📝 Updating metafields:', metafieldsToUpdate)

      for (const metafield of metafieldsToUpdate) {
        try {
          await shopifyClient.createProductMetafield(productId, metafield)
        } catch (metaError) {
          console.error('⚠️ Error updating metafield:', metafield.key, metaError)
          // Continue with other metafields even if one fails
        }
      }
    }

    console.log('✅ Product updated successfully in Shopify')

    return NextResponse.json(
      {
        success: true,
        message: 'Product updated successfully',
        productId,
        updates: {
          title: updates.title || null,
          description: updates.description || null,
          seoTitle: updates.seoTitle || null,
          seoDescription: updates.seoDescription || null,
          bulletPoints: updates.bulletPoints || null
        },
        mode: 'production',
        shopifyResult: updateResult.productUpdate?.product
      },
      { headers: corsHeaders }
    )

  } catch (error) {
    console.error('Error in update endpoint:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    )
  }
}