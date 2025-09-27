import { GraphQLClient } from 'graphql-request'
import crypto from 'crypto'

/**
 * Shopify authentication for Next.js using Token Exchange
 * Following official Shopify documentation for embedded apps
 */

interface TokenExchangeResponse {
  access_token: string
  expires_in: number
  associated_user_scope: string
  associated_user: {
    id: number
    first_name: string
    last_name: string
    email: string
    email_verified: boolean
    account_owner: boolean
    locale: string
    collaborator: boolean
  }
  scope: string
}

/**
 * Exchange session token for access token using Shopify Token Exchange API
 * https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/token-exchange
 */
async function exchangeToken(sessionToken: string, shop: string): Promise<TokenExchangeResponse> {
  if (!process.env.SHOPIFY_API_KEY) {
    throw new Error('SHOPIFY_API_KEY environment variable is not set')
  }

  if (!process.env.SHOPIFY_API_SECRET) {
    throw new Error('SHOPIFY_API_SECRET environment variable is not set')
  }

  console.log('🔄 Exchanging session token for access token:', { shop })

  const tokenExchangeUrl = `https://${shop}/admin/oauth/access_token`

  const requestBody = {
    client_id: process.env.SHOPIFY_API_KEY,
    client_secret: process.env.SHOPIFY_API_SECRET,
    subject_token: sessionToken,
    subject_token_type: 'urn:ietf:params:oauth:token-type:id_token',
    grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
    requested_token_type: 'urn:shopify:params:oauth:token-type:online-access-token',
  }

  try {
    const response = await fetch(tokenExchangeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Token exchange failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      })
      throw new Error(`Token exchange failed: ${response.status} ${errorText}`)
    }

    const data = await response.json() as TokenExchangeResponse
    console.log('✅ Token exchange successful:', {
      scope: data.scope,
      expiresIn: data.expires_in,
      user: data.associated_user?.email,
    })

    return data
  } catch (error) {
    console.error('❌ Token exchange error:', error)
    throw error
  }
}

/**
 * Verify JWT signature for session token
 * This ensures the token is genuinely from Shopify
 */
function verifySessionToken(token: string): boolean {
  if (!process.env.SHOPIFY_API_SECRET) {
    console.error('❌ SHOPIFY_API_SECRET not configured')
    return false
  }

  try {
    const [header, payload, signature] = token.split('.')

    // Create the signing input
    const signingInput = `${header}.${payload}`

    // Create HMAC signature using the API secret
    const hmac = crypto.createHmac('sha256', process.env.SHOPIFY_API_SECRET)
    hmac.update(signingInput)
    const calculatedSignature = hmac.digest('base64url')

    // Compare signatures
    const isValid = calculatedSignature === signature

    if (!isValid) {
      console.error('❌ Session token signature verification failed')
    }

    return isValid
  } catch (error) {
    console.error('❌ Error verifying session token:', error)
    return false
  }
}

/**
 * Parse JWT payload without verification (for debugging)
 */
function parseJWT(token: string): any {
  try {
    const [, payload] = token.split('.')
    return JSON.parse(Buffer.from(payload, 'base64').toString())
  } catch (error) {
    console.error('❌ Error parsing JWT:', error)
    return null
  }
}

/**
 * Authenticate a request and get access token
 * This handles both Token Exchange and database fallback
 */
export async function authenticateRequest(
  request: Request,
  options?: {
    sessionToken?: string,
    shop?: string
  }
) {
  try {
    // Extract session token from request or use provided one
    let sessionToken = options?.sessionToken

    if (!sessionToken) {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        sessionToken = authHeader.substring(7)
      }
    }

    // Extract shop from request or use provided one
    let shop = options?.shop
    if (!shop) {
      const url = new URL(request.url)
      shop = url.searchParams.get('shop') || undefined

      // Also try to get from JWT payload
      if (sessionToken && !shop) {
        const payload = parseJWT(sessionToken)
        shop = payload?.dest?.replace('https://', '')
      }
    }

    if (!shop) {
      throw new Error('Shop domain is required for authentication')
    }

    // Ensure shop has .myshopify.com suffix
    if (!shop.includes('.myshopify.com')) {
      shop = `${shop}.myshopify.com`
    }

    // If we have a session token, verify and exchange it
    if (sessionToken) {
      // Verify the token signature
      if (!verifySessionToken(sessionToken)) {
        console.error('❌ Session token signature verification failed')
        throw new Error('Invalid session token signature')
      }

      // Check token expiry
      const payload = parseJWT(sessionToken)
      if (payload?.exp && payload.exp * 1000 < Date.now()) {
        console.error('❌ Session token expired')
        throw new Error('Session token expired')
      }

      // Exchange for access token
      const tokenData = await exchangeToken(sessionToken, shop)

      // Store the token in database for future use
      const { saveShopToken } = await import('./shopify/token-manager')
      await saveShopToken(shop, tokenData.access_token, 'online')

      return {
        admin: null, // We'll create GraphQL client when needed
        session: {
          shop,
          accessToken: tokenData.access_token,
          scope: tokenData.scope,
          expires: new Date(Date.now() + tokenData.expires_in * 1000),
          user: tokenData.associated_user,
        },
        accessToken: tokenData.access_token,
        shop,
      }
    }

    // Try to get token from database as fallback
    const { getShopToken } = await import('./shopify/token-manager')
    const dbToken = await getShopToken(shop)

    if (dbToken.success && dbToken.accessToken) {
      console.log('✅ Using database token as fallback')
      return {
        admin: null,
        session: {
          shop,
          accessToken: dbToken.accessToken,
          scope: '',
          expires: null,
          user: null,
        },
        accessToken: dbToken.accessToken,
        shop,
      }
    }

    throw new Error(`No access token available for shop: ${shop}`)
  } catch (error) {
    console.error('❌ Authentication failed:', error)
    throw error
  }
}

/**
 * Get access token for a shop
 * This is a simplified wrapper around the authentication
 */
export async function getAccessToken(shop: string, sessionToken?: string): Promise<string> {
  // Ensure shop has .myshopify.com suffix
  if (!shop.includes('.myshopify.com')) {
    shop = `${shop}.myshopify.com`
  }

  // First try database token (most reliable for server-side calls)
  const { getShopToken } = await import('./shopify/token-manager')
  const dbToken = await getShopToken(shop)

  if (dbToken.success && dbToken.accessToken) {
    console.log('✅ Using stored access token from database')
    return dbToken.accessToken
  }

  // If we have a session token, use Token Exchange
  if (sessionToken) {
    try {
      // Create a mock request with the session token
      const request = new Request(`https://${shop}/api/auth`, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'X-Shopify-Shop-Domain': shop,
        },
      })

      const { accessToken } = await authenticateRequest(request, { sessionToken, shop })

      if (accessToken) {
        console.log('✅ Got access token via Token Exchange')
        return accessToken
      }
    } catch (error) {
      console.error('⚠️ Token Exchange failed:', error)
    }
  }

  throw new Error(`No access token available for shop: ${shop}`)
}

/**
 * Create a GraphQL client for Shopify Admin API
 */
export function createAdminClient(shop: string, accessToken: string) {
  const client = new GraphQLClient(
    `https://${shop}/admin/api/2025-01/graphql.json`,
    {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    }
  )

  return client
}

// Export types
export interface Session {
  shop: string
  accessToken: string
  scope: string
  expires: Date | null
  user: any
}