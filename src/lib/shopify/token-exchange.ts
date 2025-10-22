/**
 * Token Exchange implementation for Shopify authentication
 * Replaces the deprecated static access token approach
 */

import { getShopToken, saveShopToken } from './token-manager'

interface TokenExchangeParams {
  shop: string
  sessionToken: string
  clientId: string
  clientSecret: string
  requestedTokenType?: 'offline' | 'online'
}

interface TokenExchangeResponse {
  access_token: string
  scope: string
  expires_in?: number
  associated_user_scope?: string
  associated_user?: {
    id: number
    first_name: string
    last_name: string
    email: string
    email_verified: boolean
    account_owner: boolean
    locale: string
    collaborator: boolean
  }
}

/**
 * Exchange a session token for an access token using Shopify's Token Exchange API
 *
 * @param params Token exchange parameters
 * @returns Access token and metadata
 */
export async function exchangeToken(params: TokenExchangeParams): Promise<TokenExchangeResponse> {
  const {
    shop,
    sessionToken,
    clientId,
    clientSecret,
    requestedTokenType = 'offline'
  } = params

  console.log('🔄 Starting token exchange for shop:', shop)

  // Determine the token type parameter
  const tokenTypeParam = requestedTokenType === 'online'
    ? 'urn:shopify:params:oauth:token-type:online-access-token'
    : 'urn:shopify:params:oauth:token-type:offline-access-token'

  const requestBody = {
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
    subject_token: sessionToken,
    subject_token_type: 'urn:ietf:params:oauth:token-type:id_token',
    requested_token_type: tokenTypeParam
  }

  // Ensure shop domain includes .myshopify.com
  const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`

  try {
    const response = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Token exchange failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      })

      if (response.status === 400) {
        throw new Error('Invalid session token - token may be expired or malformed')
      } else if (response.status === 401) {
        throw new Error('Invalid client credentials')
      } else {
        throw new Error(`Token exchange failed: ${response.statusText}`)
      }
    }

    const tokenData: TokenExchangeResponse = await response.json()

    console.log('✅ Token exchange successful:', {
      shop,
      scope: tokenData.scope,
      tokenType: requestedTokenType,
      expiresIn: tokenData.expires_in || 'permanent'
    })

    // Save the access token to database for future use
    if (requestedTokenType === 'offline') {
      await saveShopToken(
        shop,
        tokenData.access_token,
        'offline',
        tokenData.scope
      )
      console.log('💾 Offline access token saved to database')
    }

    return tokenData
  } catch (error) {
    console.error('❌ Token exchange error:', error)
    throw error
  }
}

/**
 * Get or exchange for an access token
 * First tries to get from database, then exchanges session token if needed
 */
export async function getOrExchangeToken(
  shop: string,
  sessionToken?: string
): Promise<string> {
  console.log('🔍 Getting access token for shop:', shop)

  // First try to get from database (for offline tokens)
  const dbToken = await getShopToken(shop)
  if (dbToken.success && dbToken.accessToken) {
    console.log('✅ Using existing access token from database')
    return dbToken.accessToken
  }

  // If no database token and we have a session token, exchange it
  if (sessionToken) {
    console.log('🔄 No database token found, attempting token exchange')

    const clientId = process.env.SHOPIFY_API_KEY
    const clientSecret = process.env.SHOPIFY_API_SECRET

    if (!clientId || !clientSecret) {
      console.error('❌ Missing Shopify API credentials in environment')
      throw new Error('Missing Shopify API credentials in environment')
    }

    try {
      const tokenResponse = await exchangeToken({
        shop,
        sessionToken,
        clientId,
        clientSecret,
        requestedTokenType: 'offline' // Use offline for persistent access
      })

      return tokenResponse.access_token
    } catch (exchangeError) {
      console.error('⚠️ Token exchange failed, will check database again:', exchangeError)

      // Try database one more time - maybe it was just added
      const retryDbToken = await getShopToken(shop)
      if (retryDbToken.success && retryDbToken.accessToken) {
        console.log('✅ Found database token on retry after exchange failure')
        return retryDbToken.accessToken
      }

      // Re-throw the exchange error if we still don't have a token
      throw exchangeError
    }
  }

  throw new Error(`No access token available for shop: ${shop}`)
}

/**
 * Validate a session token JWT
 * This should be called before attempting token exchange
 */
export function validateSessionToken(token: string): boolean {
  if (!token) return false

  try {
    // Session tokens are JWT format: header.payload.signature
    const parts = token.split('.')
    if (parts.length !== 3) {
      console.error('❌ Invalid session token format')
      return false
    }

    // Decode the payload
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())

    // Check expiration
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      console.error('❌ Session token expired')
      return false
    }

    // Check not before
    if (payload.nbf && payload.nbf > now) {
      console.error('❌ Session token not yet valid')
      return false
    }

    console.log('✅ Session token validation passed')
    return true
  } catch (error) {
    console.error('❌ Session token validation failed:', error)
    return false
  }
}