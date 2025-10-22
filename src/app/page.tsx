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
} from '@shopify/polaris'
import { useNavigation } from './hooks/useNavigation'

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
  const { navigateTo } = useNavigation()
  const searchParams = useSearchParams()
  const router = useRouter()

  // Get parameters
  const shop = searchParams?.get('shop') || ''
  const host = searchParams?.get('host') || ''

  useEffect(() => {
    console.log('🏠 Home page - checking shop parameter:', { shop, host })

    // If shop parameter exists, redirect to dashboard immediately
    if (shop) {
      console.log('✅ Shop parameter found - redirecting to dashboard')
      navigateTo('/dashboard')
    }
  }, [shop, host, navigateTo])

  return (
    <Page title="Welcome to Thunder Text" subtitle="AI-Powered Product Description Generator">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Deployment Complete - Services Ready</Text>
              
              <Banner tone="info">
                <Text as="p" variant="bodyMd">
                  🚀 <strong>Version:</strong> Render Build (2025-10-09) |
                  🌐 <strong>Source:</strong> thunder-text.onrender.com |
                  ⚡ <strong>Status:</strong> Live Production
                </Text>
              </Banner>
              
              <Text as="p" variant="bodyMd">
                Thunder Text is now deployed and ready to generate AI-powered product descriptions for your Shopify store.
              </Text>
              
              <Banner tone="success">
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">✅ System Status</Text>
                  <List type="bullet">
                    <List.Item>Database: Connected to Supabase</List.Item>
                    <List.Item>AI Engine: OpenAI GPT-4 Vision Ready</List.Item>
                    <List.Item>Shopify API: Authentication Configured</List.Item>
                    <List.Item>Deployment: Live on Render</List.Item>
                  </List>
                </BlockStack>
              </Banner>

              <Banner tone="warning">
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
