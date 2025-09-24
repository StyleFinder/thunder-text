import { NextRequest, NextResponse } from 'next/server'
import { storeShopToken } from '@/lib/shopify/token-manager'

// This endpoint allows manual token storage if OAuth succeeded but storage failed
export async function POST(request: NextRequest) {
  try {
    const { shop, token, scope } = await request.json()

    if (!shop || !token) {
      return NextResponse.json(
        { error: 'Missing required parameters: shop and token' },
        { status: 400 }
      )
    }

    const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`

    // Store the token in Supabase
    const storeResult = await storeShopToken(shopDomain, token, scope || 'read_products,write_products')

    if (!storeResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to store token',
          details: storeResult.error
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Token stored successfully',
      shopId: storeResult.shopId
    })

  } catch (error) {
    console.error('❌ Manual token storage error:', error)
    return NextResponse.json(
      {
        error: 'Failed to store token',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check if we need manual token entry
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Manual Token Storage Endpoint',
    instructions: [
      '1. If OAuth succeeded but token storage failed, you can manually store the token',
      '2. Check Vercel logs for the access token from OAuth callback',
      '3. POST to this endpoint with: { "shop": "shop-name", "token": "shpat_..." }',
      '4. Or re-run OAuth: /api/auth?shop=your-shop-name'
    ]
  })
}