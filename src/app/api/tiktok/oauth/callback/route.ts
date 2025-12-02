/**
 * TikTok for Business OAuth Callback Endpoint
 *
 * GET /api/tiktok/oauth/callback
 *
 * Purpose: Handle TikTok OAuth callback, exchange auth_code for access token, encrypt and store
 *
 * Flow:
 * 1. Receive authorization code from TikTok
 * 2. Decode state parameter to get shop context
 * 3. Exchange auth_code for access token (TikTok API call)
 * 4. Encrypt access token
 * 5. Store in integrations table
 * 6. Redirect to return_to path with success message
 *
 * Query Parameters:
 * - auth_code: Authorization code from TikTok
 * - state: Base64url encoded shop context
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateTikTokOAuthState, type TikTokOAuthState } from '@/lib/security/oauth-validation'
import { ZodError } from 'zod'
import { logger } from '@/lib/logger'

/**
 * Exchange authorization code for access token
 * https://business-api.tiktok.com/portal/docs?id=1738373164380162
 */
async function exchangeCodeForToken(authCode: string): Promise<{
  access_token: string
  advertiser_ids: string[]
}> {
  const clientKey = process.env.TIKTOK_CLIENT_KEY!
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET!

  const tokenUrl = 'https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/'

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      app_id: clientKey,
      secret: clientSecret,
      auth_code: authCode,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    logger.error('TikTok token exchange failed', new Error(`Failed to exchange code for token: ${error}`), {
      component: 'tiktok-oauth-callback',
      operation: 'exchangeCodeForToken',
      responseStatus: response.status,
      responseStatusText: response.statusText,
      responseBody: error
    })
    throw new Error(`Failed to exchange code for token: ${error}`)
  }

  const data = await response.json()

  if (data.code !== 0) {
    logger.error('TikTok API error', new Error(`TikTok API error: ${data.message}`), {
      component: 'tiktok-oauth-callback',
      operation: 'exchangeCodeForToken',
      apiErrorCode: data.code,
      apiErrorMessage: data.message
    })
    throw new Error(`TikTok API error: ${data.message}`)
  }

  return {
    access_token: data.data.access_token,
    advertiser_ids: data.data.advertiser_ids || []
  }
}

export async function GET(request: NextRequest) {
  let stateData: TikTokOAuthState | undefined

  try {
    console.log('🔵 TikTok OAuth callback received:', request.url)

    const { searchParams } = new URL(request.url)
    const authCode = searchParams.get('auth_code')
    const state = searchParams.get('state')

    console.log('🔵 Callback parameters:', { hasAuthCode: !!authCode, hasState: !!state })

    // Validate required parameters
    if (!authCode || !state) {
      return NextResponse.json(
        { error: 'Invalid callback parameters' },
        { status: 400 }
      )
    }

    // Verify environment variables
    if (!process.env.TIKTOK_CLIENT_KEY || !process.env.TIKTOK_CLIENT_SECRET) {
      logger.error('TikTok credentials not configured', new Error('Missing TikTok credentials'), {
        component: 'tiktok-oauth-callback',
        operation: 'GET'
      })
      return NextResponse.json(
        { error: 'TikTok integration not configured' },
        { status: 500 }
      )
    }

    // Validate state parameter with Zod schema
    try {
      stateData = validateTikTokOAuthState(state)
    } catch (error) {
      if (error instanceof ZodError) {
        logger.error('State validation failed', error, {
          component: 'tiktok-oauth-callback',
          operation: 'validateState',
          errors: error.errors
        })
        return NextResponse.json(
          { error: 'Invalid state parameter format', details: error.errors },
          { status: 400 }
        )
      }
      logger.error('State validation error', error as Error, {
        component: 'tiktok-oauth-callback',
        operation: 'validateState'
      })
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Invalid state parameter' },
        { status: 400 }
      )
    }

    const { shop_id, shop_domain, return_to } = stateData

    console.log('🔵 Processing TikTok OAuth callback for shop:', shop_domain)
    console.log('🔵 State data:', { shop_id, shop_domain, return_to })

    // Exchange authorization code for access token
    console.log('🔵 Starting token exchange...')
    const tokenData = await exchangeCodeForToken(authCode)
    console.log('🔵 Token exchange successful')
    const { access_token, advertiser_ids } = tokenData

    // Encrypt tokens before storing
    const { encryptToken } = await import('@/lib/services/encryption')
    const encryptedAccessToken = await encryptToken(access_token)

    // Save to integrations table using supabaseAdmin directly
    const { supabaseAdmin } = await import('@/lib/supabase/admin')

    const { error: saveError } = await supabaseAdmin
      .from('integrations')
      .upsert({
        shop_id: shop_id,
        provider: 'tiktok',
        encrypted_access_token: encryptedAccessToken,
        provider_account_id: advertiser_ids[0] || shop_id,
        provider_account_name: 'TikTok Ads Account',
        is_active: true,
        additional_metadata: {
          advertiser_ids: advertiser_ids,
          connected_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'shop_id,provider'
      })

    if (saveError) {
      logger.error('Failed to save TikTok integration', saveError as Error, {
        component: 'tiktok-oauth-callback',
        operation: 'saveIntegration',
        shopId: shop_id
      })
      throw new Error(`Failed to save TikTok integration: ${saveError.message}`)
    }


    // Redirect to return_to path or welcome page
    const redirectUrl = new URL(return_to || '/welcome', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    redirectUrl.searchParams.set('shop', shop_domain)

    // Only add host and embedded if they have valid values
    if (stateData.host && stateData.host !== 'null') {
      redirectUrl.searchParams.set('host', stateData.host)
    }
    if (stateData.embedded && stateData.embedded !== 'null') {
      redirectUrl.searchParams.set('embedded', stateData.embedded)
    }

    redirectUrl.searchParams.set('tiktok_connected', 'true')
    redirectUrl.searchParams.set('message', 'TikTok Ads account connected successfully')

    return NextResponse.redirect(redirectUrl.toString())

  } catch (error) {
    logger.error('Error in TikTok OAuth callback', error as Error, {
      component: 'tiktok-oauth-callback',
      operation: 'GET',
      shopDomain: stateData?.shop_domain,
      returnTo: stateData?.return_to
    })

    // Redirect to welcome page with error message
    const redirectUrl = new URL(stateData?.return_to || '/welcome', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    redirectUrl.searchParams.set('shop', stateData?.shop_domain || '')

    // Only add host and embedded if they have valid values
    if (stateData?.host && stateData.host !== 'null') {
      redirectUrl.searchParams.set('host', stateData.host)
    }
    if (stateData?.embedded && stateData.embedded !== 'null') {
      redirectUrl.searchParams.set('embedded', stateData.embedded)
    }

    redirectUrl.searchParams.set('tiktok_error', 'true')
    redirectUrl.searchParams.set('message', 'Failed to connect TikTok Ads account. Please try again.')

    return NextResponse.redirect(redirectUrl.toString())
  }
}
