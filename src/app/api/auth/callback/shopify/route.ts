import { NextRequest, NextResponse } from 'next/server'
import { storeShopToken } from '@/lib/shopify/token-manager'

// GET /api/auth/callback/shopify
// Handles the OAuth callback from Shopify
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const shop = searchParams.get('shop')
  const state = searchParams.get('state')

  if (!code || !shop) {
    return NextResponse.json(
      { error: 'Missing authorization code or shop parameter' },
      { status: 400 }
    )
  }

  const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_API_KEY || process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code,
      }),
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text()
      console.error('❌ Failed to exchange code for token:', error)
      return NextResponse.json(
        { error: 'Failed to obtain access token' },
        { status: 500 }
      )
    }

    const { access_token: accessToken, scope } = await tokenResponse.json()

    console.log('✅ Successfully obtained access token for shop:', shopDomain)
    console.log('📝 Scopes granted:', scope)

    // Store the token in Supabase
    const storeResult = await storeShopToken(shopDomain, accessToken, scope)

    if (!storeResult.success) {
      console.error('❌ Failed to store token:', storeResult.error)
      // Continue anyway - token obtained successfully
    } else {
      console.log('✅ Token stored successfully in database')
    }

    // Redirect to success page or enhance feature
    const successUrl = new URL('/enhance', request.url)
    successUrl.searchParams.set('shop', shopDomain)
    successUrl.searchParams.set('authenticated', 'true')
    successUrl.searchParams.set('oauth_complete', 'true')

    return NextResponse.redirect(successUrl.toString())

  } catch (error) {
    console.error('❌ OAuth callback error:', error)
    return NextResponse.json(
      {
        error: 'OAuth process failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}