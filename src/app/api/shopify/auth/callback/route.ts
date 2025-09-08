import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Check if we're in a build environment without proper configuration
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co') {
    return NextResponse.json(
      { error: 'Application not properly configured' },
      { status: 503 }
    )
  }

  try {
    // Dynamic imports to avoid loading during build
    const { exchangeCodeForToken } = await import('@/lib/shopify')
    const { supabaseAdmin } = await import('@/lib/supabase')
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const shop = searchParams.get('shop')
    const state = searchParams.get('state')

    if (!code || !shop || !state) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Verify the state parameter matches the shop
    if (state !== shop) {
      return NextResponse.json(
        { error: 'Invalid state parameter' },
        { status: 400 }
      )
    }

    // Exchange the authorization code for an access token
    const tokenData = await exchangeCodeForToken(shop, code)
    
    if (!tokenData.access_token) {
      return NextResponse.json(
        { error: 'Failed to obtain access token' },
        { status: 400 }
      )
    }

    // Store the shop information in Supabase
    const { error: storeError } = await supabaseAdmin
      .from('stores')
      .upsert({
        shop_domain: shop,
        access_token: tokenData.access_token,
        plan: 'starter',
        settings: {},
        usage_limits: 500,
        current_usage: 0,
      }, {
        onConflict: 'shop_domain',
      })

    if (storeError) {
      console.error('Failed to store shop data:', storeError)
      return NextResponse.json(
        { error: 'Failed to store shop information' },
        { status: 500 }
      )
    }

    // Redirect to the app with success
    return NextResponse.redirect(
      new URL(`/dashboard?shop=${shop}&authenticated=true`, request.url)
    )

  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.json(
      { error: 'OAuth callback failed' },
      { status: 500 }
    )
  }
}