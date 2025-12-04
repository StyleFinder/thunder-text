import { GraphQLClient } from 'graphql-request'
import crypto from 'crypto'
import { logger } from '@/lib/logger'

/**
 * Shopify authentication for Next.js using Token Exchange
 * Following official Shopify documentation for embedded apps
 *
 * PRODUCTION-READY IMPLEMENTATION - NO BYPASSES OR FALLBACKS
 *
 * Authentication Flow:
 * 1. App Bridge generates session token (60-second expiry)
 * 2. Session token is verified using HMAC-SHA256 with client secret
 * 3. Token Exchange converts session token to access token
 * 4. Access token is used for all API calls
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
  // Use NEXT_PUBLIC_SHOPIFY_API_KEY for client ID (visible to client)
  // This will be the dev app's key in Preview environment
  const clientId = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || process.env.SHOPIFY_API_KEY
  const clientSecret = process.env.SHOPIFY_API_SECRET

  if (!clientId) {
    throw new Error('NEXT_PUBLIC_SHOPIFY_API_KEY or SHOPIFY_API_KEY environment variable is not set')
  }

  if (!clientSecret) {
    throw new Error('SHOPIFY_API_SECRET environment variable is not set')
  }


  const tokenExchangeUrl = `https://${shop}/admin/oauth/access_token`

  const requestBody = {
    client_id: clientId,
    client_secret: clientSecret,
    subject_token: sessionToken,
    subject_token_type: 'urn:ietf:params:oauth:token-type:id_token',
    grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
    requested_token_type: 'urn:shopify:params:oauth:token-type:offline-access-token',
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
      logger.error('Token exchange failed', new Error(`${response.status} ${response.statusText}`), {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        url: tokenExchangeUrl,
        clientId: clientId,
        component: 'shopify-auth',
        operation: 'token-exchange'
      })

      // Parse error if it's JSON
      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.error_description) {
          throw new Error(`Token exchange failed: ${errorJson.error_description}`)
        }
      } catch (e) {
        // Not JSON, use raw text
      }

      throw new Error(`Token exchange failed: ${response.status} ${errorText}`)
    }

    const data = await response.json() as TokenExchangeResponse
    // Token exchange successful

    return data
  } catch (error) {
    logger.error('Token exchange error', error as Error, { component: 'shopify-auth', operation: 'token-exchange' })
    throw error
  }
}

/**
 * Verify JWT signature for session token
 * This ensures the token is genuinely from Shopify
 * According to Shopify docs, session tokens are signed with the app's client secret
 */
function verifySessionToken(token: string): boolean {
  // Session tokens use the CLIENT SECRET, not API SECRET for signing
  const clientSecret = process.env.SHOPIFY_API_SECRET // This is actually the client secret

  if (!clientSecret) {
    logger.error('SHOPIFY_API_SECRET (client secret) not configured', undefined, { component: 'shopify-auth', operation: 'verify-session-token' })
    return false
  }

  logger.debug('Using client secret for verification', {
    component: 'shopify-auth',
    operation: 'verify-session-token',
    secretPreview: clientSecret.substring(0, 8) + '...',
    secretLength: clientSecret.length
  })

  try {
    const [header, payload, signature] = token.split('.')

    if (!header || !payload || !signature) {
      logger.error('Invalid session token format', undefined, { component: 'shopify-auth', operation: 'verify-session-token' })
      return false
    }

    // Create the signing input (header.payload)
    const signingInput = `${header}.${payload}`

    // Create HMAC-SHA256 signature using the client secret
    // Session tokens use HS256 algorithm according to Shopify docs
    const hmac = crypto.createHmac('sha256', clientSecret)
    hmac.update(signingInput)

    // Generate Base64url encoded signature (no padding, URL-safe)
    const calculatedSignature = hmac.digest('base64url')

    // Use timing-safe comparison to prevent timing attacks
    const expected = Buffer.from(calculatedSignature, 'utf8')
    const received = Buffer.from(signature, 'utf8')

    // Check length first (fast fail, not timing sensitive)
    if (expected.length !== received.length) {
      logger.error('Session token signature verification failed (length mismatch)', undefined, { component: 'shopify-auth', operation: 'verify-session-token' })
      return false
    }

    // Timing-safe comparison using crypto.timingSafeEqual
    const isValid = crypto.timingSafeEqual(expected, received)

    if (!isValid) {
      logger.error('Session token signature verification failed', undefined, {
        component: 'shopify-auth',
        operation: 'verify-session-token',
        isDevelopment: process.env.NODE_ENV === 'development'
      })
      // Don't log actual signatures in production to avoid leaking them
      if (process.env.NODE_ENV === 'development') {
        logger.debug(`Expected signature: ${calculatedSignature}`, { component: 'shopify-auth' })
        logger.debug(`Received signature: ${signature}`, { component: 'shopify-auth' })
      }
    } else {
    }

    return isValid
  } catch (error) {
    logger.error('Error verifying session token', error as Error, { component: 'shopify-auth', operation: 'verify-session-token' })
    return false
  }
}

