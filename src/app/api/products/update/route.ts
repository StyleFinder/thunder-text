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

    // Get session token from the request
    const sessionToken = request.headers.get('authorization')?.replace('Bearer ', '')

    // For the staging test store, we'll use a direct approach if no session token
    const isTestStore = shop.includes('zunosai-staging-test-store')

    if (!sessionToken && !isTestStore) {
      console.error('❌ No session token provided in request')
      return NextResponse.json(
        {
          error: 'Authentication required',
          details: 'Session token is missing. Please ensure you are accessing the app through Shopify admin.',
          shop
        },
        { status: 401, headers: corsHeaders }
      )
    }

    // Get access token
    let accessToken: string

    try {
      // For the test store, use the environment variable access token
      if (isTestStore && process.env.SHOPIFY_ACCESS_TOKEN) {
        console.log('✅ Using environment access token for test store')
        accessToken = process.env.SHOPIFY_ACCESS_TOKEN
      } else {
        // For production stores, try to get a stored offline token first
        const tokenResult = await getShopToken(shop)

        if (tokenResult.success && tokenResult.accessToken) {
          console.log('✅ Using stored offline access token for shop:', shop)
          accessToken = tokenResult.accessToken
        } else if (sessionToken) {
          // If no offline token, perform token exchange with the session token
          console.log('🔄 Performing token exchange for shop:', shop)

          const { exchangeToken } = await import('@/lib/shopify/token-exchange')
          const exchangeResult = await exchangeToken({
            shop,
            sessionToken,
            clientId: process.env.SHOPIFY_API_KEY!,
            clientSecret: process.env.SHOPIFY_API_SECRET!,
            requestedTokenType: 'offline'
          })

          console.log('✅ Token exchange successful, received access token')
          accessToken = exchangeResult.access_token

          // Save the token for future use
          const { saveShopToken } = await import('@/lib/shopify/token-manager')
          await saveShopToken(shop, accessToken, 'online', exchangeResult.scope)
        } else {
          throw new Error('No access token available and no session token provided')
        }
      }
    } catch (tokenError) {
      console.error('❌ Failed to obtain access token:', tokenError)
      return NextResponse.json(
        {
          error: 'Authentication failed',
          details: tokenError instanceof Error ? tokenError.message : 'Failed to authenticate with Shopify',
          shop
        },
        { status: 401, headers: corsHeaders }
      )
    }

    // Initialize Shopify API client with the access token
    console.log('🔐 Initializing Shopify API client for shop:', shop)
    const shopifyClient = new ShopifyAPI(shop, accessToken)

    // Prepare the update input for Shopify GraphQL
    const productInput: {
      title?: string
      descriptionHtml?: string
    } = {}

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
    let updateResult: { productUpdate?: { product?: unknown; userErrors?: unknown[] } } | undefined
    try {
      console.log('📤 Sending update to Shopify GraphQL API...')
      updateResult = await shopifyClient.updateProduct(productId, productInput) as { productUpdate?: { product?: unknown; userErrors?: unknown[] } }
      console.log('📥 Shopify API response received:', {
        hasProduct: !!updateResult.productUpdate?.product,
        hasErrors: !!updateResult.productUpdate?.userErrors?.length
      })
    } catch (apiError) {
      console.error('❌ Shopify API call failed:', apiError)
      throw new Error(`Shopify API error: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`)
    }

    if (updateResult.productUpdate?.userErrors && updateResult.productUpdate.userErrors.length > 0) {
      console.error('❌ Shopify API errors:', updateResult.productUpdate.userErrors)
      return NextResponse.json(
        {
          error: 'Failed to update product',
          details: (updateResult.productUpdate.userErrors as Array<{ message: string }>).map(e => e.message).join(', '),
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