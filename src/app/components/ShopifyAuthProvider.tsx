'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import createApp from '@shopify/app-bridge'
import { getSessionToken, authenticatedFetch } from '@shopify/app-bridge/utilities'
import type { ClientApplication } from '@shopify/app-bridge'

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
  const isEmbedded = typeof window !== 'undefined' && (
    window.top !== window.self ||
    searchParams?.get('embedded') === '1' ||
    !!searchParams?.get('host')
  )

  // Initialize authentication
  const initializeAuth = useCallback(async () => {
    try {
      const shopParam = searchParams?.get('shop')
      const hostParam = searchParams?.get('host')

      if (!shopParam) {
        console.error('❌ Missing shop parameter')
        setError('Missing shop parameter')
        setIsLoading(false)
        return
      }

      setShop(shopParam)
      setHost(hostParam)

      // Check if we're in embedded context (REQUIRED for production)
      if (!isEmbedded) {
        console.error('❌ App must be accessed through Shopify admin (embedded context)')
        console.error('Direct URL access is not allowed in production')
        setError('This app must be accessed through your Shopify admin panel')
        setIsAuthenticated(false)
        setIsLoading(false)
        return
      }

      console.log('✅ Embedded context detected, initializing App Bridge')

      // Get API key from environment
      const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY

      if (!apiKey) {
        console.error('❌ NEXT_PUBLIC_SHOPIFY_API_KEY not configured')
        setError('App configuration error: API key missing')
        setIsLoading(false)
        return
      }

      if (!hostParam) {
        console.error('❌ Missing host parameter required for App Bridge')
        setError('Missing host parameter')
        setIsLoading(false)
        return
      }

      // Create App Bridge instance (following Shopify documentation)
      console.log('🔧 Creating App Bridge instance...')
      const appInstance = createApp({
        apiKey: apiKey,
        host: hostParam,
        forceRedirect: false // Don't force redirect for better UX
      })

      setApp(appInstance)

      // Create authenticatedFetch that will be used for all API calls
      authFetch.current = authenticatedFetch(appInstance)

      // Get initial session token
      console.log('🔑 Getting session token from App Bridge...')
      const token = await getSessionToken(appInstance)

      if (!token) {
        console.error('❌ Failed to get session token')
        // Session token might not be available yet, try bounce page
        const bounceUrl = `/api/auth/session-bounce?shop=${shopParam}&host=${hostParam}&return_url=${encodeURIComponent(window.location.pathname + window.location.search)}`
        console.log('🔄 Redirecting to bounce page to establish session...')
        window.location.href = bounceUrl
        return
      }

      console.log('✅ Got session token successfully')
      setSessionToken(token)

      // Store in sessionStorage for other components (optional)
      sessionStorage.setItem('shopify_session_token', token)
      sessionStorage.setItem('shopify_shop', shopParam)

      // Exchange token with backend for access token
      console.log('🔄 Exchanging session token for access token...')
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
        console.error('❌ Token exchange failed:', result.error)
        setError(result.error || 'Authentication failed')
        setIsAuthenticated(false)
      } else {
        console.log('✅ Authentication successful')
        setIsAuthenticated(true)
        sessionStorage.setItem('token_exchange_completed', shopParam)

        // Set up automatic token refresh
        // Session tokens expire after ~1 minute, so refresh every 50 seconds
        const refreshInterval = setInterval(async () => {
          try {
            const newToken = await getSessionToken(appInstance)
            if (newToken) {
              setSessionToken(newToken)
              sessionStorage.setItem('shopify_session_token', newToken)
              console.log('🔄 Session token refreshed')
            }
          } catch (err) {
            console.error('❌ Token refresh failed:', err)
          }
        }, 50000) // 50 seconds

        // Cleanup on unmount
        return () => clearInterval(refreshInterval)
      }
    } catch (error) {
      console.error('❌ Authentication initialization error:', error)
      setError(error instanceof Error ? error.message : 'Authentication failed')
      setIsAuthenticated(false)
    } finally {
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