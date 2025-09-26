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

  console.log('🚀 TokenExchangeHandler initialized:', { shop, isEmbedded })

  useEffect(() => {
    async function performTokenExchange() {
      console.log('🔄 performTokenExchange called:', { isEmbedded, shop })

      // Only perform token exchange if we're in an embedded context
      if (!isEmbedded || !shop) {
        console.log('⏩ Skipping token exchange - not embedded or no shop')
        onSuccess() // Continue without token exchange for direct access
        return
      }

      // Check if we already performed token exchange in this session
      const exchangeCompleted = window.sessionStorage.getItem('token_exchange_completed')
      if (exchangeCompleted === shop) {
        console.log('✅ Token exchange already completed for this shop')
        onSuccess()
        return
      }

      setIsExchanging(true)
      setError(null)

      try {
        console.log('🔄 Starting token exchange for embedded app...')

        // Import Shopify App Bridge from npm package
        const { createApp } = await import('@shopify/app-bridge')
        const { getSessionToken } = await import('@shopify/app-bridge/utilities')

        // Create App Bridge instance
        const app = createApp({
          apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY!,
          host: new URLSearchParams(window.location.search).get('host') || '',
          forceRedirect: false
        })

        // Get session token
        const sessionToken = await getSessionToken(app)

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

        // Mark token exchange as completed for this shop
        window.sessionStorage.setItem('token_exchange_completed', shop)

        // Refresh session token periodically (they expire after 1 minute)
        setInterval(async () => {
          try {
            const newToken = await getSessionToken(app)
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