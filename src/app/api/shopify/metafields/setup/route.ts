import { NextRequest, NextResponse } from 'next/server'
import { createMetafieldDefinitions } from '@/lib/google-metafield-definitions'

export async function POST(request: NextRequest) {
  // Check if we're in a build environment without proper configuration
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co') {
    return NextResponse.json(
      { error: 'Application not properly configured' },
      { status: 503 }
    )
  }

  try {
    // Dynamic imports to avoid loading during build
    const { auth } = await import('@/lib/auth')
    const { ShopifyOfficialAPI } = await import('@/lib/shopify-official')
    
    // Check for development bypass or proper session
    const url = new URL(request.url)
    const shop = url.searchParams.get('shop')
    const authBypass = process.env.SHOPIFY_AUTH_BYPASS === 'true'
    
    let session = null
    let storeData = null
    
    if (authBypass && shop) {
      // Development mode bypass
      console.log('Using auth bypass for metafield definitions setup')
      const testStore = process.env.SHOPIFY_TEST_STORE || 'zunosai-staging-test-store'
      storeData = {
        shop_domain: `${testStore}.myshopify.com`,
        access_token: process.env.SHOPIFY_ACCESS_TOKEN || 'dev-token'
      }
    } else {
      // Production authentication
      session = await auth()
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    if (!storeData) {
      return NextResponse.json(
        { error: 'Store configuration not found' },
        { status: 400 }
      )
    }

    // Initialize Shopify API
    const shopify = new ShopifyOfficialAPI(
      storeData.shop_domain,
      storeData.access_token
    )

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
          error: f.error?.message || 'Unknown error'
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