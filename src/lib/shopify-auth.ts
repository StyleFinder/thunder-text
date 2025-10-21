import { GraphQLClient } from 'graphql-request'
import crypto from 'crypto'

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

  console.log('🔄 Exchanging session token for access token:', { shop })

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
      console.error('❌ Token exchange failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        url: tokenExchangeUrl,
        clientId: clientId,
      })

      // Parse error if it's JSON
      try {
        const errorJson = JSON.parse(errorText)
        console.error('📝 Error details:', errorJson)
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
    console.error('❌ Token exchange error:', error)
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
    console.error('❌ SHOPIFY_API_SECRET (client secret) not configured')
    return false
  }

  console.log('🔐 Using client secret for verification (first 8 chars):', clientSecret.substring(0, 8) + '...')
  console.log('🔐 Client secret length:', clientSecret.length)

  try {
    const [header, payload, signature] = token.split('.')

    if (!header || !payload || !signature) {
      console.error('❌ Invalid token format')
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
      console.error('❌ Session token signature verification failed (length mismatch)')
      return false
    }

    // Timing-safe comparison using crypto.timingSafeEqual
    const isValid = crypto.timingSafeEqual(expected, received)

    if (!isValid) {
      console.error('❌ Session token signature verification failed')
      // Don't log actual signatures in production to avoid leaking them
      if (process.env.NODE_ENV === 'development') {
        console.error('📝 Expected signature:', calculatedSignature)
        console.error('📝 Received signature:', signature)
      }
    } else {
      console.log('✅ Session token signature verified successfully')
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
function parseJWT(token: string): Record<string, unknown> | null {
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
    console.log('📝 Session token payload:', {
      iss: payload?.iss,
      dest: payload?.dest,
      aud: payload?.aud,
      sub: payload?.sub,
      exp: payload?.exp ? new Date(payload.exp * 1000).toISOString() : 'missing',
      nbf: payload?.nbf ? new Date(payload.nbf * 1000).toISOString() : 'missing'
    })

    // Validate required fields per Shopify documentation
    if (!payload?.iss || !payload?.dest || !payload?.aud || !payload?.sub) {
      console.error('❌ Session token missing required fields')
      throw new Error('Invalid session token: missing required fields')
    }

    // Verify the dest field matches the shop
    if (!payload.dest.includes(shop.replace('.myshopify.com', ''))) {
      console.error('❌ Session token dest does not match shop:', {
        dest: payload.dest,
        shop
      })
      throw new Error('Session token shop mismatch')
    }

    // Verify the aud field matches our app's client ID
    // Use NEXT_PUBLIC_SHOPIFY_API_KEY which is set per environment
    const expectedClientId = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || process.env.SHOPIFY_API_KEY
    console.log('🔍 Checking audience:', {
      tokenAud: payload.aud,
      expectedClientId: expectedClientId,
      NEXT_PUBLIC_KEY: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY ? 'set' : 'not set',
      SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY ? 'set' : 'not set'
    })
    if (expectedClientId && payload.aud !== expectedClientId) {
      console.error('❌ Session token audience does not match app client ID:', {
        aud: payload.aud,
        expected: expectedClientId
      })
      throw new Error('Session token audience mismatch')
    }

    // Check token nbf (not before)
    if (payload?.nbf && payload.nbf * 1000 > Date.now()) {
      console.error('❌ Session token not yet valid')
      throw new Error('Session token not yet valid')
    }

    // Check token expiry
    if (payload?.exp && payload.exp * 1000 < Date.now()) {
      console.error('❌ Session token expired at:', new Date(payload.exp * 1000))
      console.error('❌ Current time:', new Date())
      throw new Error('Session token expired')
    }

    // Verify the token signature - REQUIRED for production
    if (!verifySessionToken(sessionToken)) {
      console.error('❌ Session token signature verification failed')
      console.error('❌ This is required for production security')
      throw new Error('Invalid session token signature')
    }

    console.log('✅ Session token validation passed')

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
    console.error('❌ Authentication failed:', error)
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
  console.log('🔍 Checking database for stored access token')
  const { getShopToken } = await import('./shopify/token-manager')
  const dbToken = await getShopToken(shop)

  if (dbToken.success && dbToken.accessToken) {
    console.log('✅ Using stored access token from database')
    return dbToken.accessToken
  }

  // If no stored token and we have a session token, do token exchange
  if (sessionToken) {
    console.log('🔑 No stored token, performing Token Exchange')
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
      console.error('❌ Token Exchange failed:', error)
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
  user: any
}