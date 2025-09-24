'use client'

import { useState, useEffect } from 'react'
import { useAppBridge } from '@/app/components/AppBridgeProvider'
import { authenticatedFetch } from '@/lib/shopify/api-client'
import { Page, Card, Text, BlockStack, Button, Badge } from '@shopify/polaris'

export default function TestSessionPage() {
  const { shop, isEmbedded, isLoading } = useAppBridge()
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<{
    tokenFound: boolean | null
    apiCall: boolean | null
    realData: boolean | null
    error: string | null
  }>({
    tokenFound: null,
    apiCall: null,
    realData: null,
    error: null
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = window.sessionStorage.getItem('shopify_session_token')
      setSessionToken(token)
      setTestResults(prev => ({ ...prev, tokenFound: !!token }))
    }
  }, [])

  const testSessionToken = async () => {
    try {
      console.log('🧪 Testing session token...')
      setTestResults({
        tokenFound: !!sessionToken,
        apiCall: null,
        realData: null,
        error: null
      })

      // Test API call with session token
      const response = await authenticatedFetch(`/api/shopify/products?shop=${shop}&limit=1`)
      const data = await response.json()

      console.log('📦 API Response:', data)

      if (response.ok) {
        setTestResults(prev => ({ ...prev, apiCall: true }))

        // Check if we got real data (not mock)
        const hasRealData = data.data?.products?.[0] &&
                           !data.message?.includes('mock') &&
                           !data.message?.includes('demo')

        setTestResults(prev => ({
          ...prev,
          realData: hasRealData,
          error: hasRealData ? null : 'Still using mock data - session token may not be working'
        }))
      } else {
        setTestResults(prev => ({
          ...prev,
          apiCall: false,
          error: data.error || 'API call failed'
        }))
      }
    } catch (error) {
      console.error('❌ Test failed:', error)
      setTestResults(prev => ({
        ...prev,
        apiCall: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
    }
  }

  if (isLoading) {
    return (
      <Page title="Session Token Test">
        <Card>
          <BlockStack gap="400">
            <Text as="p">Loading App Bridge...</Text>
          </BlockStack>
        </Card>
      </Page>
    )
  }

  return (
    <Page title="Session Token Test">
      <BlockStack gap="600">
        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd" as="h2">App Bridge Status</Text>
            <BlockStack gap="200">
              <Text as="p">Shop: {shop || 'Not detected'}</Text>
              <Text as="p">Embedded: {isEmbedded ? 'Yes' : 'No'}</Text>
              <Text as="p">Session Token: {sessionToken ? `Found (${sessionToken.substring(0, 20)}...)` : 'Not found'}</Text>
            </BlockStack>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd" as="h2">Test Results</Text>
            <BlockStack gap="200">
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Text as="span">Token Found:</Text>
                {testResults.tokenFound === null ? (
                  <Badge tone="neutral">Not tested</Badge>
                ) : testResults.tokenFound ? (
                  <Badge tone="success">✅ Pass</Badge>
                ) : (
                  <Badge tone="critical">❌ Fail</Badge>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Text as="span">API Call:</Text>
                {testResults.apiCall === null ? (
                  <Badge tone="neutral">Not tested</Badge>
                ) : testResults.apiCall ? (
                  <Badge tone="success">✅ Pass</Badge>
                ) : (
                  <Badge tone="critical">❌ Fail</Badge>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Text as="span">Real Data:</Text>
                {testResults.realData === null ? (
                  <Badge tone="neutral">Not tested</Badge>
                ) : testResults.realData ? (
                  <Badge tone="success">✅ Pass</Badge>
                ) : (
                  <Badge tone="warning">⚠️ Mock Data</Badge>
                )}
              </div>

              {testResults.error && (
                <Text as="p" tone="critical">
                  Error: {testResults.error}
                </Text>
              )}
            </BlockStack>

            <Button onClick={testSessionToken} variant="primary">
              Run Test
            </Button>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd" as="h2">Instructions</Text>
            <BlockStack gap="200">
              <Text as="p">
                1. This page tests if session tokens from App Bridge are working correctly.
              </Text>
              <Text as="p">
                2. If you see "Token Found: ✅ Pass", the App Bridge is getting session tokens.
              </Text>
              <Text as="p">
                3. Click "Run Test" to verify the session token works with Shopify API.
              </Text>
              <Text as="p">
                4. If "Real Data: ⚠️ Mock Data" appears, the app may need proper OAuth authorization.
              </Text>
            </BlockStack>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  )
}