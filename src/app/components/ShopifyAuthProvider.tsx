'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import createApp from '@shopify/app-bridge'
import { getSessionToken, authenticatedFetch } from '@shopify/app-bridge/utilities'
import type { ClientApplication } from '@shopify/app-bridge'
import { logger } from '@/lib/logger'

interface ShopifyAuthContextType {
  isAuthenticated: boolean
  isEmbedded: boolean
  shop: string | null
  host: string | null
  isLoading: boolean
  error: string | null
  sessionToken: string | null
  app: ClientApplication | null
  authenticatedFetch: typeof fetch
}

const ShopifyAuthContext = createContext<ShopifyAuthContextType>({
  isAuthenticated: false,
  isEmbedded: false,
  shop: null,
  host: null,
  isLoading: true,
  error: null,
  sessionToken: null,
  app: null,
  authenticatedFetch: fetch,
})

export const useShopifyAuth = () => useContext(ShopifyAuthContext)

interface ShopifyAuthProviderProps {
  children: ReactNode
}

function ShopifyAuthProviderContent({ children }: ShopifyAuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [shop, setShop] = useState<string | null>(null)
  const [host, setHost] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [app, setApp] = useState<ClientApplication | null>(null)
  const searchParams = useSearchParams()
  const authFetch = useRef<typeof fetch>(fetch)

  // Determine if we're in embedded context
  // Only consider it embedded if we're actually in an iframe
  const isEmbedded = typeof window !== 'undefined' && (
    window.top !== window.self ||
    searchParams?.get('embedded') === '1'
  )

  // Initialize authentication
  const initializeAuth = useCallback(async () => {
    try {
      const shopParam = searchParams?.get('shop')
      const hostParam = searchParams?.get('host')

      if (!shopParam) {
        logger.error('Missing shop parameter', new Error('Shop parameter not found'), {
          component: 'ShopifyAuthProvider',
          operation: 'initializeAuth'
        })
        setError('Missing shop parameter')
        setIsLoading(false)
        return
      }

      setShop(shopParam)
      setHost(hostParam)

      // Check if we're in embedded context (REQUIRED for production stores)
      // Allow non-embedded access for test store only
      const isTestStore = shopParam.includes('zunosai-staging-test-store')

      if (!isEmbedded) {
        if (!isTestStore) {
          logger.error('App must be accessed through Shopify admin', new Error('Not in embedded context'), {
            component: 'ShopifyAuthProvider',
            operation: 'initializeAuth',
            shop: shopParam
          })
          setError('This app must be accessed through your Shopify admin panel')
          setIsAuthenticated(false)
          setIsLoading(false)
          return
        }

        // For test store in non-embedded mode, set up basic auth
        setIsAuthenticated(true)
        setIsLoading(false)
        // Use regular fetch as authenticatedFetch
        authFetch.current = fetch
        return
      }


      // Get API key from environment
      const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY

      if (!apiKey) {
        logger.error('NEXT_PUBLIC_SHOPIFY_API_KEY not configured', new Error('API key missing'), {
          component: 'ShopifyAuthProvider',
          operation: 'initializeAuth'
        })
        setError('App configuration error: API key missing')
        setIsLoading(false)
        return
      }

      if (!hostParam) {
        logger.error('Missing host parameter required for App Bridge', new Error('Host parameter missing'), {
          component: 'ShopifyAuthProvider',
          operation: 'initializeAuth',
          shop: shopParam
        })
        setError('Missing host parameter')
        setIsLoading(false)
        return
      }

      // Create App Bridge instance (following Shopify documentation)
      const appInstance = createApp({
        apiKey: apiKey,
        host: hostParam,
        forceRedirect: false // Don't force redirect for better UX
      })

      setApp(appInstance)

      // Create authenticatedFetch that will be used for all API calls
      authFetch.current = authenticatedFetch(appInstance)

      // Get initial session token
      const token = await getSessionToken(appInstance)

      if (!token) {
        logger.error('Failed to get session token', new Error('Empty session token'), {
          component: 'ShopifyAuthProvider',
          operation: 'initializeAuth',
          shop: shopParam
        })
        // Session token might not be available yet, try bounce page
        const bounceUrl = `/api/auth/session-bounce?shop=${shopParam}&host=${hostParam}&return_url=${encodeURIComponent(window.location.pathname + window.location.search)}`
        window.location.href = bounceUrl
        return
      }

      setSessionToken(token)

      // Store in sessionStorage for other components (optional)
      sessionStorage.setItem('shopify_session_token', token)
      sessionStorage.setItem('shopify_shop', shopParam)

      // Exchange token with backend for access token
      const response = await authFetch.current('/api/shopify/token-exchange', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionToken: token,
          shop: shopParam
        })
      })


      const result = await response.json()

      if (!response.ok || !result.success) {
        logger.error('Token exchange failed', new Error(result.error || 'Token exchange failed'), {
          component: 'ShopifyAuthProvider',
          operation: 'tokenExchange',
          status: response.status,
          details: result.details,
          debugInfo: result.debugInfo,
          shop: shopParam
        })

        // More specific error messages based on status
        let errorMessage = 'Authentication failed'
        if (response.status === 401) {
          errorMessage = 'Invalid session token. Please refresh the page.'
        } else if (response.status === 403) {
          errorMessage = 'Token exchange forbidden. Check app configuration.'
        } else if (result.error) {
          errorMessage = result.error
        }

        setError(errorMessage)
        setIsAuthenticated(false)
      } else {
        setIsAuthenticated(true)
        setIsLoading(false) // Set loading to false immediately after successful auth
        sessionStorage.setItem('token_exchange_completed', shopParam)

        // Set up automatic token refresh
        // Session tokens expire after ~1 minute, so refresh every 50 seconds
        const refreshInterval = setInterval(async () => {
          try {
            const newToken = await getSessionToken(appInstance)
            if (newToken) {
              setSessionToken(newToken)
              sessionStorage.setItem('shopify_session_token', newToken)
            }
          } catch (err) {
            logger.error('Token refresh failed', err as Error, {
              component: 'ShopifyAuthProvider',
              operation: 'tokenRefresh',
              shop: shopParam
            })
          }
        }, 50000) // 50 seconds

        // Cleanup on unmount
        return () => clearInterval(refreshInterval)
      }
    } catch (error) {
      logger.error('Authentication initialization error', error as Error, {
        component: 'ShopifyAuthProvider',
        operation: 'initializeAuth'
      })
      setError(error instanceof Error ? error.message : 'Authentication failed')
      setIsAuthenticated(false)
      setIsLoading(false)
    }
  }, [searchParams, isEmbedded])

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  return (
    <ShopifyAuthContext.Provider value={{
      isAuthenticated,
      isEmbedded,
      shop,
      host,
      isLoading,
      error,
      sessionToken,
      app,
      authenticatedFetch: authFetch.current,
    }}>
      {children}
    </ShopifyAuthContext.Provider>
  )
}

// Wrapper component with Suspense for Next.js 13+
export function ShopifyAuthProvider({ children }: ShopifyAuthProviderProps) {
  return (
    <Suspense fallback={
      <ShopifyAuthContext.Provider value={{
        isAuthenticated: false,
        isEmbedded: false,
        shop: null,
        host: null,
        isLoading: true,
        error: null,
        sessionToken: null,
        app: null,
        authenticatedFetch: fetch,
      }}>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Initializing Shopify Authentication...</h2>
        </div>
      </ShopifyAuthContext.Provider>
    }>
      <ShopifyAuthProviderContent>{children}</ShopifyAuthProviderContent>
    </Suspense>
  )
}