import { NextRequest, NextResponse } from 'next/server'
import { getShopToken } from '@/lib/shopify/token-manager'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const shop = searchParams.get('shop')

  if (!shop) {
    return NextResponse.json({
      error: 'Missing shop parameter'
    }, { status: 400 })
  }

  try {
    const result = await getShopToken(shop)

    if (result.success && result.accessToken) {
      // Don't expose the full token, just show if it exists and preview
      return NextResponse.json({
        hasToken: true,
        tokenPreview: result.accessToken.substring(0, 15) + '...',
        tokenLength: result.accessToken.length,
        shop: shop
      })
    } else {
      return NextResponse.json({
        hasToken: false,
        error: result.error,
        shop: shop
      })
    }
  } catch (error) {
    return NextResponse.json({
      hasToken: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      shop: shop
    })
  }
}