'use client'

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic'

import { useState, useCallback, useEffect } from 'react'
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
  Banner,
  Spinner,
  Modal,
  Frame,
  ProgressBar,
  Checkbox,
  Badge
} from '@shopify/polaris'
import { ProductImageUpload, type UploadedFile } from '@/app/components/shared/ProductImageUpload'
import { ProductDetailsForm } from '@/app/components/shared/ProductDetailsForm'
import { AdditionalInfoForm } from '@/app/components/shared/AdditionalInfoForm'
import { type ProductCategory } from '@/lib/prompts'
import { fetchProductDataForEnhancement, type EnhancementProductData } from '@/lib/shopify/product-enhancement'
import { useShopifyAuth } from '../components/ShopifyAuthProvider'
import { ProductSelector } from './components/ProductSelector'

interface EnhancementOptions {
  generateTitle: boolean
  enhanceDescription: boolean
  generateSEO: boolean
  createPromo: boolean
  updateImages: boolean
}

export default function UnifiedEnhancePage() {
  const searchParams = useSearchParams()
  const { isAuthenticated, shop, authenticatedFetch } = useShopifyAuth()

  const productId = searchParams?.get('productId')
  const source = searchParams?.get('source')

  // Product data states
  const [productData, setProductData] = useState<EnhancementProductData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Image states
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [useExistingImages, setUseExistingImages] = useState(true)

  // Form states
  const [parentCategory, setParentCategory] = useState('')
  const [availableSizing, setAvailableSizing] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<ProductCategory>('general')
  const [templatePreview, setTemplatePreview] = useState<any>(null)

  const [fabricMaterial, setFabricMaterial] = useState('')
  const [occasionUse, setOccasionUse] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [keyFeatures, setKeyFeatures] = useState('')
  const [additionalNotes, setAdditionalNotes] = useState('')

  // Enhancement options
  const [enhancementOptions, setEnhancementOptions] = useState<EnhancementOptions>({
    generateTitle: false,
    enhanceDescription: true,
    generateSEO: true,
    createPromo: false,
    updateImages: false
  })

  // Generation states
  const [generating, setGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<any>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [applying, setApplying] = useState(false)
  const [progress, setProgress] = useState(0)

  // Load product data
  useEffect(() => {
    async function loadProduct() {
      if (!productId || !shop || !isAuthenticated) return

      setLoading(true)
      setError(null)

      try {
        const data = await fetchProductDataForEnhancement(productId, shop)
        if (data) {
          setProductData(data)

          // Pre-fill form fields
          if (data.productType) {
            setParentCategory(data.productType.toLowerCase())
          }
          if (data.vendor) setTargetAudience(data.vendor)

          // Pre-populate sizing from variants
          if (data.variants && data.variants.length > 0) {
            const sizes = data.variants
              .filter(v => v.selectedOptions?.some(opt => opt.name.toLowerCase() === 'size'))
              .map(v => {
                const sizeOption = v.selectedOptions?.find(opt => opt.name.toLowerCase() === 'size')
                return sizeOption?.value
              })
              .filter(Boolean)

            if (sizes.length > 0) {
              // Detect sizing pattern
              const uniqueSizes = [...new Set(sizes)]
              if (uniqueSizes.includes('XS') && uniqueSizes.includes('XL')) {
                setAvailableSizing('xs-xl')
              } else if (uniqueSizes.includes('XS') && uniqueSizes.includes('XXL')) {
                setAvailableSizing('xs-xxl')
              } else if (uniqueSizes.includes('S') && uniqueSizes.includes('XXXL')) {
                setAvailableSizing('s-xxxl')
              } else if (uniqueSizes.length === 1 && uniqueSizes[0] === 'One Size') {
                setAvailableSizing('onesize')
              }
            }
          }

          // Extract and pre-fill material info from tags/metafields
          if (data.tags) {
            const tagsArray = Array.isArray(data.tags) ? data.tags : data.tags.split(',').map(t => t.trim())
            const materials = tagsArray.filter(tag =>
              tag.toLowerCase().includes('cotton') ||
              tag.toLowerCase().includes('polyester') ||
              tag.toLowerCase().includes('wool') ||
              tag.toLowerCase().includes('silk')
            ).join(', ')
            if (materials) setFabricMaterial(materials)
          }

          // Pre-fill key features from existing description
          if (data.description) {
            const features = data.description
              .split('\n')
              .filter(line => line.trim().startsWith('•') || line.trim().startsWith('-'))
              .map(line => line.replace(/^[•\-]\s*/, ''))
              .join('\n')
            if (features) setKeyFeatures(features)
          }

          // Set appropriate template based on product type
          if (data.productType) {
            const type = data.productType.toLowerCase()
            if (type.includes('cloth') || type.includes('apparel') || type.includes('shirt') || type.includes('dress')) {
              setSelectedTemplate('clothing')
            } else if (type.includes('jewelry') || type.includes('accessory')) {
              setSelectedTemplate('jewelry')
            } else if (type.includes('home') || type.includes('decor')) {
              setSelectedTemplate('home')
            } else {
              setSelectedTemplate('general')
            }
          }
        }
      } catch (err) {
        console.error('Error loading product:', err)
        setError(err instanceof Error ? err.message : 'Failed to load product')
      } finally {
        setLoading(false)
      }
    }

    loadProduct()
  }, [productId, shop, isAuthenticated])

  // Category options
  const parentCategoryOptions = [
    { label: 'Select a parent category', value: '' },
    { label: 'Clothing', value: 'clothing' },
    { label: 'Accessories', value: 'accessories' },
    { label: 'Home & Living', value: 'home' },
    { label: 'Beauty', value: 'beauty' },
    { label: 'Electronics', value: 'electronics' }
  ]

  // Sizing options
  const sizingOptions = [
    { label: 'Select sizing range', value: '' },
    { label: 'XS - XL (XS, S, M, L, XL)', value: 'xs-xl' },
    { label: 'XS - XXL (XS, S, M, L, XL, XXL)', value: 'xs-xxl' },
    { label: 'S - XXXL (S, M, L, XL, XXL, XXXL)', value: 's-xxxl' },
    { label: 'One Size', value: 'onesize' },
    { label: 'Numeric (28-44)', value: 'numeric-28-44' },
    { label: 'Children (2T-14)', value: 'children' }
  ]

  const handleGenerate = async () => {
    setGenerating(true)
    setProgress(0)

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90))
    }, 500)

    try {
      const formData = new FormData()

      // Add images
      if (useExistingImages && productData?.images) {
        productData.images.forEach(img => formData.append('existingImages', img.src))
      }
      uploadedFiles.forEach(file => formData.append('images', file.file))

      // Extract sizing information from existing variants
      let detectedSizing = ''
      if (productData?.variants && productData.variants.length > 0) {
        const sizes = productData.variants
          .filter(v => v.selectedOptions?.some(opt => opt.name.toLowerCase() === 'size'))
          .map(v => {
            const sizeOption = v.selectedOptions?.find(opt => opt.name.toLowerCase() === 'size')
            return sizeOption?.value
          })
          .filter(Boolean)

        if (sizes.length > 0) {
          detectedSizing = [...new Set(sizes)].join(', ')
        }
      }

      // Add form data
      formData.append('productId', productId || '')
      formData.append('shop', shop || '')
      formData.append('template', selectedTemplate)
      formData.append('parentCategory', parentCategory)
      formData.append('availableSizing', detectedSizing || 'Not specified')
      formData.append('fabricMaterial', fabricMaterial)
      formData.append('occasionUse', occasionUse)
      formData.append('targetAudience', targetAudience)
      formData.append('keyFeatures', keyFeatures)
      formData.append('additionalNotes', additionalNotes)
      formData.append('enhancementOptions', JSON.stringify(enhancementOptions))

      const response = await fetch('/api/enhance', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) throw new Error('Failed to generate content')

      const result = await response.json()
      setGeneratedContent(result.data)
      setProgress(100)
      setShowPreviewModal(true)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      clearInterval(progressInterval)
      setGenerating(false)
    }
  }

  const handleApplyChanges = async () => {
    setApplying(true)

    try {
      const response = await authenticatedFetch(`/api/products/${productId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop,
          updates: generatedContent
        })
      })

      if (!response.ok) throw new Error('Failed to apply changes')

      setShowPreviewModal(false)
      // Show success banner

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply changes')
    } finally {
      setApplying(false)
    }
  }

  const isFormValid = () => {
    return (useExistingImages && productData?.images?.length) || uploadedFiles.length > 0
  }

  if (!productId) {
    return <ProductSelector />
  }

  if (loading) {
    return (
      <Page title="Enhance Product">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400" inlineAlign="center">
                <Spinner size="large" />
                <Text as="p" variant="bodyMd">Loading product data...</Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    )
  }

  return (
    <Frame>
      <Page
        title="Enhance Product Description"
        subtitle={productData ? productData.title : 'AI-powered enhancement'}
        backAction={{ content: 'Back to Dashboard', url: `/dashboard?shop=${shop}` }}
      >
        <Layout>
          {error && (
            <Layout.Section>
              <Banner tone="critical" onDismiss={() => setError(null)}>
                <p>{error}</p>
              </Banner>
            </Layout.Section>
          )}

          {productData && (
            <Layout.Section>
              <Card>
                <BlockStack gap="200">
                  <InlineStack gap="200" align="space-between">
                    <Text as="h3" variant="headingMd">{productData.title}</Text>
                    <Badge tone="info">{productData.status}</Badge>
                  </InlineStack>
                  <Text as="p" variant="bodySm" tone="subdued">
                    SKU: {productData.variants[0]?.sku || 'N/A'} |
                    Type: {productData.productType || 'N/A'} |
                    Vendor: {productData.vendor || 'N/A'}
                  </Text>
                </BlockStack>
              </Card>
            </Layout.Section>
          )}

          <Layout.Section>
            <ProductImageUpload
              title="Product Images"
              description="Add new images or use existing ones for AI analysis"
              existingImages={productData?.images?.map(img => img.src) || []}
              useExistingImages={useExistingImages}
              onFilesAdded={setUploadedFiles}
              onExistingImagesToggle={setUseExistingImages}
              maxFiles={5}
            />
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Enhancement Options</Text>
                <BlockStack gap="200">
                  <Checkbox
                    label="Generate new title"
                    checked={enhancementOptions.generateTitle}
                    onChange={(value) => setEnhancementOptions(prev => ({ ...prev, generateTitle: value }))}
                  />
                  <Checkbox
                    label="Enhance description"
                    checked={enhancementOptions.enhanceDescription}
                    onChange={(value) => setEnhancementOptions(prev => ({ ...prev, enhanceDescription: value }))}
                  />
                  <Checkbox
                    label="Generate SEO metadata"
                    checked={enhancementOptions.generateSEO}
                    onChange={(value) => setEnhancementOptions(prev => ({ ...prev, generateSEO: value }))}
                  />
                  <Checkbox
                    label="Create promotional copy"
                    checked={enhancementOptions.createPromo}
                    onChange={(value) => setEnhancementOptions(prev => ({ ...prev, createPromo: value }))}
                  />
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <ProductDetailsForm
              mode="enhance"
              parentCategory={parentCategory}
              setParentCategory={setParentCategory}
              parentCategoryOptions={parentCategoryOptions}
              availableSizing={availableSizing}
              setAvailableSizing={setAvailableSizing}
              sizingOptions={sizingOptions}
              selectedTemplate={selectedTemplate}
              setSelectedTemplate={setSelectedTemplate}
              templatePreview={templatePreview}
              setTemplatePreview={setTemplatePreview}
            />
          </Layout.Section>

          <Layout.Section>
            <AdditionalInfoForm
              mode="enhance"
              fabricMaterial={fabricMaterial}
              setFabricMaterial={setFabricMaterial}
              occasionUse={occasionUse}
              setOccasionUse={setOccasionUse}
              targetAudience={targetAudience}
              setTargetAudience={setTargetAudience}
              keyFeatures={keyFeatures}
              setKeyFeatures={setKeyFeatures}
              additionalNotes={additionalNotes}
              setAdditionalNotes={setAdditionalNotes}
              prefilled={!!productData}
            />
          </Layout.Section>

          <Layout.Section>
            <InlineStack gap="200" align="end">
              <Button onClick={() => window.location.href = `/dashboard?shop=${shop}`}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleGenerate}
                disabled={!isFormValid() || generating}
                loading={generating}
              >
                {generating ? 'Generating...' : 'Generate Enhanced Description'}
              </Button>
            </InlineStack>
          </Layout.Section>

          {generating && (
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text as="p" variant="bodyMd">Analyzing images and generating content...</Text>
                  <ProgressBar progress={progress} />
                </BlockStack>
              </Card>
            </Layout.Section>
          )}
        </Layout>

        <Modal
          open={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          title="Preview Enhanced Content"
          primaryAction={{
            content: 'Apply Changes',
            onAction: handleApplyChanges,
            loading: applying
          }}
          secondaryActions={[
            {
              content: 'Cancel',
              onAction: () => setShowPreviewModal(false)
            }
          ]}
        >
          <Modal.Section>
            {generatedContent && (
              <BlockStack gap="400">
                {generatedContent.title && (
                  <div>
                    <Text as="h3" variant="headingMd">New Title</Text>
                    <Text as="p" variant="bodyMd">{generatedContent.title}</Text>
                  </div>
                )}
                {generatedContent.description && (
                  <div>
                    <Text as="h3" variant="headingMd">Enhanced Description</Text>
                    <div dangerouslySetInnerHTML={{ __html: generatedContent.description }} />
                  </div>
                )}
                {generatedContent.seoTitle && (
                  <div>
                    <Text as="h3" variant="headingMd">SEO Title</Text>
                    <Text as="p" variant="bodyMd">{generatedContent.seoTitle}</Text>
                  </div>
                )}
              </BlockStack>
            )}
          </Modal.Section>
        </Modal>
      </Page>
    </Frame>
  )
}