'use client'

import { useEffect, useState, createContext, useContext } from 'react'

interface AppBridgeContextType {
  isEmbedded: boolean
  shop: string | null
  host: string | null
  isLoading: boolean
  error: string | null
  app: any | null
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
  const [appBridge, setAppBridge] = useState<any>(null)

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
            console.log('ℹ️ Add NEXT_PUBLIC_SHOPIFY_API_KEY to environment variables for full Shopify integration.')
            setIsLoading(false)
            return
          }

          // Load App Bridge dynamically
          // First, check if shopifyApp is already available
          if (!window.shopifyApp) {
            // Dynamically load App Bridge script
            await new Promise((resolve, reject) => {
              const script = document.createElement('script')
              script.src = 'https://cdn.shopify.com/shopifycloud/app-bridge.js'
              script.onload = resolve
              script.onerror = reject
              document.head.appendChild(script)
            })
          }

          // Initialize App Bridge using the new API from the guide
          const app = window.shopifyApp({
            apiKey: apiKey
          })

          console.log('✅ App Bridge initialized successfully')
          setAppBridge(app)

          // Get initial session token using the new idToken() method
          try {
            const token = await app.idToken()
            console.log('✅ Initial session token obtained successfully')

            // Store the token for API calls
            if (typeof window !== 'undefined') {
              window.sessionStorage.setItem('shopify_session_token', token)
            }

            // Set up automatic token refresh
            // Instead of a timer, we'll fetch fresh tokens on each request
            // This is more reliable and follows the guide's recommendation
            window.getShopifySessionToken = async () => {
              try {
                const freshToken = await app.idToken()
                window.sessionStorage.setItem('shopify_session_token', freshToken)
                return freshToken
              } catch (error) {
                console.error('Failed to get session token:', error)
                throw error
              }
            }

          } catch (tokenError) {
            console.error('Failed to get initial session token:', tokenError)
            setError('Failed to authenticate with Shopify')
          }
        }

        setIsLoading(false)
      } catch (err) {
        console.error('App Bridge initialization failed:', err)
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
declare global {
  interface Window {
    shopifyApp: any
    getShopifySessionToken?: () => Promise<string>
  }
}