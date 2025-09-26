'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'

interface AuthContextType {
  isAuthenticated: boolean
  shop: string | null
  isLoading: boolean
  error: string | null
  performTokenExchange: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  shop: null,
  isLoading: true,
  error: null,
  performTokenExchange: async () => {}
})

export const useShopifyAuth = () => useContext(AuthContext)

interface ShopifyAuthProviderProps {
  children: ReactNode
}

export function ShopifyAuthProvider({ children }: ShopifyAuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [shop, setShop] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()

  const performTokenExchange = async () => {
    try {
      const shopParam = searchParams?.get('shop')
      if (!shopParam) {
        console.log('No shop parameter found')
        setIsLoading(false)
        return
      }

      setShop(shopParam)

      // Check if we're in an embedded context
      const isEmbedded = searchParams?.get('embedded') === '1' ||
                        window.top !== window.self

      if (!isEmbedded) {
        console.log('Not in embedded context, skipping token exchange')
        // For non-embedded contexts (like direct URL access),
        // we'll rely on the authenticated=true parameter
        const authenticated = searchParams?.get('authenticated') === 'true'
        setIsAuthenticated(authenticated)
        setIsLoading(false)
        return
      }

      console.log('🔄 Starting token exchange for shop:', shopParam)

      // Load Shopify App Bridge
      const script = document.createElement('script')
      script.src = 'https://cdn.shopify.com/shopifycloud/app-bridge.js'
      script.async = true

      script.onload = async () => {
        try {
          // @ts-ignore - Shopify global will be available after script loads
          const { createApp } = window.shopify

          const app = createApp({
            apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY!,
            host: new URLSearchParams(window.location.search).get('host') || ''
          })

          // Get session token from App Bridge
          const sessionToken = await app.sessionToken()

          if (!sessionToken) {
            throw new Error('Failed to get session token from Shopify')
          }

          console.log('📝 Got session token, performing exchange...')

          // Exchange session token for access token
          const response = await fetch('/api/shopify/token-exchange', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionToken,
              shop: shopParam
            })
          })

          const result = await response.json()

          if (result.success) {
            console.log('✅ Token exchange successful')
            setIsAuthenticated(true)
            setError(null)
          } else {
            console.error('❌ Token exchange failed:', result.error)
            setError(result.error || 'Authentication failed')
            setIsAuthenticated(false)
          }
        } catch (err) {
          console.error('❌ Error during token exchange:', err)
          setError(err instanceof Error ? err.message : 'Authentication error')
          setIsAuthenticated(false)
        } finally {
          setIsLoading(false)
        }
      }

      script.onerror = () => {
        console.error('Failed to load Shopify App Bridge')
        setError('Failed to load Shopify App Bridge')
        setIsLoading(false)
      }

      document.head.appendChild(script)

    } catch (err) {
      console.error('❌ Authentication error:', err)
      setError(err instanceof Error ? err.message : 'Authentication failed')
      setIsAuthenticated(false)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    performTokenExchange()
  }, [searchParams])

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      shop,
      isLoading,
      error,
      performTokenExchange
    }}>
      {children}
    </AuthContext.Provider>
  )
}