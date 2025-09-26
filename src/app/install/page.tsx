'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Page,
  Layout,
  Card,
  Button,
  Text,
  BlockStack,
  Banner,
  InlineStack,
  Link,
  Box,
  Badge
} from '@shopify/polaris'

export default function InstallPage() {
  const searchParams = useSearchParams()
  const [shop, setShop] = useState('')
  const [installing, setInstalling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if we already have a shop parameter
  useEffect(() => {
    const shopParam = searchParams?.get('shop')
    if (shopParam) {
      setShop(shopParam.replace('.myshopify.com', ''))
    }
  }, [searchParams])

  const handleInstall = () => {
    if (!shop) {
      setError('Please enter your shop domain')
      return
    }

    setInstalling(true)
    const shopDomain = shop.includes('.myshopify.com')
      ? shop
      : `${shop}.myshopify.com`

    // Construct OAuth authorization URL
    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY!,
      scope: 'read_products,write_products,read_content,write_content',
      redirect_uri: `${window.location.origin}/api/shopify/auth/callback`,
      state: shopDomain,
      'grant_options[]': 'per-user'
    })

    const authUrl = `https://${shopDomain}/admin/oauth/authorize?${params.toString()}`

    // Redirect to Shopify OAuth flow
    window.location.href = authUrl
  }

  return (
    <Page title="Install Thunder Text">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Welcome to Thunder Text!
              </Text>

              <Text as="p" variant="bodyMd">
                Thunder Text uses AI to generate compelling product descriptions from your product images.
                Install the app to get started.
              </Text>

              {error && (
                <Banner tone="critical">
                  {error}
                </Banner>
              )}

              <BlockStack gap="300">
                <Text as="p" variant="bodyMd">
                  Enter your Shopify store domain:
                </Text>

                <InlineStack gap="300" align="start">
                  <Box width="300px">
                    <input
                      type="text"
                      value={shop}
                      onChange={(e) => setShop(e.target.value)}
                      placeholder="your-store"
                      disabled={installing}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        fontSize: '14px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                    />
                  </Box>
                  <Text as="span" variant="bodyMd">
                    .myshopify.com
                  </Text>
                </InlineStack>
              </BlockStack>

              <InlineStack gap="300">
                <Button
                  primary
                  onClick={handleInstall}
                  loading={installing}
                  disabled={!shop || installing}
                >
                  Install App
                </Button>

                {installing && (
                  <Badge tone="info">
                    Redirecting to Shopify...
                  </Badge>
                )}
              </InlineStack>

              <Box paddingBlockStart="400" borderBlockStartWidth="025" borderColor="border-subdued">
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">
                    What permissions will Thunder Text request?
                  </Text>
                  <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                    <li>Read and write products</li>
                    <li>Read and write product content</li>
                    <li>Generate AI descriptions</li>
                    <li>Update product metafields</li>
                  </ul>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Thunder Text will never modify your products without your explicit approval.
                  </Text>
                </BlockStack>
              </Box>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm">
                Already installed?
              </Text>
              <Text as="p" variant="bodyMd">
                If you've already installed Thunder Text, you can access it from your Shopify admin:
              </Text>
              <ol style={{ paddingLeft: '20px', margin: '8px 0' }}>
                <li>Go to your Shopify admin</li>
                <li>Click on "Apps" in the left sidebar</li>
                <li>Select "Thunder Text" from your installed apps</li>
              </ol>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  )
}