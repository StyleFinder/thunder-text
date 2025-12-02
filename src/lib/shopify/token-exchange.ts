/**
 * Token Exchange implementation for Shopify authentication
 * Replaces the deprecated static access token approach
 */

import { getShopToken, saveShopToken } from './token-manager'
import { logger } from '@/lib/logger'

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
      const errorMessage = response.status === 400
        ? 'Invalid session token - token may be expired or malformed'
        : response.status === 401
        ? 'Invalid client credentials'
        : `Token exchange failed: ${response.statusText}`

      logger.error('Token exchange failed', new Error(errorMessage), {
        component: 'shopify-token-exchange',
        operation: 'exchangeToken',
        responseStatus: response.status,
        responseStatusText: response.statusText,
        error: errorText,
        shop
      })

      throw new Error(errorMessage)
    }

    const tokenData: TokenExchangeResponse = await response.json()

    // Save the access token to database for future use
    if (requestedTokenType === 'offline') {
      await saveShopToken(
        shop,
        tokenData.access_token,
        'offline',
        tokenData.scope
      )
      logger.info('Offline access token saved to database', {
        component: 'token-exchange',
        shop
      })
    }

    return tokenData
  } catch (error) {
    logger.error('Token exchange error', error as Error, {
      component: 'shopify-token-exchange',
      operation: 'exchangeToken',
      shop
    })
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

  // First try to get from database (for offline tokens)
  const dbToken = await getShopToken(shop)
  if (dbToken.success && dbToken.accessToken) {
    return dbToken.accessToken
  }

  // If no database token and we have a session token, exchange it
  if (sessionToken) {

    const clientId = process.env.SHOPIFY_API_KEY
    const clientSecret = process.env.SHOPIFY_API_SECRET

    if (!clientId || !clientSecret) {
      logger.error('Missing Shopify API credentials in environment', new Error('Missing Shopify API credentials'), {
        component: 'shopify-token-exchange',
        operation: 'getOrExchangeToken'
      })
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
      logger.error('Token exchange failed, checking database again', exchangeError as Error, {
        component: 'shopify-token-exchange',
        operation: 'getOrExchangeToken',
        shop
      })

      // Try database one more time - maybe it was just added
      const retryDbToken = await getShopToken(shop)
      if (retryDbToken.success && retryDbToken.accessToken) {
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
      logger.error('❌ Invalid session token format', undefined, { component: 'token-exchange' })
      return false
    }

    // Decode the payload
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())

    // Check expiration
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      logger.error('❌ Session token expired', undefined, { component: 'token-exchange' })
      return false
    }

    // Check not before
    if (payload.nbf && payload.nbf > now) {
      logger.error('Session token not yet valid', new Error('Session token not yet valid'), {
        component: 'shopify-token-exchange',
        operation: 'validateSessionToken'
      })
      return false
    }

    return true
  } catch (error) {
    logger.error('Session token validation failed', error as Error, {
      component: 'shopify-token-exchange',
      operation: 'validateSessionToken'
    })
    return false
  }
}