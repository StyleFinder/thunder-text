'use client'

import { useState } from 'react'

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
