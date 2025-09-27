import { shopifyApp } from '@shopify/shopify-app-remix'
import { SupabaseSessionStorage } from './shopify/session-storage'
import { restResources } from '@shopify/shopify-api/rest/admin/2025-01'

/**
 * Official Shopify authentication configuration using @shopify/shopify-app-remix
 * This replaces our manual token exchange implementation
 */

if (!process.env.SHOPIFY_API_KEY) {
  throw new Error('SHOPIFY_API_KEY environment variable is not set')
}

if (!process.env.SHOPIFY_API_SECRET) {
  throw new Error('SHOPIFY_API_SECRET environment variable is not set')
}

// Get app URL from environment or use Vercel URL
const appUrl = process.env.SHOPIFY_APP_URL ||
                process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                'https://thunder-text-nine.vercel.app'

console.log('🔧 Initializing Shopify app with URL:', appUrl)

// Initialize the Shopify app with official configuration
export const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  apiVersion: '2025-01',
  scopes: process.env.SCOPES?.split(',') || [
    'read_products',
    'write_products',
    'read_content',
    'write_content',
  ],
  appUrl,
  authPathPrefix: '/api/auth',
  sessionStorage: new SupabaseSessionStorage(),
  distribution: 'EMBEDDED_APP',
  restResources,
  isEmbeddedApp: true,
  // Enable new embedded auth strategy for Token Exchange
  future: {
    unstable_newEmbeddedAuthStrategy: true,
  },
  webhooks: {
    APP_UNINSTALLED: {
      deliveryMethod: 'http',
      callbackUrl: '/api/webhooks',
    },
  },
})

/**
 * Authenticate a request and get access token
 * This replaces our manual token exchange implementation
 */
export async function authenticateRequest(
  request: Request,
  options?: {
    sessionToken?: string,
    shop?: string
  }
) {
  try {
    // If we have a session token, create a request with it
    if (options?.sessionToken) {
      const headers = new Headers(request.headers)
      headers.set('Authorization', `Bearer ${options.sessionToken}`)
      request = new Request(request.url, {
        method: request.method,
        headers,
        body: request.body,
      })
    }

    // Use official Shopify authentication
    const { admin, session } = await shopify.authenticate.admin(request)

    return {
      admin,
      session,
      accessToken: session.accessToken,
      shop: session.shop,
    }
  } catch (error) {
    console.error('❌ Authentication failed:', error)

    // Try to get token from database if session auth fails
    if (options?.shop) {
      const { getShopToken } = await import('./shopify/token-manager')
      const dbToken = await getShopToken(options.shop)

      if (dbToken.success && dbToken.accessToken) {
        console.log('✅ Using database token as fallback')
        return {
          admin: null,
          session: null,
          accessToken: dbToken.accessToken,
          shop: options.shop,
        }
      }
    }

    throw error
  }
}

/**
 * Get access token for a shop
 * This is a simplified wrapper around the official authentication
 */
export async function getAccessToken(shop: string, sessionToken?: string): Promise<string> {
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

// Export types
export type { Session } from '@shopify/shopify-app-remix'