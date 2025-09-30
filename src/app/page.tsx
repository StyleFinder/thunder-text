'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export const dynamic = 'force-dynamic'
import {
  Page,
  Layout,
  Card,
  Button,
  Text,
  Box,
  InlineStack,
  BlockStack,
  Banner,
  List,
  Spinner,
} from '@shopify/polaris'
import { useNavigation } from './hooks/useNavigation'
import { useShopifyAuth } from './components/ShopifyAuthProvider'

interface GenerationResult {
  title: string
  description: string
  bulletPoints: string[]
  metaDescription: string
  keywords: string[]
  confidence: number
  processingTime: number
  tokenUsage: {
    prompt: number
    completion: number
    total: number
  }
}

export default function HomePage() {
  const [deploymentStatus, setDeploymentStatus] = useState('checking')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const { navigateTo } = useNavigation()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isAuthenticated: authProviderAuthenticated, shop: authShop, isLoading: authLoading } = useShopifyAuth()

  // Get parameters
  const shop = searchParams?.get('shop') || ''
  const host = searchParams?.get('host') || ''
  const authenticated = searchParams?.get('authenticated')

  // Detect if we're in embedded context
  const isEmbedded = (typeof window !== 'undefined' && window.top !== window.self) ||
                     !!host

  useEffect(() => {
    console.log('🏠 Home page context:', {
      shop,
      host,
      authenticated,
      isEmbedded,
      isInIframe: typeof window !== 'undefined' && window.top !== window.self,
      apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY ? 'Set' : 'Missing',
      authProviderStatus: {
        authenticated: authProviderAuthenticated,
        loading: authLoading,
        shop: authShop
      }
    })

    // For embedded context, we rely on ShopifyAuthProvider for authentication
    // No need to redirect - the provider handles Token Exchange
    if (isEmbedded && shop) {
      console.log('📱 Running in embedded context, authentication handled by ShopifyAuthProvider')
      console.log('🔑 API Key status:', process.env.NEXT_PUBLIC_SHOPIFY_API_KEY ? 'Present' : 'Missing')
      console.log('🔐 Auth Provider Status:', { authProviderAuthenticated, authLoading, authShop })
    }
  }, [isEmbedded, shop, host, authProviderAuthenticated, authLoading, authShop])

  // For embedded apps, show loading while ShopifyAuthProvider handles auth
  // Use authProvider status instead of URL params for embedded context
  if (isEmbedded && shop) {
    // If still loading auth, show spinner
    if (authLoading) {
      return (
        <Page title="Thunder Text">
          <Layout>
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingLg">Loading Thunder Text...</Text>
                  <InlineStack gap="300" align="center">
                    <Spinner size="small" />
                    <Text as="span" variant="bodyMd">Authenticating with Shopify...</Text>
                  </InlineStack>
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        </Page>
      )
    }

    // If auth failed, show error
    if (!authProviderAuthenticated && !authLoading) {
      return (
        <Page title="Thunder Text">
          <Layout>
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingLg">Authentication Required</Text>
                  <Text as="p" variant="bodyMd">
                    Please ensure the app is properly installed in your Shopify store.
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Shop: {shop}
                  </Text>
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        </Page>
      )
    }
  }

  return (
    <Page title="Welcome to Thunder Text" subtitle="AI-Powered Product Description Generator">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="center" gap="200">
                <Spinner size="small" />
                <Text as="h2" variant="headingMd">Deployment Complete - Services Ready</Text>
              </InlineStack>
              
              <Banner status="info">
                <Text as="p" variant="bodyMd">
                  🚀 <strong>Version:</strong> Vercel Build 9f5b58e (2025-09-21 07:30 AM) | 
                  🌐 <strong>Source:</strong> thunder-text-nine.vercel.app | 
                  ⚡ <strong>Status:</strong> Live Production
                </Text>
              </Banner>
              
              <Text as="p" variant="bodyMd">
                Thunder Text is now deployed and ready to generate AI-powered product descriptions for your Shopify store.
              </Text>
              
              <Banner status="success">
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">✅ System Status</Text>
                  <List type="bullet">
                    <List.Item>Database: Connected to Supabase</List.Item>
                    <List.Item>AI Engine: OpenAI GPT-4 Vision Ready</List.Item>
                    <List.Item>Shopify API: Authentication Configured</List.Item>
                    <List.Item>Deployment: Live on Vercel</List.Item>
                  </List>
                </BlockStack>
              </Banner>
              
              <Banner status="warning">
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">📋 Next Steps</Text>
                  <List type="number">
                    <List.Item>Update Shopify Partner App settings with this URL</List.Item>
                    <List.Item>Install app in your test store (zunosai-staging-test-store)</List.Item>
                    <List.Item>Test the end-to-end workflow</List.Item>
                    <List.Item>Begin generating product descriptions!</List.Item>
                  </List>
                </BlockStack>
              </Banner>

              <InlineStack gap="300">
                <Button
                  variant="primary"
                  onClick={() => window.open('https://partners.shopify.com', '_blank')}
                >
                  Configure Shopify App
                </Button>
                
                <Button
                  variant="primary" 
                  tone="success"
                  onClick={() => navigateTo('/dashboard')}
                >
                  Go to Dashboard
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  )
}
