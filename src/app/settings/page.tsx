'use client'

import { useState, useEffect, Suspense } from 'react'

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Page,
  Layout,
  Card,
  Button,
  Text,
  Box,
  InlineStack,
  BlockStack,
  Select,
  ProgressBar,
  Badge,
  Spinner,
  Banner,
  FormLayout,
  RadioButton,
  TextField,
  Modal,
  DataTable,
  Icon,
  Toast,
  Frame,
} from '@shopify/polaris'
import {
  PlusIcon,
  EditIcon,
  DeleteIcon,
  ImportIcon,
} from '@shopify/polaris-icons'
import { useNavigation } from '../hooks/useNavigation'
import ShopSizes from '@/components/ShopSizes'
import FacebookSettingsCard from '@/components/facebook/FacebookSettingsCard'

// Thunder Text shop info (not Zeus store info)
interface ShopInfo {
  id: string
  shop_domain: string
  created_at: string
  updated_at: string
}

function SettingsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const shop = searchParams?.get('shop')
  const authenticated = searchParams?.get('authenticated')

  const [shopInfo, setShopInfo] = useState<ShopInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Toast notification state
  const [toast, setToast] = useState<{ content: string; error?: boolean } | null>(null)

  useEffect(() => {
    if (shop && authenticated) {
      fetchSettings()
    }
  }, [shop, authenticated])

  const fetchSettings = async () => {
    try {
      // Thunder Text doesn't track usage limits like Zeus
      // This just shows basic shop info
      setShopInfo({
        id: '1',
        shop_domain: shop || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

      setError(null)
    } catch (err) {
      console.error('Error fetching settings:', err)
      setError('Failed to load settings. Please try again.')
    } finally {
      setLoading(false)
    }
  }


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Temporarily disable auth check for development
  if (false) { // if (!shop || !authenticated) {
    return (
      <Page title="Thunder Text Settings">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg">Authentication Required</Text>
                <Text as="p">
                  Please access this page through your Shopify admin panel.
                </Text>
                <Button primary onClick={() => router.push('/dashboard')}>
                  Back to Dashboard
                </Button>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    )
  }

  if (loading) {
    return (
      <Page title="Settings" subtitle="Loading your preferences...">
        <Layout>
          <Layout.Section>
            <Card>
              <Box padding="800">
                <InlineStack align="center" blockAlign="center">
                  <Spinner size="small" />
                </InlineStack>
              </Box>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    )
  }

  if (error) {
    return (
      <Page title="Settings">
        <Layout>
          <Layout.Section>
            <Banner tone="critical" title="Error loading settings">
              <BlockStack gap="400">
                <Text as="p">{error}</Text>
                <Button
                  variant="primary"
                  onClick={() => {
                    setLoading(true)
                    setError(null)
                    fetchSettings()
                  }}
                >
                  Try Again
                </Button>
              </BlockStack>
            </Banner>
          </Layout.Section>
        </Layout>
      </Page>
    )
  }

  return (
    <Page
      title="Settings"
      subtitle="Manage your Thunder Text preferences"
      backAction={{
        content: 'Dashboard',
        onAction: () => router.push(`/dashboard?${searchParams?.toString() || ''}`)
      }}
    >
      <Layout>

        <Layout.Section variant="oneHalf">
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Account Information</Text>
              {shopInfo && (
                <BlockStack gap="300">
                  <BlockStack gap="100">
                    <Text as="p" variant="bodySm" tone="subdued">Shop</Text>
                    <Text as="p" variant="bodyMd" fontWeight="medium">{shopInfo.shop_domain}</Text>
                  </BlockStack>
                  <BlockStack gap="100">
                    <Text as="p" variant="bodySm" tone="subdued">Installed Since</Text>
                    <Text as="p" variant="bodyMd">{formatDate(shopInfo.created_at)}</Text>
                  </BlockStack>
                </BlockStack>
              )}
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="400">
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">Prompts Management</Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Customize AI writing templates and system prompts for your product descriptions
                </Text>
              </BlockStack>

              <Link href={`/settings/prompts?shop=${shop}`}>
                <Button variant="primary" size="large">
                  ⚙️ Manage Prompts & Templates
                </Button>
              </Link>

              <Box background="bg-surface-secondary" padding="400" borderRadius="200">
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" fontWeight="semibold">Current Settings:</Text>
                  <BlockStack gap="100">
                    <Text as="p" variant="bodySm">
                      • Global Default Template: <Text as="span" tone="info" fontWeight="medium">Women's Clothing</Text>
                    </Text>
                    <Text as="p" variant="bodySm">
                      • System Prompt: <Text as="span" tone="success" fontWeight="medium">Active</Text>
                    </Text>
                    <Text as="p" variant="bodySm">
                      • Category Templates: <Text as="span" tone="success" fontWeight="medium">6 configured</Text>
                    </Text>
                  </BlockStack>
                </BlockStack>
              </Box>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneHalf">
          <Card>
            {shop && (
              <ShopSizes
                shop={shop}
                onToast={(message: string, error?: boolean) => {
                  setToast({ content: message, error })
                  setTimeout(() => setToast(null), 5000)
                }}
              />
            )}
          </Card>
        </Layout.Section>

        <Layout.Section>
          {shop && <FacebookSettingsCard shop={shop} />}
        </Layout.Section>
      </Layout>


      {toast && (
        <Frame>
          <Toast
            content={toast.content}
            error={toast.error}
            onDismiss={() => setToast(null)}
          />
        </Frame>
      )}
    </Page>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', width: '20px', height: '20px', border: '2px solid #3b82f6', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p>Loading Settings...</p>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  )
}