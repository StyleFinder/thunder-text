/**
 * Google Ads OAuth Callback Endpoint
 *
 * GET /api/google/oauth/callback
 *
 * Purpose: Handle Google OAuth callback, exchange code for token, encrypt and store
 *
 * Flow:
 * 1. Receive authorization code from Google
 * 2. Decode state parameter to get shop context
 * 3. Exchange code for access token and refresh token (Google API call)
 * 4. Get user's Google account information
 * 5. Encrypt access token and refresh token
 * 6. Store in integrations table
 * 7. Redirect to return_to path or onboarding with success message
 *
 * Query Parameters:
 * - code: Authorization code from Google
 * - state: Base64url encoded shop context
 * - error: Error code if user denied (optional)
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateGoogleOAuthState, type GoogleOAuthState } from '@/lib/security/oauth-validation'
import { ZodError } from 'zod'

/**
 * Exchange authorization code for access token and refresh token
 * https://developers.google.com/identity/protocols/oauth2/web-server#exchange-authorization-code
 */
async function exchangeCodeForToken(code: string): Promise<{
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope: string
}> {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET!
  const redirectUri = process.env.GOOGLE_ADS_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/google/oauth/callback`

  const tokenUrl = 'https://oauth2.googleapis.com/token'

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('🔴 Google token exchange failed!')
    console.error('🔴 Response status:', response.status, response.statusText)
    console.error('🔴 Response body:', error)
    console.error('🔴 Redirect URI used:', redirectUri)
    throw new Error(`Failed to exchange code for token: ${error}`)
  }

  return response.json()
}

/**
 * Get user's Google account information
 * https://developers.google.com/identity/protocols/oauth2/web-server#callinganapi
 */
async function getUserInfo(accessToken: string): Promise<{
  id: string
  email: string
  name: string
  picture?: string
}> {
  const userInfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo'

  const response = await fetch(userInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Google user info fetch failed:', error)
    throw new Error('Failed to fetch user info')
  }

  return response.json()
}

export async function GET(request: NextRequest) {
  let stateData: GoogleOAuthState | undefined

  try {
    console.log('🔵 Google OAuth callback received:', request.url)

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    console.log('🔵 Callback parameters:', { hasCode: !!code, hasState: !!state, error })

    // Handle user denial or errors from Google
    if (error) {
      console.log('Google OAuth error:', error)

      const redirectUrl = new URL('/onboarding/welcome', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
      redirectUrl.searchParams.set('google_error', error)
      if (error === 'access_denied') {
        redirectUrl.searchParams.set('message', 'Google authorization was cancelled')
      } else {
        redirectUrl.searchParams.set('message', 'Google authorization failed')
      }

      return NextResponse.redirect(redirectUrl.toString())
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.json(
        { error: 'Invalid callback parameters' },
        { status: 400 }
      )
    }

    // Verify environment variables
    if (!process.env.GOOGLE_ADS_CLIENT_ID || !process.env.GOOGLE_ADS_CLIENT_SECRET) {
      console.error('Google Ads credentials not configured')
      return NextResponse.json(
        { error: 'Google Ads integration not configured' },
        { status: 500 }
      )
    }

    // Validate state parameter with Zod schema
    try {
      stateData = validateGoogleOAuthState(state)
    } catch (error) {
      if (error instanceof ZodError) {
        console.error('State validation failed:', error.errors)
        return NextResponse.json(
          { error: 'Invalid state parameter format', details: error.errors },
          { status: 400 }
        )
      }
      console.error('State validation error:', error)
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Invalid state parameter' },
        { status: 400 }
      )
    }

    const { shop_id, shop_domain, return_to } = stateData

    console.log('🔵 Processing Google OAuth callback for shop:', shop_domain)
    console.log('🔵 State data:', { shop_id, shop_domain, return_to })

    // Exchange authorization code for access token
    console.log('🔵 Starting token exchange...')
    const tokenData = await exchangeCodeForToken(code)
    console.log('🔵 Token exchange successful')
    const { access_token, refresh_token, expires_in, scope } = tokenData

    // Get user's Google account information
    const userInfo = await getUserInfo(access_token)

    // Encrypt tokens before storing
    const { encryptToken } = await import('@/lib/services/encryption')
    const encryptedAccessToken = await encryptToken(access_token)
    const encryptedRefreshToken = refresh_token ? await encryptToken(refresh_token) : undefined

    console.log('🔍 [DEBUG] Saving Google Ads integration:', {
      shop_id,
      email: userInfo.email,
      has_refresh_token: !!refresh_token
    });

    // Save to integrations table using supabaseAdmin directly
    const { supabaseAdmin } = await import('@/lib/supabase/admin')

    const { error: saveError } = await supabaseAdmin
      .from('integrations')
      .upsert({
        shop_id: shop_id,
        provider: 'google',
        encrypted_access_token: encryptedAccessToken,
        encrypted_refresh_token: encryptedRefreshToken,
        provider_account_id: userInfo.id,
        provider_account_name: userInfo.name,
        is_active: true,
        additional_metadata: {
          email: userInfo.email,
          picture: userInfo.picture,
          scopes: scope.split(' '),
          expires_in: expires_in,
          token_obtained_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'shop_id,provider'
      })

    if (saveError) {
      console.error('Failed to save Google Ads integration:', saveError)
      throw new Error(`Failed to save Google Ads integration: ${saveError.message}`)
    }

    console.log('✅ [DEBUG] Google Ads integration stored successfully');

    // Redirect to return_to path or onboarding welcome page
    const redirectUrl = new URL(return_to || '/onboarding/welcome', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    redirectUrl.searchParams.set('shop', shop_domain)

    // Only add host and embedded if they have valid values
    if (stateData.host && stateData.host !== 'null') {
      redirectUrl.searchParams.set('host', stateData.host)
    }
    if (stateData.embedded && stateData.embedded !== 'null') {
      redirectUrl.searchParams.set('embedded', stateData.embedded)
    }

    redirectUrl.searchParams.set('google_connected', 'true')
    redirectUrl.searchParams.set('message', 'Google Ads account connected successfully')

    return NextResponse.redirect(redirectUrl.toString())

  } catch (error) {
    console.error('🔴 Error in Google OAuth callback:', error)
    console.error('🔴 Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('🔴 Error message:', error instanceof Error ? error.message : String(error))

    // Redirect to onboarding welcome page with error message
    const redirectUrl = new URL(stateData?.return_to || '/onboarding/welcome', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    redirectUrl.searchParams.set('shop', stateData?.shop_domain || '')

    // Only add host and embedded if they have valid values
    if (stateData?.host && stateData.host !== 'null') {
      redirectUrl.searchParams.set('host', stateData.host)
    }
    if (stateData?.embedded && stateData.embedded !== 'null') {
      redirectUrl.searchParams.set('embedded', stateData.embedded)
    }

    redirectUrl.searchParams.set('google_error', 'true')
    redirectUrl.searchParams.set('message', 'Failed to connect Google Ads account. Please try again.')

    return NextResponse.redirect(redirectUrl.toString())
  }
}
