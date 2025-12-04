'use client'

/**
 * Test page for Create Facebook Ad flow
 *
 * Accessible at: /test-create-ad?shop=zunosai-staging-test-store.myshopify.com
 */

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Page, Layout, Card, Button, BlockStack, Text, TextField } from '@shopify/polaris'
import CreateAdModal from '@/components/facebook/CreateAdModal'

export default function TestCreateAdPage() {
  const searchParams = useSearchParams()
  const shop = searchParams?.get('shop') || 'zunosai-staging-test-store.myshopify.com'

  const [modalOpen, setModalOpen] = useState(false)

  // Sample product data
  const [title, setTitle] = useState('Women\'s Casual Summer Dress')
  const [copy, setCopy] = useState('Perfect for warm weather! Lightweight, breathable fabric with a flattering fit. Available in multiple colors.')
  const [images] = useState([
    'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png',
    'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-1_large.png',
    'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-2_large.png'
  ])

  return (
    <Page
      title="Test Create Facebook Ad"
      subtitle="Test the complete ad creation flow"
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Product Description</Text>

              <TextField
                label="Title"
                value={title}
                onChange={setTitle}
                autoComplete="off"
              />

              <TextField
                label="Description/Copy"
                value={copy}
                onChange={setCopy}
                multiline={3}
                autoComplete="off"
              />

              <BlockStack gap="200">
                <Text as="p" variant="bodyMd" fontWeight="semibold">Product Images:</Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  {images.length} images available
                </Text>
              </BlockStack>

              <Button
                variant="primary"
                onClick={() => setModalOpen(true)}
              >
                Create Facebook Ad
              </Button>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">Test Instructions</Text>
              <BlockStack gap="200">
                <Text as="p" variant="bodySm">
                  1. Edit the title and copy if desired
                </Text>
                <Text as="p" variant="bodySm">
                  2. Click "Create Facebook Ad"
                </Text>
                <Text as="p" variant="bodySm">
                  3. Select ad account and campaign
                </Text>
                <Text as="p" variant="bodySm">
                  4. Preview and edit the ad
                </Text>
                <Text as="p" variant="bodySm">
                  5. Submit to Facebook
                </Text>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      <CreateAdModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        shop={shop}
        shopifyProductId="test-product-123"
        initialTitle={title}
        initialCopy={copy}
        imageUrls={images}
      />
    </Page>
  )
}
