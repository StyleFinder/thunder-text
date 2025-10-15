'use client'

/**
 * Self-Contained Facebook Ad Creation Flow
 *
 * Complete workflow for creating Facebook ads:
 * 1. Select product from Shopify
 * 2. AI generates ad title & copy
 * 3. Select images from product
 * 4. Preview & submit to Facebook
 */

import { useState, useEffect } from 'react'
import {
  Modal,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Select,
  TextField,
  Banner,
  Spinner,
  Thumbnail,
  Checkbox,
  Card
} from '@shopify/polaris'
import { ImageIcon } from '@shopify/polaris-icons'
import AdPreview from './AdPreview'
import { authenticatedFetch } from '@/lib/shopify/api-client'

interface ShopifyProduct {
  id: string
  title: string
  description: string
  images: Array<{ url: string; altText?: string }>
  handle: string
}

interface CreateFacebookAdFlowProps {
  open: boolean
  onClose: () => void
  shop: string
  campaignId: string
  campaignName: string
  adAccountId: string
}

type Step = 'select-product' | 'generate-content' | 'select-images' | 'preview'

export default function CreateFacebookAdFlow({
  open,
  onClose,
  shop,
  campaignId,
  campaignName,
  adAccountId
}: CreateFacebookAdFlowProps) {
  const [step, setStep] = useState<Step>('select-product')

  // Step 1: Product Selection
  const [products, setProducts] = useState<ShopifyProduct[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<ShopifyProduct | null>(null)

  // Step 2: AI Generated Content
  const [generatingContent, setGeneratingContent] = useState(false)
  const [adTitle, setAdTitle] = useState('')
  const [adCopy, setAdCopy] = useState('')

  // Step 3: Image Selection
  const [selectedImageUrls, setSelectedImageUrls] = useState<string[]>([])

  // Step 4: Submission
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load products when modal opens
  useEffect(() => {
    if (open) {
      fetchProducts()
    } else {
      // Reset state when modal closes
      resetFlow()
    }
  }, [open])

  const resetFlow = () => {
    setStep('select-product')
    setSelectedProductId('')
    setSelectedProduct(null)
    setAdTitle('')
    setAdCopy('')
    setSelectedImageUrls([])
    setError(null)
  }

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true)
      setError(null)

      const response = await authenticatedFetch(`/api/shopify/products?shop=${shop}`)
      const data = await response.json()

      if (data.success) {
        // API returns 'products' not 'data'
        const productList = data.products || []

        // Transform to match our interface
        const transformedProducts: ShopifyProduct[] = productList.map((p: any) => ({
          id: p.id,
          title: p.title,
          description: p.bodyHtml || p.description || '',
          images: (p.images || []).map((img: any) => ({
            url: img.url || img.src,
            altText: img.altText || img.alt
          })),
          handle: p.handle
        }))

        setProducts(transformedProducts)
      } else {
        setError(data.error || 'Failed to load products from Shopify')
      }
    } catch (err) {
      console.error('Error fetching products:', err)
      setError(err instanceof Error ? err.message : 'Failed to load products')
    } finally {
      setLoadingProducts(false)
    }
  }

  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId)
    const product = products.find(p => p.id === productId)
    setSelectedProduct(product || null)
  }

  const handleNextFromProductSelection = async () => {
    if (!selectedProduct) return

    setStep('generate-content')
    await generateAdContent()
  }

  const generateAdContent = async () => {
    if (!selectedProduct) return

    try {
      setGeneratingContent(true)
      setError(null)

      const response = await fetch('/api/facebook/generate-ad-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop,
          productTitle: selectedProduct.title,
          productDescription: selectedProduct.description,
          productHandle: selectedProduct.handle
        })
      })

      const data = await response.json()

      if (data.success) {
        setAdTitle(data.data.title)
        setAdCopy(data.data.copy)

        // Auto-select all product images
        setSelectedImageUrls(selectedProduct.images.map(img => img.url))

        setStep('select-images')
      } else {
        // Fallback: use product data directly
        setAdTitle(selectedProduct.title.substring(0, 125))
        setAdCopy(selectedProduct.description.substring(0, 125))
        setSelectedImageUrls(selectedProduct.images.map(img => img.url))
        setStep('select-images')
      }
    } catch (err) {
      console.error('Error generating ad content:', err)
      // Fallback: use product data directly
      setAdTitle(selectedProduct.title.substring(0, 125))
      setAdCopy(selectedProduct.description.substring(0, 125))
      setSelectedImageUrls(selectedProduct.images.map(img => img.url))
      setStep('select-images')
    } finally {
      setGeneratingContent(false)
    }
  }

  const toggleImageSelection = (imageUrl: string) => {
    setSelectedImageUrls(prev => {
      if (prev.includes(imageUrl)) {
        return prev.filter(url => url !== imageUrl)
      } else {
        return [...prev, imageUrl]
      }
    })
  }

  const handleSubmitAd = async () => {
    try {
      setSubmitting(true)
      setError(null)

      // Step 1: Create draft
      const draftResponse = await fetch('/api/facebook/ad-drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop,
          shopify_product_id: selectedProduct?.id,
          ad_title: adTitle,
          ad_copy: adCopy,
          image_urls: selectedImageUrls,
          selected_image_url: selectedImageUrls[0],
          facebook_campaign_id: campaignId,
          facebook_campaign_name: campaignName,
          facebook_ad_account_id: adAccountId
        })
      })

      const draftData = await draftResponse.json()

      if (!draftData.success) {
        throw new Error(draftData.error || 'Failed to create ad draft')
      }

      // Step 2: Submit to Facebook
      const submitResponse = await fetch('/api/facebook/ad-drafts/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop,
          draft_id: draftData.data.id
        })
      })

      const submitData = await submitResponse.json()

      if (!submitData.success) {
        throw new Error(submitData.error || 'Failed to submit ad to Facebook')
      }

      // Success!
      alert('Ad successfully created in Facebook Ads Manager (PAUSED status). You can review and activate it in Facebook.')
      onClose()
      resetFlow()
    } catch (err) {
      console.error('Error submitting ad:', err)
      setError(err instanceof Error ? err.message : 'Failed to create ad')
    } finally {
      setSubmitting(false)
    }
  }

  // Render product selection step
  const renderProductSelection = () => (
    <BlockStack gap="400">
      <Text as="h3" variant="headingMd">Select a Product</Text>

      {loadingProducts ? (
        <InlineStack align="center" blockAlign="center" gap="200">
          <Spinner size="small" />
          <Text as="p" tone="subdued">Loading products from Shopify...</Text>
        </InlineStack>
      ) : products.length === 0 ? (
        <Banner tone="warning">
          No products found in your Shopify store. Please create products first.
        </Banner>
      ) : (
        <>
          <Select
            label="Product"
            options={[
              { label: 'Select a product...', value: '' },
              ...products.map(product => ({
                label: product.title,
                value: product.id
              }))
            ]}
            value={selectedProductId}
            onChange={handleProductSelect}
          />

          {selectedProduct && (
            <Card>
              <BlockStack gap="300">
                <Text as="p" variant="bodyMd" fontWeight="semibold">
                  {selectedProduct.title}
                </Text>
                {selectedProduct.images.length > 0 && (
                  <Thumbnail
                    source={selectedProduct.images[0].url}
                    alt={selectedProduct.title}
                    size="large"
                  />
                )}
                <Text as="p" variant="bodySm" tone="subdued">
                  {selectedProduct.images.length} image(s) available
                </Text>
              </BlockStack>
            </Card>
          )}
        </>
      )}
    </BlockStack>
  )

  // Render content generation step
  const renderContentGeneration = () => (
    <BlockStack gap="400" inlineAlign="center">
      <Spinner size="large" />
      <Text as="p" variant="bodyMd" alignment="center">
        AI is generating ad content...
      </Text>
      <Text as="p" variant="bodySm" tone="subdued" alignment="center">
        Creating optimized ad title and copy for Facebook
      </Text>
    </BlockStack>
  )

  // Render image selection step
  const renderImageSelection = () => (
    <BlockStack gap="400">
      <Text as="h3" variant="headingMd">Select Images for Ad</Text>

      <Text as="p" variant="bodySm" tone="subdued">
        Choose which images to include in your Facebook ad (1-10 images)
      </Text>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
        {selectedProduct?.images.map((image, index) => (
          <Card key={index}>
            <BlockStack gap="200">
              <div style={{ position: 'relative' }}>
                <img
                  src={image.url}
                  alt={image.altText || `Product image ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '150px',
                    objectFit: 'cover',
                    borderRadius: '4px',
                    opacity: selectedImageUrls.includes(image.url) ? 1 : 0.5
                  }}
                />
              </div>
              <Checkbox
                label={`Image ${index + 1}`}
                checked={selectedImageUrls.includes(image.url)}
                onChange={() => toggleImageSelection(image.url)}
              />
            </BlockStack>
          </Card>
        ))}
      </div>

      <Banner tone={selectedImageUrls.length === 0 ? 'warning' : 'info'}>
        {selectedImageUrls.length === 0 ? (
          'Please select at least one image'
        ) : (
          `${selectedImageUrls.length} image(s) selected`
        )}
      </Banner>
    </BlockStack>
  )

  // Render preview step
  const renderPreview = () => (
    <AdPreview
      title={adTitle}
      copy={adCopy}
      imageUrls={selectedImageUrls}
      selectedImageIndex={0}
      onTitleChange={setAdTitle}
      onCopyChange={setAdCopy}
      onSubmit={handleSubmitAd}
      submitting={submitting}
    />
  )

  // Determine modal actions based on step
  const getModalActions = () => {
    switch (step) {
      case 'select-product':
        return {
          primaryAction: {
            content: 'Next: Generate Ad Content',
            onAction: handleNextFromProductSelection,
            disabled: !selectedProduct
          },
          secondaryActions: [
            {
              content: 'Cancel',
              onAction: onClose
            }
          ]
        }

      case 'generate-content':
        return {} // No actions while generating

      case 'select-images':
        return {
          primaryAction: {
            content: 'Next: Preview & Submit',
            onAction: () => setStep('preview'),
            disabled: selectedImageUrls.length === 0
          },
          secondaryActions: [
            {
              content: 'Back to Product',
              onAction: () => setStep('select-product')
            }
          ]
        }

      case 'preview':
        return {
          secondaryActions: [
            {
              content: 'Back to Images',
              onAction: () => setStep('select-images')
            }
          ]
        }

      default:
        return {}
    }
  }

  const modalActions = getModalActions()

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Facebook Ad"
      large
      primaryAction={modalActions.primaryAction}
      secondaryActions={modalActions.secondaryActions}
    >
      <Modal.Section>
        <BlockStack gap="400">
          {error && (
            <Banner tone="critical" title="Error">
              {error}
            </Banner>
          )}

          <Text as="p" variant="bodySm" tone="subdued">
            Campaign: {campaignName}
          </Text>

          {step === 'select-product' && renderProductSelection()}
          {step === 'generate-content' && renderContentGeneration()}
          {step === 'select-images' && renderImageSelection()}
          {step === 'preview' && renderPreview()}
        </BlockStack>
      </Modal.Section>
    </Modal>
  )
}
