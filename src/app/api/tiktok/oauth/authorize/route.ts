/**
 * TikTok for Business OAuth Authorization Endpoint
 *
 * GET /api/tiktok/oauth/authorize
 *
 * Purpose: Initiate TikTok OAuth flow by redirecting user to TikTok authorization screen
 *
 * Flow:
 * 1. Verify user context
 * 2. Get shop context from query params
 * 3. Generate secure state parameter with shop info
 * 4. Redirect to TikTok OAuth authorization screen
 *
 * Query Parameters:
 * - shop: Shop domain (e.g., zunosai-staging-test-store.myshopify.com)
 * - return_to: Optional return path after OAuth (e.g., /welcome)
 *
 * Environment Variables Required:
 * - TIKTOK_CLIENT_KEY
 * - TIKTOK_REDIRECT_URI (or NEXT_PUBLIC_APP_URL for dynamic construction)
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createTikTokOAuthState } from '@/lib/security/oauth-validation'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const shop = searchParams.get('shop')
  const returnTo = searchParams.get('return_to')

  try {

    if (!shop) {
      return NextResponse.json(
        { error: 'Missing shop parameter' },
        { status: 400 }
      )
    }

    // Verify environment variables
    const tiktokClientKey = process.env.TIKTOK_CLIENT_KEY
    if (!tiktokClientKey) {
      console.error('TIKTOK_CLIENT_KEY not configured')
      return NextResponse.json(
        { error: 'TikTok integration not configured' },
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

    // Generate secure state parameter with Zod validation
    const state = createTikTokOAuthState({
      shop_id: shopData.id,
      shop_domain: shopData.shop_domain,
      host: searchParams.get('host'),
      embedded: searchParams.get('embedded'),
      return_to: returnTo
    })

    // Construct redirect URI
    const redirectUri = process.env.TIKTOK_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/tiktok/oauth/callback`

    // Build TikTok OAuth URL
    const tiktokAuthUrl = new URL('https://business-api.tiktok.com/portal/auth')
    tiktokAuthUrl.searchParams.set('app_id', tiktokClientKey)
    tiktokAuthUrl.searchParams.set('redirect_uri', redirectUri)
    tiktokAuthUrl.searchParams.set('state', state)

    console.log('Initiating TikTok OAuth for shop:', shop)

    // Redirect to TikTok OAuth authorization screen
    return NextResponse.redirect(tiktokAuthUrl.toString())

  } catch (error) {
    console.error('Error in TikTok OAuth authorize:', error)

    // Redirect to welcome page with error if shop is known
    if (shop) {
      const redirectUrl = new URL(returnTo || '/welcome', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
      redirectUrl.searchParams.set('shop', shop)
      redirectUrl.searchParams.set('tiktok_error', 'true')
      redirectUrl.searchParams.set('message', 'Failed to initiate TikTok authorization. Please try again.')
      return NextResponse.redirect(redirectUrl.toString())
    }

    return NextResponse.json(
      { error: 'Failed to initiate TikTok authorization' },
      { status: 500 }
    )
  }
}
