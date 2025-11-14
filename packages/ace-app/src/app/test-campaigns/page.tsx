'use client'

/**
 * Test page for Facebook Campaign APIs
 *
 * Accessible at: /test-campaigns?shop=zunosai-staging-test-store.myshopify.com
 */

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Page, Layout, Card, Button, BlockStack, Text } from '@shopify/polaris'
import CampaignSelector from '@/components/facebook/CampaignSelector'

export default function TestCampaignsPage() {
  const searchParams = useSearchParams()
  const shop = searchParams?.get('shop') || 'zunosai-staging-test-store.myshopify.com'

  const [selectedAdAccountId, setSelectedAdAccountId] = useState('')
  const [selectedCampaignId, setSelectedCampaignId] = useState('')

  const handleCampaignSelect = (adAccountId: string, campaignId: string) => {
    setSelectedAdAccountId(adAccountId)
    setSelectedCampaignId(campaignId)
    console.log('Selected:', { adAccountId, campaignId })
  }

  return (
    <Page
      title="Test Facebook Campaign APIs"
      subtitle={`Testing with shop: ${shop}`}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Campaign Selector Component</Text>

              <CampaignSelector
                shop={shop}
                onSelect={handleCampaignSelect}
                selectedAdAccountId={selectedAdAccountId}
                selectedCampaignId={selectedCampaignId}
              />

              {selectedAdAccountId && selectedCampaignId && (
                <BlockStack gap="200">
                  <Text as="p" variant="headingSm">Selected Values:</Text>
                  <Text as="p" variant="bodySm">
                    Ad Account ID: <Text as="span" fontWeight="medium">{selectedAdAccountId}</Text>
                  </Text>
                  <Text as="p" variant="bodySm">
                    Campaign ID: <Text as="span" fontWeight="medium">{selectedCampaignId}</Text>
                  </Text>
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">API Test Buttons</Text>

              <Button
                onClick={async () => {
                  const res = await fetch(`/api/facebook/ad-accounts?shop=${shop}`)
                  const data = await res.json()
                  console.log('Ad Accounts:', data)
                  alert(JSON.stringify(data, null, 2))
                }}
              >
                Test Ad Accounts API
              </Button>

              {selectedAdAccountId && (
                <Button
                  onClick={async () => {
                    const res = await fetch(
                      `/api/facebook/campaigns?shop=${shop}&ad_account_id=${selectedAdAccountId}`
                    )
                    const data = await res.json()
                    console.log('Campaigns:', data)
                    alert(JSON.stringify(data, null, 2))
                  }}
                >
                  Test Campaigns API
                </Button>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  )
}
