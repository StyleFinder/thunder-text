'use client'

/**
 * Facebook Ads Dashboard
 *
 * Main page for managing Facebook ad campaigns and creating ads
 * from product descriptions
 */

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  Text,
  Banner,
  InlineStack,
  Spinner,
  EmptyState,
  Badge,
} from '@shopify/polaris'
import { MarketingIcon } from '@shopify/polaris-icons'
import CampaignSelector from '@/components/facebook/CampaignSelector'
import CreateFacebookAdFlow from '@/components/facebook/CreateFacebookAdFlow'
import { useShopifyAuth } from '@/app/components/UnifiedShopifyAuth'

interface IntegrationInfo {
  connected: boolean
  accountName: string | null
  adAccountsCount: number
  adAccounts: Array<{ id: string; name: string }>
}

function FacebookAdsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isEmbedded } = useShopifyAuth()
  const shop = searchParams?.get('shop')
  const authenticated = searchParams?.get('authenticated')
  const facebookConnected = searchParams?.get('facebook_connected')
  const facebookError = searchParams?.get('facebook_error')
  const message = searchParams?.get('message')

  const [integrationInfo, setIntegrationInfo] = useState<IntegrationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedAdAccountId, setSelectedAdAccountId] = useState('')
  const [selectedCampaignId, setSelectedCampaignId] = useState('')
  const [selectedCampaignName, setSelectedCampaignName] = useState('')
  const [createAdModalOpen, setCreateAdModalOpen] = useState(false)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    if (shop) {
      checkFacebookConnection()
    }
  }, [shop])

  // Show success/error banner when redirected from OAuth
  useEffect(() => {
    if (facebookConnected || facebookError) {
      setShowBanner(true)
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => setShowBanner(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [facebookConnected, facebookError])

  const checkFacebookConnection = async () => {
    try {
      setLoading(true)

      // Check if Facebook is connected by trying to fetch ad accounts
      const response = await fetch(`/api/facebook/ad-accounts?shop=${shop}`)
      const data = await response.json()

      if (data.success) {
        setIntegrationInfo({
          connected: true,
          accountName: 'Connected',
          adAccountsCount: data.data.length,
          adAccounts: data.data.map((acc: any) => ({ id: acc.id, name: acc.name }))
        })
      } else if (data.code === 'NOT_CONNECTED') {
        setIntegrationInfo({
          connected: false,
          accountName: null,
          adAccountsCount: 0,
          adAccounts: []
        })
      }
    } catch (error) {
      console.error('Error checking Facebook connection:', error)
      setIntegrationInfo({
        connected: false,
        accountName: null,
        adAccountsCount: 0,
        adAccounts: []
      })
    } finally {
      setLoading(false)
    }
  }

  const handleConnectFacebook = () => {
    const authorizeUrl = `/api/facebook/oauth/authorize?shop=${shop}`

    // For embedded apps in Shopify Admin, use window.open with _top target
    // This is the recommended approach for App Bridge v3+ (replaces Redirect.Action.REMOTE)
    // See: https://shopify.dev/docs/api/app-bridge-library/reference
    if (isEmbedded) {
      console.log('🔀 Using window.open(_top) for OAuth flow (embedded context)')
      window.open(authorizeUrl, '_top')
    } else {
      // For non-embedded context (direct browser access)
      console.log('🔀 Using window.location for OAuth flow (non-embedded)')
      window.location.href = authorizeUrl
    }
  }

  const handleCampaignSelect = (adAccountId: string, campaignId: string, campaignName: string) => {
    setSelectedAdAccountId(adAccountId)
    setSelectedCampaignId(campaignId)
    setSelectedCampaignName(campaignName)
  }

  if (loading) {
    return (
      <Page title="Facebook Ads">
        <Layout>
          <Layout.Section>
            <Card>
              <InlineStack align="center" blockAlign="center" gap="200">
                <Spinner size="small" />
                <Text as="p" tone="subdued">Loading Facebook integration...</Text>
              </InlineStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    )
  }

  // Not connected state
  if (!integrationInfo?.connected) {
    return (
      <Page
        title="Facebook Ads"
        subtitle="Create and manage Facebook ads from your product descriptions"
      >
        <Layout>
          {/* Show OAuth callback banner */}
          {showBanner && message && (
            <Layout.Section>
              <Banner
                title={facebookConnected ? 'Success' : 'Error'}
                tone={facebookConnected ? 'success' : 'critical'}
                onDismiss={() => setShowBanner(false)}
              >
                <p>{message}</p>
              </Banner>
            </Layout.Section>
          )}

          <Layout.Section>
            <Card>
              <EmptyState
                heading="Connect your Facebook account"
                action={{
                  content: 'Connect Facebook',
                  onAction: handleConnectFacebook,
                }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>
                  Connect your Facebook Business account to create ads directly from your
                  product descriptions. Your campaigns and ad accounts will be available
                  for selection.
                </p>
              </EmptyState>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">What you can do with Facebook Ads:</Text>
                <BlockStack gap="200">
                  <Text as="p">✓ Create ads from product descriptions with one click</Text>
                  <Text as="p">✓ Select existing campaigns to add your ads to</Text>
                  <Text as="p">✓ Use AI-generated titles, copy, and product images</Text>
                  <Text as="p">✓ Manage campaign settings in Facebook Ads Manager</Text>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    )
  }

  // Connected state
  return (
    <Page
      title="Facebook Ads"
      subtitle="Create ads from your product descriptions"
      backAction={{
        content: 'Dashboard',
        onAction: () => router.push(`/dashboard?${searchParams?.toString() || ''}`)
      }}
    >
      <Layout>
        {/* Show OAuth callback banner */}
        {showBanner && message && (
          <Layout.Section>
            <Banner
              title={facebookConnected ? 'Success' : 'Error'}
              tone={facebookConnected ? 'success' : 'critical'}
              onDismiss={() => setShowBanner(false)}
            >
              <p>{message}</p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Banner
            tone="success"
            title="Facebook account connected"
          >
            <InlineStack gap="200">
              <Text as="p">
                {integrationInfo.adAccountsCount} ad account(s) available
              </Text>
            </InlineStack>
          </Banner>
        </Layout.Section>

        <Layout.Section variant="oneHalf">
          <Card>
            <CampaignSelector
              shop={shop || ''}
              onSelect={handleCampaignSelect}
              selectedAdAccountId={selectedAdAccountId}
              selectedCampaignId={selectedCampaignId}
            />
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneHalf">
          <Card>
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">Create Facebook Ad</Text>

              {selectedCampaignId ? (
                <BlockStack gap="300">
                  <Text as="p" tone="success">
                    ✓ Campaign selected: {selectedCampaignName}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Click the button below to create a new Facebook ad for this campaign.
                    You'll be able to select a product, generate ad content with AI, and choose images.
                  </Text>
                  <Button
                    variant="primary"
                    icon={MarketingIcon}
                    onClick={() => setCreateAdModalOpen(true)}
                  >
                    Create Facebook Ad
                  </Button>
                </BlockStack>
              ) : (
                <Text as="p" tone="subdued">
                  Select an ad account and campaign to continue
                </Text>
              )}
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">Account Settings</Text>
              <Button
                onClick={() => {
                  if (confirm('Are you sure you want to disconnect your Facebook account?')) {
                    fetch(`/api/facebook/oauth/disconnect`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ shop })
                    }).then(() => {
                      window.location.reload()
                    })
                  }
                }}
                tone="critical"
              >
                Disconnect Facebook
              </Button>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      {/* Create Facebook Ad Flow Modal */}
      <CreateFacebookAdFlow
        open={createAdModalOpen}
        onClose={() => setCreateAdModalOpen(false)}
        shop={shop || ''}
        campaignId={selectedCampaignId}
        campaignName={selectedCampaignName}
        adAccountId={selectedAdAccountId}
      />
    </Page>
  )
}

export default function FacebookAdsPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <Spinner size="small" />
        <p>Loading Facebook Ads...</p>
      </div>
    }>
      <FacebookAdsContent />
    </Suspense>
  )
}
