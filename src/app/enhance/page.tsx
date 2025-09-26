'use client'

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic'

import { useState, useCallback, useEffect, Suspense } from 'react'
import { authenticatedFetch } from '@/lib/shopify/api-client'
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
  ProgressBar,
  Badge,
  ButtonGroup
} from '@shopify/polaris'
import { ArrowLeftIcon, CheckIcon, EditIcon } from '@shopify/polaris-icons'

import { ProductContextPanel } from './components/ProductContextPanel'
import { EnhanceForm, EnhancementFormData } from './components/EnhanceForm'
import { ComparisonView, ComparisonData } from './components/ComparisonView'
import { RichTextEditor } from './components/RichTextEditor'
import { ProductSelector } from './components/ProductSelector'
import { TokenExchangeHandler } from './components/TokenExchangeHandler'
import { fetchProductDataForEnhancement, EnhancementProductData } from '@/lib/shopify/product-enhancement'

type WorkflowStep = 'loading' | 'context' | 'configure' | 'generating' | 'compare' | 'apply' | 'complete'

interface EnhancementWorkflowState {
  currentStep: WorkflowStep
  progress: number
  productData: EnhancementProductData | null
  formData: EnhancementFormData | null
  generatedContent: any | null
  comparisonData: ComparisonData | null
  error: string | null
}

