import { NextRequest, NextResponse } from 'next/server'
import { createMetafieldDefinitions } from '@/lib/google-metafield-definitions'
import { ShopifyOfficialAPI } from '@/lib/shopify-official'
import { getShopToken } from '@/lib/shopify/token-manager'

export async function POST(request: NextRequest) {
  // Check if we're in a build environment without proper configuration
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co') {
    return NextResponse.json(
      { error: 'Application not properly configured' },
      { status: 503 }
    )
  }

  try {
    const url = new URL(request.url)
    const shop = url.searchParams.get('shop')

    if (!shop) {
      return NextResponse.json({ error: 'Shop parameter required' }, { status: 400 })
    }

    // Get access token for shop
    let accessToken: string
    const authBypass = process.env.SHOPIFY_AUTH_BYPASS === 'true'

    if (authBypass) {
      // Development mode bypass
      console.log('Using auth bypass for metafield definitions setup')
      accessToken = process.env.SHOPIFY_ACCESS_TOKEN || ''
      if (!accessToken) {
        return NextResponse.json({ error: 'Access token not configured' }, { status: 500 })
      }
    } else {
      // Try to get stored token
      const tokenResult = await getShopToken(shop)
      if (!tokenResult.success || !tokenResult.accessToken) {
        return NextResponse.json({ error: 'Unauthorized - no valid access token' }, { status: 401 })
      }
      accessToken = tokenResult.accessToken
    }

    const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`

    // Initialize Shopify API
    const shopify = new ShopifyOfficialAPI(shopDomain, accessToken)

    console.log('🔧 Setting up Google Shopping metafield definitions...')

    // Create all metafield definitions
    const results = await createMetafieldDefinitions(shopify.client)

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success)

    console.log(`✅ Metafield definitions setup complete: ${successful}/${results.length} successful`)

    return NextResponse.json({
      success: true,
      message: `Metafield definitions setup complete: ${successful}/${results.length} successful`,
      results: {
        total: results.length,
        successful,
        failed: failed.length,
        failedDefinitions: failed.map(f => ({
          definition: f.definition,
          error: f.error instanceof Error ? f.error.message : String(f.error || 'Unknown error')
        }))
      }
    })

  } catch (error) {
    console.error('❌ Error setting up metafield definitions:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to setup metafield definitions', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}