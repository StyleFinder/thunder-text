import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

/**
 * OAuth Callback Handler
 * Handles the OAuth redirect from Shopify after user authorizes the app
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const shop = searchParams.get('shop')
  const code = searchParams.get('code')
  const hmac = searchParams.get('hmac')


  if (!shop || !code) {
    return NextResponse.json({
      success: false,
      error: 'Missing required parameters (shop or code)'
    }, { status: 400 })
  }

  try {
    // Exchange authorization code for access token
    const tokenUrl = `https://${shop}/admin/oauth/access_token`

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code: code
      })
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      logger.error('❌ OAuth token exchange failed:', undefined, { 
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        errorText,
        shop,
        hasApiKey: !!process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
        hasApiSecret: !!process.env.SHOPIFY_API_SECRET,
        apiSecretLength: process.env.SHOPIFY_API_SECRET?.length
      , component: 'callback' })
      return NextResponse.json({
        success: false,
        error: 'Failed to exchange authorization code',
        details: errorText
      }, { status: tokenResponse.status })
    }

    const tokenData = await tokenResponse.json()

    // Store access token in Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const fullShopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`

    const { error: dbError } = await supabase
      .from('shops')
      .upsert({
        shop_domain: fullShopDomain,
        access_token: tokenData.access_token,
        scope: tokenData.scope || '',
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'shop_domain'
      })

    if (dbError) {
      logger.error('❌ Error storing token:', dbError as Error, { component: 'callback' })
      return NextResponse.json({
        success: false,
        error: 'Failed to store access token'
      }, { status: 500 })
    }


    // Redirect to app with embedded and authenticated parameters
    const appUrl = `/?shop=${shop}&embedded=1&authenticated=true`

    return NextResponse.redirect(new URL(appUrl, request.url))

  } catch (error) {
    logger.error('❌ OAuth callback error:', error as Error, { component: 'callback' })
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'OAuth callback failed'
    }, { status: 500 })
  }
}
