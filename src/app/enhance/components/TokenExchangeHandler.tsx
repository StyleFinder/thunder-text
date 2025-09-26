'use client'

import { useEffect, useState } from 'react'
import { Banner, Spinner, InlineStack, Text } from '@shopify/polaris'

interface TokenExchangeHandlerProps {
  shop: string
  isEmbedded: boolean
  onSuccess: () => void
}

export function TokenExchangeHandler({ shop, isEmbedded, onSuccess }: TokenExchangeHandlerProps) {
  const [isExchanging, setIsExchanging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function performTokenExchange() {
      // Only perform token exchange if we're in an embedded context
      if (!isEmbedded || !shop) {
        onSuccess() // Continue without token exchange for direct access
        return
      }

      // Check if we already have a valid session
      const existingToken = window.sessionStorage.getItem('shopify_session_token')
      if (existingToken) {
        console.log('✅ Session token already exists')
        onSuccess()
        return
      }

      setIsExchanging(true)
      setError(null)

      try {
        console.log('🔄 Starting token exchange for embedded app...')

        // Load Shopify App Bridge
        await new Promise<void>((resolve, reject) => {
          if ((window as any).shopify?.createApp) {
            resolve()
            return
          }

          const script = document.createElement('script')
          script.src = 'https://cdn.shopify.com/shopifycloud/app-bridge.js'
          script.async = true

          script.onload = () => resolve()
          script.onerror = () => reject(new Error('Failed to load Shopify App Bridge'))

          document.head.appendChild(script)
        })

        // Get App Bridge instance
        const { createApp } = (window as any).shopify
        const app = createApp({
          apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY!,
          host: new URLSearchParams(window.location.search).get('host') || ''
        })

        // Get session token
        const sessionToken = await app.sessionToken()

        if (!sessionToken) {
          throw new Error('Failed to get session token from Shopify')
        }

        // Store session token for authenticatedFetch
        window.sessionStorage.setItem('shopify_session_token', sessionToken)

        console.log('📝 Got session token, performing exchange...')

        // Perform token exchange
        const response = await fetch('/api/shopify/token-exchange', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionToken,
            shop
          })
        })

        const result = await response.json()

        if (!result.success) {
          throw new Error(result.error || 'Token exchange failed')
        }

        console.log('✅ Token exchange successful')

        // Refresh session token periodically (they expire after 1 minute)
        setInterval(async () => {
          try {
            const newToken = await app.sessionToken()
            if (newToken) {
              window.sessionStorage.setItem('shopify_session_token', newToken)
            }
          } catch (err) {
            console.error('Failed to refresh session token:', err)
          }
        }, 30000) // Refresh every 30 seconds

        onSuccess()

      } catch (err) {
        console.error('❌ Token exchange error:', err)
        setError(err instanceof Error ? err.message : 'Authentication failed')
      } finally {
        setIsExchanging(false)
      }
    }

    performTokenExchange()
  }, [shop, isEmbedded, onSuccess])

  if (isExchanging) {
    return (
      <Banner>
        <InlineStack gap="300" align="center">
          <Spinner size="small" />
          <Text as="span" variant="bodyMd">Authenticating with Shopify...</Text>
        </InlineStack>
      </Banner>
    )
  }

  if (error) {
    return (
      <Banner tone="critical">
        <Text as="p" variant="bodyMd">
          Authentication failed: {error}
        </Text>
      </Banner>
    )
  }

  return null
}