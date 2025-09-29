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
import EnhancedContentComparison from '@/app/components/shared/EnhancedContentComparison'
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
  const { isAuthenticated, shop: authShop, authenticatedFetch } = useShopifyAuth()

  const productId = searchParams?.get('productId') || ''
  const source = searchParams?.get('source')
  // Get shop from URL params first, fallback to auth shop
  const shop = searchParams?.get('shop') || authShop || 'zunosai-staging-test-store.myshopify.com'

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
      // Only require productId and shop - authentication handled by the page wrapper
      if (!productId || productId.trim() === '' || !shop) {
        console.log('Missing required params:', { productId, shop })
        return
      }

      setLoading(true)
      setError(null)

      try {
        console.log('Loading product data for:', { productId, shop })
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
              .filter(v => v.selectedOptions && Array.isArray(v.selectedOptions) &&
                       v.selectedOptions.some(opt => opt && opt.name && opt.name.toLowerCase() === 'size'))
              .map(v => {
                const sizeOption = v.selectedOptions?.find(opt => opt && opt.name && opt.name.toLowerCase() === 'size')
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
  }, [productId, shop]) // Removed isAuthenticated dependency to ensure loading happens

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
      if (useExistingImages && productData?.images && productData.images.length > 0) {
        productData.images.forEach(img => {
          // Images have 'url' property, validate before adding
          if (img.url && img.url.length > 0 && (img.url.startsWith('http') || img.url.startsWith('//'))) {
            formData.append('existingImages', img.url)
            console.log('✅ Adding existing image:', img.url)
          } else {
            console.warn('⚠️ Skipping invalid image URL:', img)
          }
        })
      } else {
        console.log('📸 No existing images to add or useExistingImages is false')
      }
      uploadedFiles.forEach(file => formData.append('images', file.file))

      // Extract sizing information from existing variants
      let detectedSizing = ''
      if (productData?.variants && productData.variants.length > 0) {
        const sizes = productData.variants
          .filter(v => v.selectedOptions && Array.isArray(v.selectedOptions) &&
                   v.selectedOptions.some(opt => opt && opt.name && opt.name.toLowerCase() === 'size'))
          .map(v => {
            const sizeOption = v.selectedOptions?.find(opt => opt && opt.name && opt.name.toLowerCase() === 'size')
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
      formData.append('parentCategory', productData?.productType || parentCategory || 'general')
      formData.append('availableSizing', detectedSizing || 'Not specified')
      formData.append('fabricMaterial', fabricMaterial)
      formData.append('occasionUse', occasionUse)
      formData.append('targetAudience', targetAudience)
      formData.append('keyFeatures', keyFeatures)
      formData.append('additionalNotes', additionalNotes)
      formData.append('enhancementOptions', JSON.stringify(enhancementOptions))

      const response = await authenticatedFetch('/api/enhance', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Enhancement API error:', errorData)
        throw new Error(errorData.error || `Failed to generate content: ${response.status}`)
      }

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

  const handleApplyChanges = async (editedContent: any) => {
    setApplying(true)
    setError(null)

    try {
      console.log('🔧 Applying changes:', {
        productId,
        shop,
        updates: editedContent
      })

      const response = await authenticatedFetch(`/api/products/${productId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop: shop || 'zunosai-staging-test-store.myshopify.com',
          updates: editedContent
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to apply changes')
      }

      // Get the response data to check mode
      const result = await response.json()
      console.log('✅ Update result:', result)

      // Set success message based on mode
      const message = result.mode === 'development'
        ? 'Changes applied successfully (Development Mode)'
        : 'Product successfully updated!'

      setSuccessMessage(message)
      setShowPreviewModal(false)
      setGeneratedContent(null)

      // Refresh product data to show updated content
      await loadProductData()

      // Clear error if any
      setError(null)

    } catch (err) {
      console.error('Error applying changes:', err)
      setError(err instanceof Error ? err.message : 'Failed to apply changes')
    } finally {
      setApplying(false)
    }
  }

  const isFormValid = () => {
    // Form is valid as long as we have product data
    // Images are optional - can use existing, upload new, or generate without images
    return !!productData
  }

  if (!productId) {
    return <ProductSelector
      shop={shop || 'zunosai-staging-test-store'}
      onProductSelect={(id) => {
        // Navigate to enhance page with selected product
        const params = new URLSearchParams(window.location.search)
        params.set('productId', id)
        window.location.href = `/enhance?${params}`
      }}
    />
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

          {successMessage && (
            <Layout.Section>
              <Banner tone="success" onDismiss={() => setSuccessMessage(null)}>
                <p>{successMessage}</p>
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
              existingImages={productData?.images?.map(img => img.url) || []}
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
                {generating ? 'Generating...' :
                 !productData ? 'Loading Product Data...' :
                 'Generate Enhanced Description'}
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

        <EnhancedContentComparison
          active={showPreviewModal}
          onClose={() => {
            setShowPreviewModal(false)
            setError(null)
          }}
          onApply={handleApplyChanges}
          originalContent={{
            title: productData?.title || '',
            description: productData?.descriptionHtml || '',
            seoTitle: productData?.seo?.title || '',
            seoDescription: productData?.seo?.description || ''
          }}
          enhancedContent={generatedContent || {}}
          loading={applying}
        />
      </Page>
    </Frame>
  )
}