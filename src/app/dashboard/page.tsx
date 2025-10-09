'use client'

import { useState, useEffect, Suspense } from 'react'

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic'
import { useSearchParams } from 'next/navigation'
import {
  Page,
  Layout,
  Card,
  Button,
  Text,
  Box,
  InlineStack,
  BlockStack,
  ProgressBar,
  Badge,
  Spinner
} from '@shopify/polaris'
import { useNavigation } from '../hooks/useNavigation'

// Removed unused interfaces - they were not being used anywhere in the component

function DashboardContent() {
  const searchParams = useSearchParams()
  const { navigateTo } = useNavigation()
  const shop = searchParams?.get('shop')

  console.log('Dashboard render:', { shop })

  // Simple check - if no shop parameter, show auth required
  if (!shop) {
    return (
      <Page title="Thunder Text Dashboard">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg">Authentication Required</Text>
                <Text as="p">
                  Please install Thunder Text from your Shopify admin panel to access the dashboard.
                </Text>
                <Button variant="primary" onClick={() => navigateTo('/')}>
                  Back to Home
                </Button>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    )
  }

  return (
    <Page 
      title="Dashboard" 
      subtitle="Welcome to Product Description Generator"
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="p" variant="bodyMd">
                Generate compelling product descriptions using AI to boost your sales.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneHalf">
          <Card>
            <BlockStack gap="400">
              <Text as="p" variant="bodySm" tone="subdued">Free Trial Usage</Text>
              <Text as="p" variant="bodySm">0 of 25 descriptions used</Text>
              <ProgressBar progress={0} size="small" />
              <InlineStack align="end">
                <Text as="span" variant="bodySm" tone="subdued">25 remaining</Text>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneHalf">
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h3" variant="headingMd">ROI Calculator</Text>
                <Text as="span" variant="bodySm" tone="subdued">💰</Text>
              </InlineStack>
              <BlockStack gap="200">
                <Text as="p" variant="bodySm" tone="subdued">Total Savings</Text>
                <Text as="p" variant="headingLg" tone="success">$0</Text>
                <Text as="span" variant="bodySm" tone="subdued">(0 min saved)</Text>
                <Text as="p" variant="bodySm">0 products generated • 0 min saved</Text>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">Quick Actions</Text>
              <InlineStack gap="300">
                <Button
                  variant="primary"
                  tone="success"
                  onClick={() => navigateTo('/create')}
                >
                  Create New Product
                </Button>
                <Button
                  onClick={() => navigateTo('/enhance')}
                >
                  Enhance Product
                </Button>
                <Button
                  onClick={() => navigateTo('/generate')}
                >
                  Update Existing Product
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  )
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <Box padding="800">
        <InlineStack align="center" blockAlign="center">
          <Spinner size="small" />
          <Text as="p">Loading Dashboard...</Text>
        </InlineStack>
      </Box>
    }>
      <DashboardContent />
    </Suspense>
  )
}