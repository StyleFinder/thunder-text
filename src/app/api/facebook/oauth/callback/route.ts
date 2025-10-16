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

  console.log('🔵 Token exchange URL:', tokenUrl.toString().replace(appSecret, '***SECRET***'))

  const response = await fetch(tokenUrl.toString())

  if (!response.ok) {
    const error = await response.text()
    console.error('🔴 Facebook token exchange failed!')
    console.error('🔴 Response status:', response.status, response.statusText)
    console.error('🔴 Response body:', error)
    console.error('🔴 Redirect URI used:', redirectUri)
    throw new Error(`Failed to exchange code for token: ${error}`)
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

/**
 * Get user's Facebook Pages
 * https://developers.facebook.com/docs/graph-api/reference/user/accounts
 */
async function getFacebookPages(accessToken: string, userId: string): Promise<{
  data: Array<{
    id: string
    name: string
    access_token: string
  }>
}> {
  const pagesUrl = new URL(`https://graph.facebook.com/v21.0/${userId}/accounts`)
  pagesUrl.searchParams.set('fields', 'id,name,access_token')
  pagesUrl.searchParams.set('access_token', accessToken)

  const response = await fetch(pagesUrl.toString())

  if (!response.ok) {
    const error = await response.text()
    console.error('Facebook pages fetch failed:', error)
    // Don't throw - user might not have pages yet
    return { data: [] }
  }

  return response.json()
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔵 Facebook OAuth callback received:', request.url)

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    console.log('🔵 Callback parameters:', { hasCode: !!code, hasState: !!state, error, errorDescription })

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
    let stateData: {
      shop_id: string
      shop_domain: string
      host?: string | null
      embedded?: string | null
      timestamp: number
    }
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

    console.log('🔵 Processing Facebook OAuth callback for shop:', shop_domain)
    console.log('🔵 State data:', { shop_id, shop_domain, hasHost: !!stateData.host, hasEmbedded: !!stateData.embedded })

    // Exchange authorization code for access token
    console.log('🔵 Starting token exchange...')
    const tokenData = await exchangeCodeForToken(code)
    console.log('🔵 Token exchange successful')
    const { access_token, expires_in } = tokenData

    // Get user's Facebook information
    const userInfo = await getUserInfo(access_token)

    // Get user's ad accounts
    const adAccountsData = await getAdAccounts(access_token, userInfo.id)
    const adAccounts = adAccountsData.data || []

    // Find first active ad account
    const activeAdAccount = adAccounts.find(acc => acc.account_status === 1) || adAccounts[0]

    // Get user's Facebook Pages (required for creating ad creatives)
    const pagesData = await getFacebookPages(access_token, userInfo.id)
    const pages = pagesData.data || []
    const primaryPage = pages[0] // Use first page as primary

    // Encrypt access token before storage
    const encryptedAccessToken = await encryptToken(access_token)

    // Calculate token expiration (Facebook tokens typically last 60 days)
    const tokenExpiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000)
      : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // Default: 60 days

    // Verify shop exists before attempting upsert
    console.log('🔍 [DEBUG] Verifying shop exists:', { shop_id, shop_domain })
    const { data: shopExists, error: shopCheckError } = await supabaseAdmin
      .from('shops')
      .select('id, shop_domain')
      .eq('id', shop_id)
      .single()

    if (shopCheckError || !shopExists) {
      console.error('❌ [DEBUG] Shop does not exist:', { shop_id, shop_domain, error: shopCheckError })
      throw new Error(`Shop not found: ${shop_domain}`)
    }
    console.log('✅ [DEBUG] Shop exists:', shopExists)

    // Prepare upsert data
    const upsertData = {
      shop_id,
      provider: 'facebook',
      encrypted_access_token: encryptedAccessToken,
      token_expires_at: tokenExpiresAt.toISOString(),
      provider_account_id: userInfo.id,
      provider_account_name: userInfo.name,
      // facebook_page_id: primaryPage?.id || null, // TEMP: Commented out due to schema cache issue
      is_active: true,
      additional_metadata: {
        email: userInfo.email,
        facebook_page_id: primaryPage?.id || null, // Stored in metadata until schema cache refreshes
        ad_accounts: adAccounts.map(acc => ({
          id: acc.id,
          account_id: acc.account_id,
          name: acc.name,
          status: acc.account_status
        })),
        primary_ad_account_id: activeAdAccount?.id,
        primary_ad_account_name: activeAdAccount?.name,
        facebook_pages: pages.map(page => ({
          id: page.id,
          name: page.name
        })),
        primary_page_id: primaryPage?.id,
        primary_page_name: primaryPage?.name,
        connected_at: new Date().toISOString()
      },
      updated_at: new Date().toISOString()
    }

    console.log('🔍 [DEBUG] About to upsert integration:', {
      shop_id: upsertData.shop_id,
      provider: upsertData.provider,
      has_encrypted_token: !!upsertData.encrypted_access_token,
      token_length: upsertData.encrypted_access_token.length,
      account_id: upsertData.provider_account_id,
      account_name: upsertData.provider_account_name,
      expires_at: upsertData.token_expires_at,
      metadata_keys: Object.keys(upsertData.additional_metadata)
    })

    // Store integration in database
    const { data: integration, error: dbError, status, statusText } = await supabaseAdmin
      .from('integrations')
      .upsert(upsertData, { onConflict: 'shop_id,provider' })
      .select()
      .single()

    console.log('📊 [DEBUG] Upsert response:', {
      hasData: !!integration,
      dataId: integration?.id,
      hasError: !!dbError,
      error: dbError,
      status,
      statusText
    })

    if (dbError) {
      console.error('❌ [DEBUG] Failed to store Facebook integration:', {
        error: dbError,
        code: (dbError as any)?.code,
        message: dbError.message,
        details: (dbError as any)?.details,
        hint: (dbError as any)?.hint
      })
      throw dbError
    }

    if (!integration) {
      console.error('❌ [DEBUG] No integration data returned from upsert')
      throw new Error('Failed to store integration - no data returned')
    }

    console.log('✅ [DEBUG] Facebook integration stored successfully:', {
      id: integration.id,
      shop_domain,
      provider_account_id: integration.provider_account_id,
      is_active: integration.is_active
    })

    // Verify the record was actually inserted by reading it back
    const { data: verifyIntegration, error: verifyError } = await supabaseAdmin
      .from('integrations')
      .select('id, shop_id, provider, is_active')
      .eq('shop_id', shop_id)
      .eq('provider', 'facebook')
      .single()

    console.log('🔍 [DEBUG] Verification query result:', {
      found: !!verifyIntegration,
      data: verifyIntegration,
      error: verifyError
    })

    // Redirect to Facebook Ads page with success message
    // Restore host and embedded params to maintain Shopify embedded app context (if they exist)
    const redirectUrl = new URL('/facebook-ads', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    redirectUrl.searchParams.set('shop', shop_domain)

    // Only add host and embedded if they have valid (non-null) values
    if (stateData.host && stateData.host !== 'null') {
      redirectUrl.searchParams.set('host', stateData.host)
    }
    if (stateData.embedded && stateData.embedded !== 'null') {
      redirectUrl.searchParams.set('embedded', stateData.embedded)
    }

    redirectUrl.searchParams.set('authenticated', 'true')
    redirectUrl.searchParams.set('facebook_connected', 'true')
    redirectUrl.searchParams.set('message', 'Facebook account connected successfully')

    return NextResponse.redirect(redirectUrl.toString())

  } catch (error) {
    console.error('🔴 Error in Facebook OAuth callback:', error)
    console.error('🔴 Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('🔴 Error message:', error instanceof Error ? error.message : String(error))

    // Redirect to Facebook Ads page with error message
    // Restore host and embedded params to maintain Shopify embedded app context (if they exist)
    const redirectUrl = new URL('/facebook-ads', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    redirectUrl.searchParams.set('shop', stateData?.shop_domain || '')

    // Only add host and embedded if they have valid (non-null) values
    if (stateData?.host && stateData.host !== 'null') {
      redirectUrl.searchParams.set('host', stateData.host)
    }
    if (stateData?.embedded && stateData.embedded !== 'null') {
      redirectUrl.searchParams.set('embedded', stateData.embedded)
    }

    redirectUrl.searchParams.set('authenticated', 'true')
    redirectUrl.searchParams.set('facebook_error', 'true')
    redirectUrl.searchParams.set('message', 'Failed to connect Facebook account. Please try again.')

    return NextResponse.redirect(redirectUrl.toString())
  }
}