function EnhanceProductContent() {
  const searchParams = useSearchParams()

  // Get shop from various sources - Shopify admin embeds might not always pass it correctly
  const shopFromParams = searchParams?.get('shop')
  let shopFromHost: string | null = null

  // Decode host parameter if available (it's base64 encoded from Shopify)
  if (typeof window !== 'undefined' && searchParams?.get('host')) {
    try {
      const decoded = atob(searchParams.get('host')!)
      shopFromHost = decoded.split('/')[0]?.replace('.myshopify.com', '') || null
    } catch (e) {
      console.error('Failed to decode host parameter:', e)
    }
  }

  // Use the first available shop value or fallback to dev store
  const shop = shopFromParams || shopFromHost || 'zunosai-staging-test-store'

  const authenticated = searchParams?.get('authenticated')
  const productId = searchParams?.get('productId')
  const source = searchParams?.get('source')
  const embedded = searchParams?.get('embedded')
  const host = searchParams?.get('host')

  // Detect if we're in embedded context
  const isEmbedded = (typeof window !== 'undefined' && window.top !== window.self) ||
                     embedded === '1' ||
                     !!host

  console.log('🔍 Debug params:', {
    shop,
    authenticated,
    productId,
    source,
    embedded,
    host,
    isEmbedded,
    shopFromParams,
    shopFromHost,
    isInIframe: typeof window !== 'undefined' && window.top !== window.self,
    hasHost: !!host,
    windowLocation: typeof window !== 'undefined' ? window.location.href : 'SSR'
  })

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Workflow state management
  const [workflow, setWorkflow] = useState<EnhancementWorkflowState>({
    currentStep: 'loading',
    progress: 0,
    productData: null,
    formData: null,
    generatedContent: null,
    comparisonData: null,
    error: null
  })

  // Step navigation
  const stepOrder: WorkflowStep[] = ['loading', 'context', 'configure', 'generating', 'compare', 'apply', 'complete']
  const currentStepIndex = stepOrder.indexOf(workflow.currentStep)

  // Track if we're already loading to prevent duplicate calls
  const [isLoading, setIsLoading] = useState(false)
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false)

  // Reset loading state when productId changes
  useEffect(() => {
    console.log('🔄 ProductId changed, resetting load state:', productId)
    setHasAttemptedLoad(false)
    setIsLoading(false)
  }, [productId])

  // Load product data after authentication
  useEffect(() => {
    async function loadProductData() {
      // Wait for authentication in embedded context
      if (isEmbedded && !isAuthenticated) {
        console.log('⏳ Waiting for authentication...')
        return
      }

      // Prevent duplicate calls
      if (isLoading || hasAttemptedLoad) {
        console.log('⏳ Already loading or attempted load, skipping duplicate call')
        return
      }

      // If no productId, we'll show product selection instead of loading
      // This check comes BEFORE shop validation to ensure we show selector UI
      if (!productId) {
        console.log('🎯 No productId provided, will show ProductSelector')
        setWorkflow(prev => ({
          ...prev,
          currentStep: 'loading', // Will be handled by product selector rendering
          progress: 0,
          error: null // Clear any previous errors
        }))
        setHasAttemptedLoad(true) // Mark as attempted to avoid re-running
        return
      }

      // Only check for shop AFTER we know we need to load a specific product
      if (!shop) {
        setWorkflow(prev => ({
          ...prev,
          error: 'Missing required parameter: shop',
          currentStep: 'loading'
        }))
        return
      }

      setIsLoading(true)
      setHasAttemptedLoad(true)

      try {
        console.log('🔄 Loading product data for enhancement:', { productId, shop })

        const data = await fetchProductDataForEnhancement(productId, shop)

        if (data && data.id) {
          setWorkflow(prev => ({
            ...prev,
            productData: data,
            currentStep: 'context',
            progress: 20,
            error: null
          }))
          console.log('✅ Product data loaded successfully for enhancement:', {
            id: data.id,
            title: data.title
          })
        } else {
          console.error('❌ Invalid product data structure:', data)
          throw new Error('No valid product data returned')
        }

      } catch (err) {
        console.error('❌ Error loading product data:', err)
        setWorkflow(prev => ({
          ...prev,
          error: `Failed to load product data: ${err instanceof Error ? err.message : 'Unknown error'}`,
          currentStep: 'loading'
        }))
      } finally {
        setIsLoading(false)
      }
    }

    loadProductData()
  }, [productId, shop, isEmbedded, isAuthenticated])

  // Handle form data changes
  const handleFormChange = useCallback((formData: EnhancementFormData) => {
    setWorkflow(prev => ({
      ...prev,
      formData
    }))
  }, [])

  // Generate enhanced description
  const handleGenerate = useCallback(async (formData: EnhancementFormData) => {
    if (!workflow.productData) return

    setWorkflow(prev => ({
      ...prev,
      currentStep: 'generating',
      progress: 60,
      formData
    }))

    try {
      console.log('🤖 Generating enhanced description...')
      
      const response = await fetch('/api/generate/enhance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          existingProduct: workflow.productData,
          enhancementInputs: {
            category: formData.productCategory,
            template: formData.template,
            targetAudience: formData.targetAudience,
            fabricMaterial: formData.fabricMaterial,
            keyFeatures: formData.keyFeatures,
            availableSizing: formData.availableSizing,
            additionalNotes: formData.additionalNotes
          },
          template: formData.template,
          preserveElements: Object.keys(formData.preserveElements).filter(
            key => formData.preserveElements[key as keyof typeof formData.preserveElements]
          ),
          enhancementGoals: formData.enhancementGoals
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate enhanced description')
      }

      const { generatedContent } = result.data

      // Create comparison data
      const comparisonData: ComparisonData = {
        original: {
          title: workflow.productData.title,
          description: workflow.productData.originalDescription || workflow.productData.description || '',
          seoScore: workflow.productData.seoAnalysis?.titleLength ? 
            Math.min(100, (workflow.productData.seoAnalysis.titleLength / 60) * 50) : 45
        },
        enhanced: {
          title: generatedContent.title || workflow.productData.title,
          description: generatedContent.description || '',
          seoScore: Math.min(100, (generatedContent.description?.length || 0) / 10 + 40),
          improvements: [
            'Enhanced SEO optimization with targeted keywords',
            'Improved readability and structure',
            'Added detailed feature descriptions',
            'Included sizing and material information'
          ]
        }
      }

      setWorkflow(prev => ({
        ...prev,
        generatedContent,
        comparisonData,
        currentStep: 'compare',
        progress: 80
      }))

      console.log('✅ Enhanced description generated successfully')

    } catch (err) {
      console.error('❌ Error generating enhanced description:', err)
      setWorkflow(prev => ({
        ...prev,
        error: `Failed to generate enhancement: ${err instanceof Error ? err.message : 'Unknown error'}`,
        currentStep: 'configure'
      }))
    }
  }, [workflow.productData])

  // Apply enhanced description
  const handleApproveChanges = useCallback(async () => {
    if (!workflow.productData || !workflow.generatedContent) return

    setWorkflow(prev => ({
      ...prev,
      currentStep: 'apply',
      progress: 90
    }))

    try {
      console.log('📝 Applying enhanced description to Shopify...')
      
      const response = await authenticatedFetch(`/api/shopify/products/${workflow.productData.id}/enhance?shop=${shop}`, {
        method: 'PUT',
        body: JSON.stringify({
          enhancedDescription: workflow.generatedContent.description,
          enhancedTitle: workflow.generatedContent.title
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to apply enhanced description')
      }

      setWorkflow(prev => ({
        ...prev,
        currentStep: 'complete',
        progress: 100
      }))

      console.log('✅ Enhanced description applied successfully')

    } catch (err) {
      console.error('❌ Error applying enhanced description:', err)
      setWorkflow(prev => ({
        ...prev,
        error: `Failed to apply changes: ${err instanceof Error ? err.message : 'Unknown error'}`,
        currentStep: 'compare'
      }))
    }
  }, [workflow.productData, workflow.generatedContent, shop])

  // Reject changes and go back to configure
  const handleRejectChanges = useCallback(() => {
    setWorkflow(prev => ({
      ...prev,
      currentStep: 'configure',
      progress: 40,
      generatedContent: null,
      comparisonData: null
    }))
  }, [])

  // Navigation handlers
  const goBack = useCallback(() => {
    const prevStepIndex = Math.max(0, currentStepIndex - 1)
    const prevStep = stepOrder[prevStepIndex]
    
    setWorkflow(prev => ({
      ...prev,
      currentStep: prevStep,
      progress: Math.max(0, prev.progress - 20),
      error: null
    }))
  }, [currentStepIndex, stepOrder])

  const proceedToNext = useCallback(() => {
    const nextStepIndex = Math.min(stepOrder.length - 1, currentStepIndex + 1)
    const nextStep = stepOrder[nextStepIndex]
    
    setWorkflow(prev => ({
      ...prev,
      currentStep: nextStep,
      progress: Math.min(100, prev.progress + 20)
    }))
  }, [currentStepIndex, stepOrder])

  // Auth check
  const authBypass = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_SHOPIFY_AUTH_BYPASS === 'true'

  // If we're in embedded context, skip this check as we'll handle auth via Token Exchange
  if (!isEmbedded && !shop || (!isEmbedded && !authenticated && !authBypass)) {
    return (
      <Page title="Enhance Product Description">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg">Authentication Required</Text>
                <Text as="p">Please access this page through your Shopify admin panel.</Text>
                <Button primary onClick={() => window.location.href = '/'}>
                  Back to Home
                </Button>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    )
  }

  // Error state - only show if we've attempted to load and failed WITH a productId
  // Don't show error if no productId is provided (that means we should show product selector)
  if (workflow.error && workflow.currentStep === 'loading' && hasAttemptedLoad && !isLoading && productId && productId !== '') {
    return (
      <Page title="Enhance Product Description">
        <Layout>
          <Layout.Section>
            <Banner status="critical">
              <Text as="p">{workflow.error}</Text>
            </Banner>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg">Unable to Load Product</Text>
                <Text as="p">
                  There was an error loading the product data. Please try again or contact support.
                </Text>
                <InlineStack gap="300">
                  <Button onClick={() => {
                    setHasAttemptedLoad(false)
                    setWorkflow(prev => ({ ...prev, error: null }))
                    window.location.reload()
                  }}>Try Again</Button>
                  <Button onClick={() => window.history.back()}>Go Back</Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    )
  }

  // Handle token exchange for embedded apps
  if (isEmbedded && !isAuthenticated) {
    return (
      <Page title="Enhance Product Description">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg">Connecting to Shopify...</Text>
                <TokenExchangeHandler
                  shop={shop || 'zunosai-staging-test-store'}
                  isEmbedded={isEmbedded}
                  onSuccess={() => setIsAuthenticated(true)}
                />
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    )
  }

  // Loading state or Product Selection
  if (workflow.currentStep === 'loading') {
    // If no productId provided, show product selector
    if (!productId) {
      return (
        <Page title="Enhance Product Description">
          <Layout>
            <Layout.Section>
              <ProductSelector
                shop={shop || ''}
                onProductSelect={(selectedProductId) => {
                  // This will be handled by router navigation in ProductSelector
                }}
              />
            </Layout.Section>
          </Layout>
        </Page>
      )
    }

    // Otherwise show loading spinner for product data
    return (
      <Page title="Enhance Product Description">
        <Layout>
          <Layout.Section>
            <Card>
              <Box padding="600">
                <InlineStack align="center" gap="400">
                  <Spinner size="large" />
                  <BlockStack gap="200">
                    <Text variant="headingMd">Loading Product Data...</Text>
                    <Text variant="bodyMd" tone="subdued">
                      Fetching product information from Shopify
                    </Text>
                  </BlockStack>
                </InlineStack>
              </Box>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    )
  }

  // Step content mapping
  const getStepContent = () => {
    switch (workflow.currentStep) {
      case 'context':
        return (
          <Layout>
            <Layout.Section variant="oneThird">
              {workflow.productData && (
                <ProductContextPanel
                  productData={workflow.productData}
                  suggestions={[
                    {
                      type: 'seo',
                      title: 'Optimize for search engines',
                      description: 'Add relevant keywords and improve description structure',
                      priority: 'high'
                    },
                    {
                      type: 'content',
                      title: 'Enhance product details',
                      description: 'Include material, sizing, and care instructions',
                      priority: 'medium'
                    }
                  ]}
                />
              )}
            </Layout.Section>
            <Layout.Section variant="twoThirds">
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">Current Product Overview</Text>
                  <Text variant="bodyMd">
                    Review your product's current information and AI-generated improvement suggestions.
                    When you're ready, proceed to configure enhancement settings.
                  </Text>
                  <Button variant="primary" onClick={proceedToNext}>
                    Configure Enhancement
                  </Button>
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        )

      case 'configure':
        return (
          <Layout>
            <Layout.Section>
              {workflow.productData && (
                <EnhanceForm
                  productData={workflow.productData}
                  shop={shop}
                  onFormChange={handleFormChange}
                  onGenerate={handleGenerate}
                  isGenerating={false}
                />
              )}
            </Layout.Section>
          </Layout>
        )

      case 'generating':
        return (
          <Layout>
            <Layout.Section>
              <Card>
                <Box padding="600">
                  <BlockStack gap="400" align="center">
                    <Spinner size="large" />
                    <Text variant="headingMd">Generating Enhanced Description</Text>
                    <Text variant="bodyMd" tone="subdued" alignment="center">
                      Our AI is analyzing your product and creating an optimized description based on your preferences...
                    </Text>
                    <ProgressBar progress={workflow.progress} size="large" />
                  </BlockStack>
                </Box>
              </Card>
            </Layout.Section>
          </Layout>
        )

      case 'compare':
        return (
          <Layout>
            <Layout.Section>
              {workflow.comparisonData && (
                <ComparisonView
                  comparisonData={workflow.comparisonData}
                  onApproveChanges={handleApproveChanges}
                  onRejectChanges={handleRejectChanges}
                  viewMode="side-by-side"
                  showMetrics={true}
                />
              )}
            </Layout.Section>
          </Layout>
        )

      case 'apply':
        return (
          <Layout>
            <Layout.Section>
              <Card>
                <Box padding="600">
                  <BlockStack gap="400" align="center">
                    <Spinner size="large" />
                    <Text variant="headingMd">Applying Changes</Text>
                    <Text variant="bodyMd" tone="subdued" alignment="center">
                      Updating your product in Shopify with the enhanced description...
                    </Text>
                    <ProgressBar progress={workflow.progress} size="large" />
                  </BlockStack>
                </Box>
              </Card>
            </Layout.Section>
          </Layout>
        )

      case 'complete':
        return (
          <Layout>
            <Layout.Section>
              <Card>
                <Box padding="600">
                  <BlockStack gap="400" align="center">
                    <Box
                      padding="400"
                      background="bg-surface-success"
                      borderRadius="full"
                    >
                      <CheckIcon />
                    </Box>
                    <Text variant="headingLg">Enhancement Complete!</Text>
                    <Text variant="bodyMd" tone="subdued" alignment="center">
                      Your product description has been successfully enhanced and updated in Shopify.
                    </Text>
                    <InlineStack gap="300">
                      <Button 
                        onClick={() => window.history.back()}
                        variant="primary"
                      >
                        Back to Shopify Admin
                      </Button>
                      <Button onClick={() => window.location.reload()}>
                        Enhance Another Product
                      </Button>
                    </InlineStack>
                  </BlockStack>
                </Box>
              </Card>
            </Layout.Section>
          </Layout>
        )

      default:
        return null
    }
  }

  return (
    <Page
      title="Enhance Product Description"
      subtitle={workflow.productData?.title || 'Loading product...'}
      primaryAction={{
        content: 'Back to Admin',
        icon: ArrowLeftIcon,
        onAction: () => window.history.back()
      }}
    >
      {/* Progress Header */}
      <Layout.Section>
        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between">
              <Text variant="headingSm" as="h3">Enhancement Progress</Text>
              <Badge tone={workflow.currentStep === 'complete' ? 'success' : 'info'}>
                Step {currentStepIndex + 1} of {stepOrder.length}
              </Badge>
            </InlineStack>
            <ProgressBar progress={workflow.progress} size="medium" />
            
            {/* Step Navigation */}
            {workflow.currentStep !== 'loading' && workflow.currentStep !== 'generating' && workflow.currentStep !== 'apply' && (
              <InlineStack gap="200" align="end">
                {currentStepIndex > 1 && (
                  <Button onClick={goBack} disabled={workflow.currentStep === 'complete'}>
                    Previous Step
                  </Button>
                )}
              </InlineStack>
            )}
          </BlockStack>
        </Card>
      </Layout.Section>

      {/* Error Banner */}
      {workflow.error && workflow.currentStep !== 'loading' && (
        <Layout.Section>
          <Banner status="critical">
            <Text as="p">{workflow.error}</Text>
          </Banner>
        </Layout.Section>
      )}

      {/* Step Content */}
      {getStepContent()}
    </Page>
  )
}

export default function EnhanceProductPage() {
  return (
    <Suspense fallback={
      <Box padding="800">
        <InlineStack align="center" blockAlign="center">
          <Spinner size="small" />
          <Text as="p">Loading Enhancement Workspace...</Text>
        </InlineStack>
      </Box>
    }>
      <EnhanceProductContent />
    </Suspense>
  )
}