'use client'

import { useEffect, useState, createContext, useContext } from 'react'

interface AppBridgeContextType {
  isEmbedded: boolean
  shop: string | null
  host: string | null
  isLoading: boolean
  error: string | null
}

const AppBridgeContext = createContext<AppBridgeContextType>({
  isEmbedded: false,
  shop: null,
  host: null,
  isLoading: true,
  error: null
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
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)

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
    let appBridge: any = null

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

          // Dynamic import to avoid SSR issues
          const { createApp } = await import('@shopify/app-bridge')
          const { getSessionToken } = await import('@shopify/app-bridge/utilities')

          appBridge = createApp({
            apiKey: apiKey,
            shop: shop,
            host: host || '',
            forceRedirect: true,
          })

          // Get initial session token for API calls
          try {
            const token = await getSessionToken(appBridge)
            console.log('Initial session token obtained successfully')

            // Store the token for API calls
            if (typeof window !== 'undefined') {
              window.sessionStorage.setItem('shopify_session_token', token)
            }

            // Set up token refresh every 50 seconds (tokens expire after 60)
            const interval = setInterval(async () => {
              try {
                const newToken = await getSessionToken(appBridge)
                console.log('Session token refreshed successfully')
                if (typeof window !== 'undefined') {
                  window.sessionStorage.setItem('shopify_session_token', newToken)
                }
              } catch (refreshError) {
                console.error('Failed to refresh session token:', refreshError)
              }
            }, 50000) // Refresh every 50 seconds

            setRefreshInterval(interval)
          } catch (tokenError) {
            console.error('Failed to get session token:', tokenError)
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
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
      if (appBridge) {
        try {
          appBridge.dispatch({ type: 'destroy' })
        } catch (err) {
          console.error('Error destroying App Bridge:', err)
        }
      }
    }
  }, [isEmbedded, shop, host, refreshInterval])

  const contextValue: AppBridgeContextType = {
    isEmbedded,
    shop,
    host,
    isLoading,
    error
  }

  return (
    <AppBridgeContext.Provider value={contextValue}>
      {children}
    </AppBridgeContext.Provider>
  )
}