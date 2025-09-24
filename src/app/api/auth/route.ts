import { NextRequest, NextResponse } from 'next/server'

// GET /api/auth?shop={shop}
// Initiates the OAuth flow with Shopify
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const shop = searchParams.get('shop')

  if (!shop) {
    return NextResponse.json(
      { error: 'Missing required parameter: shop' },
      { status: 400 }
    )
  }

  // Ensure shop domain has .myshopify.com
  const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`

  const apiKey = process.env.SHOPIFY_API_KEY || process.env.NEXT_PUBLIC_SHOPIFY_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Shopify API key not configured' },
      { status: 500 }
    )
  }

  // Build the OAuth authorization URL
  const redirectUri = `${process.env.SHOPIFY_APP_URL || 'https://thunder-text-nine.vercel.app'}/api/auth/callback`

  const scopes = [
    'read_products',
    'write_products',
    'read_product_listings',
    'read_inventory',
    'write_inventory'
  ].join(',')

  const authUrl = new URL(`https://${shopDomain}/admin/oauth/authorize`)
  authUrl.searchParams.append('client_id', apiKey)
  authUrl.searchParams.append('scope', scopes)
  authUrl.searchParams.append('redirect_uri', redirectUri)
  authUrl.searchParams.append('state', generateNonce())
  authUrl.searchParams.append('grant_options[]', 'per-user')

  console.log('🔄 Redirecting to Shopify OAuth:', {
    shop: shopDomain,
    redirectUri,
    scopes
  })

  // Redirect to Shopify's OAuth page
  return NextResponse.redirect(authUrl.toString())
}

// Generate a random nonce for security
function generateNonce(): string {
  return Math.random().toString(36).substring(7)
}