/**
 * Parse JWT payload without verification (for debugging)
 */
interface ShopifyJWTPayload {
  iss: string
  dest: string
  aud: string
  sub: string
  exp: number
  nbf: number
  iat: number
  jti: string
  sid: string
}

function parseJWT(token: string): ShopifyJWTPayload | null {
  try {
    const [, payload] = token.split('.')
    return JSON.parse(Buffer.from(payload, 'base64').toString()) as ShopifyJWTPayload
  } catch (error) {
    logger.error('Error parsing JWT', error as Error, { component: 'shopify-auth', operation: 'parse-jwt' })
    return null
  }
}

/**
 * Authenticate a request and get access token
 * This implements proper Token Exchange without any fallbacks
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

    if (!sessionToken) {
      throw new Error('No session token provided - authentication required')
    }

    // Extract shop from request or use provided one
    let shop = options?.shop
    if (!shop) {
      const url = new URL(request.url)
      shop = url.searchParams.get('shop') || undefined

      // Also try to get from JWT payload
      if (sessionToken && !shop) {
        const payload = parseJWT(sessionToken)
        shop = (payload?.dest as string | undefined)?.replace('https://', '')
      }
    }

    if (!shop) {
      throw new Error('Shop domain is required for authentication')
    }

    // Ensure shop has .myshopify.com suffix
    if (!shop.includes('.myshopify.com')) {
      shop = `${shop}.myshopify.com`
    }

    // Parse the token to check its validity
    const payload = parseJWT(sessionToken)

    // Validate required fields per Shopify documentation
    if (!payload?.iss || !payload?.dest || !payload?.aud || !payload?.sub) {
      logger.error('Session token missing required fields', undefined, { component: 'shopify-auth', operation: 'authenticate-request' })
      throw new Error('Invalid session token: missing required fields')
    }

    // Verify the dest field matches the shop
    if (!payload.dest.includes(shop.replace('.myshopify.com', ''))) {
      logger.error('Session token dest does not match shop', undefined, {
        dest: payload.dest,
        shop,
        component: 'shopify-auth',
        operation: 'authenticate-request'
      })
      throw new Error('Session token shop mismatch')
    }

    // Verify the aud field matches our app's client ID
    // Use NEXT_PUBLIC_SHOPIFY_API_KEY which is set per environment
    const expectedClientId = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || process.env.SHOPIFY_API_KEY
    if (expectedClientId && payload.aud !== expectedClientId) {
      logger.error('Session token audience does not match app client ID', undefined, {
        aud: payload.aud,
        expected: expectedClientId,
        component: 'shopify-auth',
        operation: 'authenticate-request'
      })
      throw new Error('Session token audience mismatch')
    }

    // Check token nbf (not before)
    if (payload?.nbf && payload.nbf * 1000 > Date.now()) {
      logger.error('Session token not yet valid', undefined, { component: 'shopify-auth', operation: 'authenticate-request' })
      throw new Error('Session token not yet valid')
    }

    // Check token expiry
    if (payload?.exp && payload.exp * 1000 < Date.now()) {
      logger.error('Session token expired', undefined, {
        expiredAt: new Date(payload.exp * 1000),
        currentTime: new Date(),
        component: 'shopify-auth',
        operation: 'authenticate-request'
      })
      throw new Error('Session token expired')
    }

    // Verify the token signature - REQUIRED for production
    if (!verifySessionToken(sessionToken)) {
      logger.error('Session token signature verification failed - required for production security', undefined, { component: 'shopify-auth', operation: 'authenticate-request' })
      throw new Error('Invalid session token signature')
    }


    // Exchange for access token
    const tokenData = await exchangeToken(sessionToken, shop)

    // Store the token in database for future use
    const { saveShopToken } = await import('./shopify/token-manager')
    await saveShopToken(shop, tokenData.access_token, 'offline')

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
  } catch (error) {
    logger.error('Authentication failed', error as Error, { component: 'shopify-auth', operation: 'authenticate-request' })
    throw error
  }
}

/**
 * Get access token for a shop
 * This requires proper session token - no fallbacks
 */
export async function getAccessToken(shop: string, sessionToken?: string): Promise<string> {
  // Ensure shop has .myshopify.com suffix
  if (!shop.includes('.myshopify.com')) {
    shop = `${shop}.myshopify.com`
  }

  // First, always check database for stored access token
  // This is more efficient and avoids unnecessary token exchanges
  const { getShopToken } = await import('./shopify/token-manager')
  const dbToken = await getShopToken(shop)

  if (dbToken.success && dbToken.accessToken) {
    return dbToken.accessToken
  }

  // If no stored token and we have a session token, do token exchange
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
        return accessToken
      }
    } catch (error) {
      logger.error('Token Exchange failed', error as Error, { component: 'shopify-auth', operation: 'get-access-token', shop })
      throw error // Don't fall back, throw the error
    }
  }

  throw new Error(`No valid authentication available for shop: ${shop}. Session token required for embedded apps.`)
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
  user: Record<string, unknown> | null
}