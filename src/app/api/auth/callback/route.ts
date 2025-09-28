import { NextRequest, NextResponse } from 'next/server'

// OAuth callback handler
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  // Get OAuth parameters
  const code = searchParams.get('code')
  const shop = searchParams.get('shop')
  const host = searchParams.get('host')
  const state = searchParams.get('state')
  const timestamp = searchParams.get('timestamp')
  const hmac = searchParams.get('hmac')

  console.log('[OAuth Callback] Received:', {
    shop,
    hasCode: !!code,
    hasHost: !!host,
    hasState: !!state,
    hasHmac: !!hmac
  })

  // If we don't have required parameters, return error
  if (!shop || !code) {
    return NextResponse.json({
      error: 'Missing required OAuth parameters',
      details: { shop: !!shop, code: !!code }
    }, { status: 400 })
  }

  try {
    // Exchange authorization code for access token
    const tokenUrl = `https://${shop}/admin/oauth/access_token`

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code
      })
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('[OAuth Callback] Token exchange failed:', errorText)

      // For embedded apps, redirect to embed page
      const embedUrl = `/embed?shop=${shop}&host=${host || ''}&error=token_exchange_failed`
      return NextResponse.redirect(new URL(embedUrl, request.url))
    }

    const tokenData = await tokenResponse.json()
    console.log('[OAuth Callback] Token received:', {
      hasAccessToken: !!tokenData.access_token,
      scope: tokenData.scope
    })

    // TODO: Store the access token securely in your database
    // For now, redirect to the embedded app view
    const embedUrl = `/embed?shop=${shop}&host=${host || ''}&authenticated=true`
    return NextResponse.redirect(new URL(embedUrl, request.url))

  } catch (error) {
    console.error('[OAuth Callback] Error:', error)

    // Redirect with error
    const embedUrl = `/embed?shop=${shop}&host=${host || ''}&error=callback_failed`
    return NextResponse.redirect(new URL(embedUrl, request.url))
  }
}

export async function POST(request: NextRequest) {
  // Also handle POST for compatibility
  return GET(request)
}