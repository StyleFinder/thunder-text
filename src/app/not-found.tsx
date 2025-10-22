'use client'

import { Suspense } from 'react'
import {
  Page,
  Layout,
  Card,
  Button,
  Text,
  Box,
  InlineStack,
  BlockStack,
  Spinner,
} from '@shopify/polaris'

function NotFoundContent() {
  return (
    <Page title="Page Not Found">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Box paddingBlockStart="800" paddingBlockEnd="800">
                <InlineStack align="center">
                  <BlockStack gap="200" align="center">
                    <Text as="h1" variant="headingXl" alignment="center">
                      404
                    </Text>
                    <Text as="h2" variant="headingLg" alignment="center">
                      Page Not Found
                    </Text>
                    <Text as="p" variant="bodyMd" alignment="center" tone="subdued">
                      The page you're looking for doesn't exist or has been moved.
                    </Text>
                    <InlineStack gap="300">
                      <Button
                        variant="primary"
                        onClick={() => window.location.href = '/'}
                      >
                        Go to Home
                      </Button>
                      <Button
                        onClick={() => window.location.href = '/dashboard'}
                      >
                        Go to Dashboard
                      </Button>
                    </InlineStack>
                  </BlockStack>
                </InlineStack>
              </Box>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  )
}

function NotFoundFallback() {
  return (
    <Page title="Loading">
      <Layout>
        <Layout.Section>
          <Box padding="800" minHeight="400px">
            <InlineStack align="center" blockAlign="center" gap="200">
              <Spinner size="small" />
              <Text as="p" variant="bodyMd" tone="subdued">Loading...</Text>
            </InlineStack>
          </Box>
        </Layout.Section>
      </Layout>
    </Page>
  )
}

export default function NotFound() {
  return (
    <Suspense fallback={<NotFoundFallback />}>
      <NotFoundContent />
    </Suspense>
  )
}