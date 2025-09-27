'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'

interface UnifiedAuthContextType {
  isAuthenticated: boolean
  isEmbedded: boolean
  shop: string | null
  host: string | null
  isLoading: boolean
  error: string | null
  sessionToken: string | null
  performTokenExchange: () => Promise<void>
}

const UnifiedAuthContext = createContext<UnifiedAuthContextType>({
  isAuthenticated: false,
  isEmbedded: false,
  shop: null,
  host: null,
  isLoading: true,
  error: null,
  sessionToken: null,
  performTokenExchange: async () => {}
})

export const useUnifiedAuth = () => useContext(UnifiedAuthContext)

interface UnifiedAuthProviderProps {
  children: ReactNode
}

export function UnifiedAuthProvider({ children }: UnifiedAuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [shop, setShop] = useState<string | null>(null)
  const [host, setHost] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const searchParams = useSearchParams()

  // Determine if we're in embedded context
  const isEmbedded = typeof window !== 'undefined' && (
    window.top !== window.self ||
    searchParams?.get('embedded') === '1' ||
    !!searchParams?.get('host')
  )

  const performTokenExchange = useCallback(async () => {
    try {
      const shopParam = searchParams?.get('shop')
      const hostParam = searchParams?.get('host')
      const authenticated = searchParams?.get('authenticated') === 'true'

      if (!shopParam) {
        console.log('No shop parameter found')
        setIsLoading(false)
        return
      }

      setShop(shopParam)
      setHost(hostParam)

      // For non-embedded contexts (direct URL access)
      if (!isEmbedded) {
        console.log('Direct URL access - checking authenticated parameter')
        setIsAuthenticated(authenticated)
        setIsLoading(false)
        return
      }

      // For embedded contexts, we need proper App Bridge authentication
      console.log('🔄 Embedded context detected, starting App Bridge authentication')

      // Check if token exchange was already completed in this session
      const exchangeCompleted = window.sessionStorage.getItem('token_exchange_completed')
      if (exchangeCompleted === shopParam) {
        const storedToken = window.sessionStorage.getItem('shopify_session_token')
        if (storedToken) {
          console.log('✅ Using existing session token')
          setSessionToken(storedToken)
          setIsAuthenticated(true)
          setIsLoading(false)
          return
        }
      }

      // Import App Bridge from npm package (NOT from CDN)
      console.log('📦 Importing App Bridge from npm package...')
      const { createApp } = await import('@shopify/app-bridge')
      const { getSessionToken } = await import('@shopify/app-bridge/utilities')

      // Create App Bridge instance
      const app = createApp({
        apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY!,
        host: hostParam || '',
        forceRedirect: false
      })

      console.log('🔑 Getting session token from App Bridge...')

      // Get session token
      const token = await getSessionToken(app)

      if (!token) {
        throw new Error('Failed to get session token from Shopify')
      }

      console.log('📝 Got session token, performing exchange...')
      setSessionToken(token)

      // Store session token for API calls
      window.sessionStorage.setItem('shopify_session_token', token)

      // Exchange session token for access token
      const response = await fetch('/api/shopify/token-exchange', {
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

      if (result.success) {
        console.log('✅ Token exchange successful')
        window.sessionStorage.setItem('token_exchange_completed', shopParam)
        setIsAuthenticated(true)
        setError(null)

        // Set up automatic token refresh (tokens expire after 1 minute)
        const refreshInterval = setInterval(async () => {
          try {
            const newToken = await getSessionToken(app)
            if (newToken) {
              window.sessionStorage.setItem('shopify_session_token', newToken)
              setSessionToken(newToken)
              console.log('🔄 Session token refreshed')
            }
          } catch (err) {
            console.error('Failed to refresh session token:', err)
          }
        }, 30000) // Refresh every 30 seconds

        // Clean up interval on unmount
        return () => clearInterval(refreshInterval)

      } else {
        console.error('❌ Token exchange failed:', result.error)
        setError(result.error || 'Authentication failed')
        setIsAuthenticated(false)
      }

    } catch (err) {
      console.error('❌ Authentication error:', err)
      setError(err instanceof Error ? err.message : 'Authentication failed')
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }, [searchParams, isEmbedded])

  useEffect(() => {
    // Perform token exchange on mount
    const timeoutId = setTimeout(() => {
      performTokenExchange()
    }, 100) // Small delay to ensure DOM is ready

    return () => clearTimeout(timeoutId)
  }, []) // Empty dependency array - only run once

  return (
    <UnifiedAuthContext.Provider value={{
      isAuthenticated,
      isEmbedded,
      shop,
      host,
      isLoading,
      error,
      sessionToken,
      performTokenExchange
    }}>
      {children}
    </UnifiedAuthContext.Provider>
  )
}