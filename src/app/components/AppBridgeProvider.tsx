'use client'

import { useEffect, useState, createContext, useContext } from 'react'
import { logger } from '@/lib/logger'

// Import ShopifyGlobal type from global declarations
interface AppBridgeContextType {
  isEmbedded: boolean
  shop: string | null
  host: string | null
  isLoading: boolean
  error: string | null
  app: (Pick<Window, 'shopify'>['shopify']) | null
}

const AppBridgeContext = createContext<AppBridgeContextType>({
  isEmbedded: false,
  shop: null,
  host: null,
  isLoading: true,
  error: null,
  app: null
})

export function useAppBridge() {
  return useContext(AppBridgeContext)
}

interface AppBridgeProviderProps {
  children: React.ReactNode
}

export function AppBridgeProvider({ children }: AppBridgeProviderProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [shop, setShop] = useState<string | null>(null)
  const [host, setHost] = useState<string | null>(null)
  const [embedded, setEmbedded] = useState<string | null>(null)
  const [appBridge, setAppBridge] = useState<Pick<Window, 'shopify'>['shopify'] | null>(null)

  // Get search params on client side only to avoid SSR issues
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      setShop(urlParams.get('shop'))
      setHost(urlParams.get('host'))
      setEmbedded(urlParams.get('embedded'))
    }
  }, [])

  // Detect if we're running in an embedded context
  const isEmbedded = typeof window !== 'undefined' &&
    (window.top !== window.self || embedded === '1' || !!host)

  useEffect(() => {
    const initializeAppBridge = async () => {
      try {
        if (isEmbedded && shop) {
          const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY

          // Skip App Bridge initialization if API key is missing
          if (!apiKey) {
            console.warn('⚠️ Shopify API Key not found. App Bridge disabled.')
            setIsLoading(false)
            return
          }

          // Check if App Bridge script is already loaded
          const existingScript = document.querySelector('script[src="https://cdn.shopify.com/shopifycloud/app-bridge.js"]')

          if (!existingScript && typeof window.shopify === 'undefined') {
            // Load App Bridge script
            await new Promise((resolve, reject) => {
              const script = document.createElement('script')
              script.src = 'https://cdn.shopify.com/shopifycloud/app-bridge.js'
              script.async = false // Avoid async warnings
              script.onload = resolve
              script.onerror = reject
              document.head.appendChild(script)
            })
          }

          // Wait for shopify global to be available
          let retries = 0
          while (typeof window.shopify === 'undefined' && retries < 20) {
            await new Promise(resolve => setTimeout(resolve, 100))
            retries++
          }

          if (typeof window.shopify === 'undefined') {
            throw new Error('Shopify App Bridge failed to load')
          }

          // Add API key meta tag if not present
          if (!document.querySelector('meta[name="shopify-api-key"]')) {
            const metaTag = document.createElement('meta')
            metaTag.name = 'shopify-api-key'
            metaTag.content = apiKey
            document.head.appendChild(metaTag)
          }

          setAppBridge(window.shopify)

          // Get initial session token using the shopify.idToken() method
          if (window.shopify) {
            try {
              const token = await window.shopify.idToken()

              // Store the token for API calls
              if (typeof window !== 'undefined') {
                window.sessionStorage.setItem('shopify_session_token', token)
              }

              // Set up automatic token refresh
              // Instead of a timer, we'll fetch fresh tokens on each request
              // This is more reliable and follows the guide's recommendation
              window.getShopifySessionToken = async () => {
                try {
                  if (!window.shopify) {
                    throw new Error('Shopify App Bridge not available')
                  }
                  const freshToken = await window.shopify.idToken()
                  window.sessionStorage.setItem('shopify_session_token', freshToken)
                  return freshToken
                } catch (error) {
                  logger.error('Failed to get session token:', error as Error, { component: 'AppBridgeProvider' })
                  throw error
                }
              }

            } catch (tokenError) {
              logger.error('Failed to get initial session token:', tokenError as Error, { component: 'AppBridgeProvider' })
              setError('Failed to authenticate with Shopify')
            }
          }
        }

        setIsLoading(false)
      } catch (err) {
        logger.error('App Bridge initialization failed:', err as Error, { component: 'AppBridgeProvider' })
        setError('Failed to initialize Shopify App Bridge')
        setIsLoading(false)
      }
    }

    initializeAppBridge()

    return () => {
      // Cleanup
      if (window.getShopifySessionToken) {
        delete window.getShopifySessionToken
      }
    }
  }, [isEmbedded, shop, host])

  const contextValue: AppBridgeContextType = {
    isEmbedded,
    shop,
    host,
    isLoading,
    error,
    app: appBridge
  }

  return (
    <AppBridgeContext.Provider value={contextValue}>
      {children}
    </AppBridgeContext.Provider>
  )
}

// Extend window type for TypeScript
// Window.shopify type is defined in src/types/shopify-global.d.ts
declare global {
  interface Window {
    getShopifySessionToken?: () => Promise<string>
  }
}