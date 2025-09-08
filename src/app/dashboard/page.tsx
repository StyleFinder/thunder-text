'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import {
  Page,
  Layout,
  Card,
  ResourceList,
  ResourceItem,
  Text,
  Button,
  Badge,
  InlineStack,
  Spinner,
  Banner,
  Modal,
  TextContainer,
  Thumbnail,
} from '@shopify/polaris'

interface Product {
  node: {
    id: string
    title: string
    description: string
    handle: string
    images: {
      edges: Array<{
        node: {
          id: string
          url: string
          altText: string
        }
      }>
    }
  }
}

interface GeneratedContent {
  title: string
  description: string
  bulletPoints: string[]
  metaDescription: string
  keywords: string[]
}

export default function Dashboard() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const authenticated = searchParams?.get('authenticated')
  
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [publishingProduct, setPublishingProduct] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null)
  const [showPublishModal, setShowPublishModal] = useState(false)

  useEffect(() => {
    if (session && authenticated) {
      fetchProducts()
    }
  }, [session, authenticated])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/shopify/products')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch products')
      }

      setProducts(data.data.products.edges)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch products')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateDescription = async (product: Product) => {
    const images = product.node.images.edges.map(edge => edge.node.url)
    
    if (images.length === 0) {
      setError('Product has no images to analyze')
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images,
          productTitle: product.node.title,
          targetLength: 'medium',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate description')
      }

      setGeneratedContent(data.data)
      setSelectedProduct(product)
      setShowPublishModal(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate description')
    } finally {
      setLoading(false)
    }
  }

  const handlePublishContent = async () => {
    if (!selectedProduct || !generatedContent) return

    try {
      setPublishingProduct(selectedProduct.node.id)
      const response = await fetch('/api/shopify/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: selectedProduct.node.id,
          generatedContent,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to publish content')
      }

      setShowPublishModal(false)
      setSelectedProduct(null)
      setGeneratedContent(null)
      
      // Refresh products to show updated content
      await fetchProducts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish content')
    } finally {
      setPublishingProduct(null)
    }
  }

  if (!session || !authenticated) {
    return (
      <Page>
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <Text variant="headingLg" as="h2">
                  Setting up your Thunder Text account...
                </Text>
                <Spinner size="large" />
              </div>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    )
  }

  if (loading && products.length === 0) {
    return (
      <Page>
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <Spinner size="large" />
                <Text variant="bodyMd" as="p">Loading your products...</Text>
              </div>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    )
  }

  const renderProductItem = (item: Product) => {
    const { node: product } = item
    const media = product.images.edges[0]?.node ? (
      <Thumbnail
        source={product.images.edges[0].node.url}
        alt={product.images.edges[0].node.altText || product.title}
        size="medium"
      />
    ) : undefined

    return (
      <ResourceItem
        id={product.id}
        media={media}
        accessibilityLabel={`View details for ${product.title}`}
      >
        <InlineStack distribution="fillEvenly">
            <InlineStack vertical spacing="tight">
              <Text variant="headingSm" as="h3">
                {product.title}
              </Text>
              <Text variant="bodySm" as="p" color="subdued">
                {product.description ? 
                  product.description.substring(0, 100) + (product.description.length > 100 ? '...' : '') :
                  'No description'
                }
              </Text>
              <Badge status={product.description ? 'success' : 'attention'}>
                {product.description ? 'Has Description' : 'Needs Description'}
              </Badge>
            </InlineStack>
            <Button
              onClick={() => handleGenerateDescription(item)}
              loading={loading}
              disabled={product.images.edges.length === 0}
            >
              Generate Description
            </Button>
        </InlineStack>
      </ResourceItem>
    )
  }

  return (
    <Page
      title="Product Dashboard"
      subtitle="Manage AI-generated product descriptions"
    >
      <Layout>
        <Layout.Section>
          {error && (
            <Banner status="critical" onDismiss={() => setError(null)}>
              {error}
            </Banner>
          )}

          <Card>
            <ResourceList
              resourceName={{ singular: 'product', plural: 'products' }}
              items={products}
              renderItem={renderProductItem}
              loading={loading}
              emptyState={
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <Text variant="headingMd" as="h3">
                    No products found
                  </Text>
                  <Text variant="bodyMd" as="p">
                    Create some products in your Shopify store to get started.
                  </Text>
                </div>
              }
            />
          </Card>
        </Layout.Section>
      </Layout>

      {showPublishModal && generatedContent && selectedProduct && (
        <Modal
          open={showPublishModal}
          onClose={() => setShowPublishModal(false)}
          title="Publish Generated Content"
          primaryAction={{
            content: 'Publish to Shopify',
            onAction: handlePublishContent,
            loading: publishingProduct === selectedProduct.node.id,
          }}
          secondaryActions={[
            {
              content: 'Cancel',
              onAction: () => setShowPublishModal(false),
            },
          ]}
        >
          <Modal.Section>
            <InlineStack vertical spacing="loose">
              <TextContainer>
                <Text variant="headingMd" as="h3">
                  Preview Generated Content
                </Text>
                <Text variant="bodyMd" as="p">
                  Review the AI-generated content before publishing to your Shopify store.
                </Text>
              </TextContainer>

              <InlineStack vertical spacing="tight">
                <Text variant="headingSm" as="h4">Product Title</Text>
                <Text variant="bodyMd" as="p">{generatedContent.title}</Text>
              </InlineStack>

              <InlineStack vertical spacing="tight">
                <Text variant="headingSm" as="h4">Description</Text>
                <Text variant="bodyMd" as="p">{generatedContent.description}</Text>
              </InlineStack>

              <InlineStack vertical spacing="tight">
                <Text variant="headingSm" as="h4">Key Features</Text>
                <ul style={{ paddingLeft: '1rem' }}>
                  {generatedContent.bulletPoints.map((point, index) => (
                    <li key={index}>
                      <Text variant="bodyMd" as="span">{point}</Text>
                    </li>
                  ))}
                </ul>
              </InlineStack>

              <InlineStack vertical spacing="tight">
                <Text variant="headingSm" as="h4">SEO Keywords</Text>
                <InlineStack>
                  {generatedContent.keywords.map((keyword, index) => (
                    <Badge key={index}>{keyword}</Badge>
                  ))}
                </InlineStack>
              </InlineStack>
            </InlineStack>
          </Modal.Section>
        </Modal>
      )}
    </Page>
  )
}