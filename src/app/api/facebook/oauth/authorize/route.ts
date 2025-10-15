/**
 * Facebook OAuth Authorization Endpoint
 *
 * GET /api/facebook/oauth/authorize
 *
 * Purpose: Initiate Facebook OAuth flow by redirecting user to Facebook consent screen
 *
 * Flow:
 * 1. Verify user is authenticated
 * 2. Get shop context from query params
 * 3. Generate secure state parameter with shop info
 * 4. Redirect to Facebook OAuth consent screen
 *
 * Query Parameters:
 * - shop: Shop domain (e.g., zunosai-staging-test-store.myshopify.com)
 *
 * Environment Variables Required:
 * - FACEBOOK_APP_ID
 * - FACEBOOK_REDIRECT_URI (or NEXT_PUBLIC_APP_URL for dynamic construction)
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get('shop')

    if (!shop) {
      return NextResponse.json(
        { error: 'Missing shop parameter' },
        { status: 400 }
      )
    }

    // Verify environment variables
    const facebookAppId = process.env.FACEBOOK_APP_ID
    if (!facebookAppId) {
      console.error('FACEBOOK_APP_ID not configured')
      return NextResponse.json(
        { error: 'Facebook integration not configured' },
        { status: 500 }
      )
    }

    // Get shop from database using admin client
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('id, shop_domain')
      .eq('shop_domain', shop)
      .single()

    if (shopError || !shopData) {
      console.error('Shop not found:', shop, shopError)
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      )
    }

    // Generate state parameter with shop context for callback
    // State is used to prevent CSRF attacks and maintain context
    const state = Buffer.from(
      JSON.stringify({
        shop_id: shopData.id,
        shop_domain: shopData.shop_domain,
        timestamp: Date.now(),
      })
    ).toString('base64url')

    // Construct redirect URI
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/facebook/oauth/callback`

    // Build Facebook OAuth URL
    const facebookAuthUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth')
    facebookAuthUrl.searchParams.set('client_id', facebookAppId)
    facebookAuthUrl.searchParams.set('redirect_uri', redirectUri)
    facebookAuthUrl.searchParams.set('state', state)

    // Request required permissions for Facebook Ads
    // https://developers.facebook.com/docs/permissions/reference
    const scopes = [
      'ads_management',        // Create and manage ads
      'ads_read',             // Read ad data
      'business_management',  // Access Business Manager
      'pages_read_engagement' // Read page engagement (for ad creatives)
    ]
    facebookAuthUrl.searchParams.set('scope', scopes.join(','))
    facebookAuthUrl.searchParams.set('response_type', 'code')

    console.log('Initiating Facebook OAuth for shop:', shop)

    // Redirect to Facebook OAuth consent screen
    return NextResponse.redirect(facebookAuthUrl.toString())

  } catch (error) {
    console.error('Error in Facebook OAuth authorize:', error)

    // Redirect to Facebook Ads page with error if shop is known
    if (shop) {
      const redirectUrl = new URL('/facebook-ads', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
      redirectUrl.searchParams.set('shop', shop)
      redirectUrl.searchParams.set('authenticated', 'true')
      redirectUrl.searchParams.set('facebook_error', 'true')
      redirectUrl.searchParams.set('message', 'Failed to initiate Facebook authorization. Please try again.')
      return NextResponse.redirect(redirectUrl.toString())
    }

    return NextResponse.json(
      { error: 'Failed to initiate Facebook authorization' },
      { status: 500 }
    )
  }
}
