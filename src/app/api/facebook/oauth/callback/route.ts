/**
 * Facebook OAuth Callback Endpoint
 *
 * GET /api/facebook/oauth/callback
 *
 * Purpose: Handle Facebook OAuth callback, exchange code for token, encrypt and store
 *
 * Flow:
 * 1. Receive authorization code from Facebook
 * 2. Decode state parameter to get shop context
 * 3. Exchange code for access token (Facebook API call)
 * 4. Get user's Facebook business information
 * 5. Encrypt access token
 * 6. Store in integrations table
 * 7. Redirect to dashboard with success message
 *
 * Query Parameters:
 * - code: Authorization code from Facebook
 * - state: Base64url encoded shop context
 * - error: Error code if user denied (optional)
 * - error_description: Error description (optional)
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { encryptToken } from '@/lib/services/encryption'

/**
 * Exchange authorization code for access token
 * https://developers.facebook.com/docs/facebook-login/guides/access-tokens
 */
async function exchangeCodeForToken(code: string): Promise<{
  access_token: string
  token_type: string
  expires_in?: number
}> {
  const appId = process.env.FACEBOOK_APP_ID!
  const appSecret = process.env.FACEBOOK_APP_SECRET!
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/facebook/oauth/callback`

  const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token')
  tokenUrl.searchParams.set('client_id', appId)
  tokenUrl.searchParams.set('client_secret', appSecret)
  tokenUrl.searchParams.set('redirect_uri', redirectUri)
  tokenUrl.searchParams.set('code', code)

  const response = await fetch(tokenUrl.toString())

  if (!response.ok) {
    const error = await response.text()
    console.error('Facebook token exchange failed:', error)
    throw new Error('Failed to exchange code for token')
  }

  return response.json()
}

/**
 * Get user's Facebook account information
 * https://developers.facebook.com/docs/graph-api/reference/user
 */
async function getUserInfo(accessToken: string): Promise<{
  id: string
  name: string
  email?: string
}> {
  const userUrl = new URL('https://graph.facebook.com/v21.0/me')
  userUrl.searchParams.set('fields', 'id,name,email')
  userUrl.searchParams.set('access_token', accessToken)

  const response = await fetch(userUrl.toString())

  if (!response.ok) {
    const error = await response.text()
    console.error('Facebook user info fetch failed:', error)
    throw new Error('Failed to fetch user info')
  }

  return response.json()
}

/**
 * Get user's ad accounts
 * https://developers.facebook.com/docs/marketing-api/reference/user/adaccounts
 */
async function getAdAccounts(accessToken: string, userId: string): Promise<{
  data: Array<{
    id: string
    account_id: string
    name: string
    account_status: number
  }>
}> {
  const adAccountsUrl = new URL(`https://graph.facebook.com/v21.0/${userId}/adaccounts`)
  adAccountsUrl.searchParams.set('fields', 'id,account_id,name,account_status')
  adAccountsUrl.searchParams.set('access_token', accessToken)

  const response = await fetch(adAccountsUrl.toString())

  if (!response.ok) {
    const error = await response.text()
    console.error('Facebook ad accounts fetch failed:', error)
    // Don't throw - user might not have ad accounts yet
    return { data: [] }
  }

  return response.json()
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    // Handle user denial or errors from Facebook
    if (error) {
      console.log('Facebook OAuth error:', error, errorDescription)

      const redirectUrl = new URL('/settings', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
      redirectUrl.searchParams.set('facebook_error', error)
      if (error === 'access_denied') {
        redirectUrl.searchParams.set('message', 'Facebook authorization was cancelled')
      } else {
        redirectUrl.searchParams.set('message', errorDescription || 'Facebook authorization failed')
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
    if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
      console.error('Facebook app credentials not configured')
      return NextResponse.json(
        { error: 'Facebook integration not configured' },
        { status: 500 }
      )
    }

    // Decode state to get shop context
    let stateData: { shop_id: string; shop_domain: string; timestamp: number }
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8'))
    } catch (e) {
      console.error('Invalid state parameter:', e)
      return NextResponse.json(
        { error: 'Invalid state parameter' },
        { status: 400 }
      )
    }

    const { shop_id, shop_domain } = stateData

    // Verify state timestamp (prevent replay attacks - max 10 minutes old)
    const stateAge = Date.now() - stateData.timestamp
    if (stateAge > 10 * 60 * 1000) {
      return NextResponse.json(
        { error: 'State parameter expired' },
        { status: 400 }
      )
    }

    console.log('Processing Facebook OAuth callback for shop:', shop_domain)

    // Exchange authorization code for access token
    const tokenData = await exchangeCodeForToken(code)
    const { access_token, expires_in } = tokenData

    // Get user's Facebook information
    const userInfo = await getUserInfo(access_token)

    // Get user's ad accounts
    const adAccountsData = await getAdAccounts(access_token, userInfo.id)
    const adAccounts = adAccountsData.data || []

    // Find first active ad account
    const activeAdAccount = adAccounts.find(acc => acc.account_status === 1) || adAccounts[0]

    // Encrypt access token before storage
    const encryptedAccessToken = await encryptToken(access_token)

    // Calculate token expiration (Facebook tokens typically last 60 days)
    const tokenExpiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000)
      : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // Default: 60 days

    // Store integration in database
    const { data: integration, error: dbError} = await supabaseAdmin
      .from('integrations')
      .upsert(
        {
          shop_id,
          provider: 'facebook',
          encrypted_access_token: encryptedAccessToken,
          token_expires_at: tokenExpiresAt.toISOString(),
          provider_account_id: userInfo.id,
          provider_account_name: userInfo.name,
          is_active: true,
          additional_metadata: {
            email: userInfo.email,
            ad_accounts: adAccounts.map(acc => ({
              id: acc.id,
              account_id: acc.account_id,
              name: acc.name,
              status: acc.account_status
            })),
            primary_ad_account_id: activeAdAccount?.id,
            primary_ad_account_name: activeAdAccount?.name,
            connected_at: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'shop_id,provider'
        }
      )
      .select()
      .single()

    if (dbError) {
      console.error('Failed to store Facebook integration:', dbError)
      throw dbError
    }

    console.log('Facebook integration stored successfully for shop:', shop_domain)

    // Redirect to settings page with success message
    const redirectUrl = new URL('/settings', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    redirectUrl.searchParams.set('shop', shop_domain)
    redirectUrl.searchParams.set('facebook_connected', 'true')
    redirectUrl.searchParams.set('message', 'Facebook account connected successfully')

    return NextResponse.redirect(redirectUrl.toString())

  } catch (error) {
    console.error('Error in Facebook OAuth callback:', error)

    // Redirect to settings with error message
    const redirectUrl = new URL('/settings', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    redirectUrl.searchParams.set('facebook_error', 'true')
    redirectUrl.searchParams.set('message', 'Failed to connect Facebook account. Please try again.')

    return NextResponse.redirect(redirectUrl.toString())
  }
}
