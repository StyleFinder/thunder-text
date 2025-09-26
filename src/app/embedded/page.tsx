'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Spinner,
  InlineStack,
  Button,
  Banner
} from '@shopify/polaris'
import { TokenExchangeHandler } from '../enhance/components/TokenExchangeHandler'
import { useRouter } from 'next/navigation'

export default function EmbeddedApp() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get shop from URL params
  const shop = searchParams?.get('shop') || ''
  const host = searchParams?.get('host') || ''

  // Always treat this page as embedded since it's the embedded entry point
  const isEmbedded = true

  console.log('🚀 Embedded App loaded:', { shop, host, isEmbedded })

  useEffect(() => {
    // Log the current context
    console.log('📍 Embedded context check:', {
      isInIframe: window.top !== window.self,
      hasHost: !!host,
      shop,
      locationHref: window.location.href
    })
  }, [shop, host])

  // Handle authentication success
  const handleAuthSuccess = () => {
    console.log('✅ Authentication successful, redirecting to dashboard')
    setIsAuthenticated(true)

    // Redirect to the main app with authentication
    setTimeout(() => {
      const params = new URLSearchParams({
        shop,
        authenticated: 'true',
        host
      })
      router.push(`/?${params.toString()}`)
    }, 500)
  }

  if (!shop) {
    return (
      <Page title="Thunder Text">
        <Layout>
          <Layout.Section>
            <Banner tone="critical">
              <Text as="p">Missing shop parameter. Please access this app through your Shopify Admin.</Text>
            </Banner>
          </Layout.Section>
        </Layout>
      </Page>
    )
  }

  if (isAuthenticated) {
    return (
      <Page title="Thunder Text">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack gap="300" align="center">
                  <Spinner size="small" />
                  <Text as="span" variant="bodyMd">Redirecting to Thunder Text...</Text>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    )
  }

  return (
    <Page title="Thunder Text">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingLg">Connecting to Shopify...</Text>
              <TokenExchangeHandler
                shop={shop}
                isEmbedded={isEmbedded}
                onSuccess={handleAuthSuccess}
              />
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  )
}