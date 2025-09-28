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
import { useRouter } from 'next/navigation'
import { useShopifyAuth } from '../components/ShopifyAuthProvider'

export default function EmbeddedApp() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isAuthenticated, isEmbedded, shop, isLoading, error } = useShopifyAuth()

  console.log('🚀 Embedded App loaded:', { shop, isEmbedded, isAuthenticated })

  useEffect(() => {
    // Log the current context
    console.log('📍 Embedded context check:', {
      isInIframe: window.top !== window.self,
      hasHost: !!searchParams?.get('host'),
      shop,
      locationHref: window.location.href,
      isAuthenticated
    })

    // Redirect to enhance page when authenticated
    if (isAuthenticated && shop) {
      console.log('✅ Authentication successful, redirecting to enhance page')
      const params = new URLSearchParams({
        shop,
        authenticated: 'true',
        host: searchParams?.get('host') || '',
        embedded: '1'
      })
      router.push(`/enhance?${params.toString()}`)
    }
  }, [isAuthenticated, shop, searchParams, router])

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

  if (isLoading) {
    return (
      <Page title="Thunder Text">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack gap="300" align="center">
                  <Spinner size="small" />
                  <Text as="span" variant="bodyMd">Connecting to Shopify...</Text>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    )
  }

  if (error) {
    return (
      <Page title="Thunder Text">
        <Layout>
          <Layout.Section>
            <Banner tone="critical">
              <Text as="p">{error}</Text>
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
              <Text as="h2" variant="headingLg">Authenticating...</Text>
              <InlineStack gap="300" align="center">
                <Spinner size="small" />
                <Text as="span" variant="bodyMd">Please wait while we connect to Shopify...</Text>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  )
}