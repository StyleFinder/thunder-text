'use client'

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic'

import { useState, useCallback, useEffect, Suspense, useRef } from 'react'
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
  Select,
  TextField,
  Banner,
  Spinner,
  DropZone,
  Thumbnail,
  Modal,
  Frame,
  ProgressBar
} from '@shopify/polaris'
import { CategoryTemplateSelector } from '@/app/components/CategoryTemplateSelector'
import { ProductTypeSelector } from '@/app/components/ProductTypeSelector'
import { type ProductCategory } from '@/lib/prompts'
import { fetchProductDataForPrePopulation, formatKeyFeatures, formatSizingData, type PrePopulatedProductData } from '@/lib/shopify/product-prepopulation'
import { authenticatedFetch } from '@/lib/shopify/api-client'

interface UploadedFile {
  file: File
  preview: string
}

interface ColorVariant {
  colorName: string
  standardizedColor: string
  confidence: number
  imageIndices: number[]
  primaryImageIndex: number
  originalDetections: string[]
  userOverride?: string
}

function CreateProductContent() {
  const searchParams = useSearchParams()
  const shop = searchParams?.get('shop')
  const authenticated = searchParams?.get('authenticated')
  
  // Admin extension redirect parameters
  const productId = searchParams?.get('productId')
  const productTitle = searchParams?.get('productTitle')
  const productTypeParam = searchParams?.get('productType')
  const vendor = searchParams?.get('vendor')
  const description = searchParams?.get('description')
  const tagsParam = searchParams?.get('tags')
  const imagesParam = searchParams?.get('images')
  const variantsParam = searchParams?.get('variants')
  const source = searchParams?.get('source')
  
  // Pre-populated product data state
  const [prePopulatedData, setPrePopulatedData] = useState<PrePopulatedProductData | null>(null)
  const [dataLoading, setDataLoading] = useState(false)
  const [dataLoadError, setDataLoadError] = useState<string | null>(null)
  
  // Form state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [primaryPhotos, setPrimaryPhotos] = useState<UploadedFile[]>([])
  const [secondaryPhotos, setSecondaryPhotos] = useState<UploadedFile[]>([])
  const [detectedVariants, setDetectedVariants] = useState<ColorVariant[]>([])
  const [colorDetectionLoading, setColorDetectionLoading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<ProductCategory>('general')
  const [productType, setProductType] = useState('')
  const [availableSizing, setAvailableSizing] = useState('')
  const [sizingOptions, setSizingOptions] = useState<{ label: string; value: string }[]>([])
  const [templatePreview, setTemplatePreview] = useState<any>(null)
  const [fabricMaterial, setFabricMaterial] = useState('')
  const [occasionUse, setOccasionUse] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [keyFeatures, setKeyFeatures] = useState('')
  const [additionalNotes, setAdditionalNotes] = useState('')
  
  // Loading states
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<any>(null)
  const [creatingProduct, setCreatingProduct] = useState(false)
  const [productCreated, setProductCreated] = useState<any>(null)
  const [progress, setProgress] = useState(0)
  
  // Progress timer ref
  const progressTimer = useRef<NodeJS.Timeout | null>(null)
  
  // Cleanup progress timer on unmount
  useEffect(() => {
    return () => {
      if (progressTimer.current) {
        clearInterval(progressTimer.current)
      }
    }
  }, [])

  // Custom categories
  const [customCategories, setCustomCategories] = useState<any[]>([])
  const [parentCategories, setParentCategories] = useState<any[]>([])
  const [subCategories, setSubCategories] = useState<any[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [categoriesError, setCategoriesError] = useState<string | null>(null)
  const [selectedParentCategory, setSelectedParentCategory] = useState('')
  const [selectedSubCategory, setSelectedSubCategory] = useState('')

  // Memoized callback for template changes to prevent re-renders
  const handleTemplateChange = useCallback((category: string, categoryType?: ProductCategory) => {
    setSelectedTemplate(categoryType || 'general')
  }, [])
  const [categoryDetected, setCategoryDetected] = useState(false)
  const [suggestedCategory, setSuggestedCategory] = useState<{category: string, confidence: number} | null>(null)


  // Default fallback categories if no custom ones exist
  const defaultCategories = [
    'Fashion & Apparel',
    'Electronics & Gadgets', 
    'Home & Garden',
    'Health & Beauty',
    'Sports & Outdoors',
    'Books & Media',
    'Toys & Games',
    'Food & Beverages',
    'Automotive',
    'Arts & Crafts',
    'Jewelry & Accessories',
    'Office & Business',
    'Pet Supplies',
    'Other'
  ]

  // Generate category options from custom categories or fallback to defaults
  const categoryOptions = [
    { label: 'Select a category', value: '' },
    ...((customCategories && customCategories.length > 0)
      ? customCategories.map(cat => ({ label: cat.name, value: cat.name }))
      : defaultCategories.map(cat => ({ label: cat, value: cat }))
    )
  ]

  // Fetch comprehensive product data when coming from admin extension
  useEffect(() => {
    async function fetchProductData() {
      if (source === 'admin_extension' && productId && shop) {
        setDataLoading(true)
        setDataLoadError(null)
        
        try {
          console.log('🚀 Thunder Text: Fetching comprehensive product data', {
            productId, shop, source
          })
          
          const data = await fetchProductDataForPrePopulation(productId, shop)
          
          if (data) {
            console.log('✅ Product data loaded successfully:', {
              title: data.title,
              imageCount: data.images.length,
              variantCount: data.variants.length
            })
            
            setPrePopulatedData(data)

            // Auto-populate form fields
            setSelectedTemplate(data.category.primary as ProductCategory || 'general')
            setCategoryDetected(true)

            // Set product type from Shopify data
            if (data.productType) {
              setProductType(data.productType)
            }

            if (data.vendor) {
              setTargetAudience(data.vendor)
            }
            
            if (data.materials.fabric) {
              setFabricMaterial(data.materials.fabric)
            }
            
            // Format and set key features
            const formattedFeatures = formatKeyFeatures(data)
            if (formattedFeatures) {
              setKeyFeatures(formattedFeatures)
            }
            
            // Format and set sizing data
            const formattedSizing = formatSizingData(data.metafields.sizing)
            if (formattedSizing) {
              setAvailableSizing(formattedSizing)
            }
            
            // Set additional notes from existing description if available
            if (data.existingDescription) {
              setAdditionalNotes(`Existing description: ${data.existingDescription.replace(/<[^>]*>/g, '').substring(0, 200)}...`)
            }
            
          } else {
            setDataLoadError('Could not load product data from Shopify')
          }
          
        } catch (error) {
          console.error('❌ Error fetching product data:', error)
          setDataLoadError(`Failed to load product data: ${error instanceof Error ? error.message : 'Unknown error'}`)
          
          // Fallback to basic admin extension data if comprehensive fetch fails
          console.log('🔄 Falling back to basic admin extension data')
          if (productTypeParam) {
            // Set both the Shopify product type and the template
            setProductType(productTypeParam)
            setSelectedTemplate(productTypeParam as ProductCategory)
            setCategoryDetected(true)
          }
          if (vendor) {
            setTargetAudience(vendor)
          }
        } finally {
          setDataLoading(false)
        }
      }
    }
    
    fetchProductData()
  }, [source, productId, shop])

  // Fetch initial data on component mount
  useEffect(() => {
    if (shop && authenticated) {
      fetchCustomCategories()
      fetchParentCategories()
      fetchShopSizes()
      fetchGlobalDefaultTemplate()
    }
  }, [shop, authenticated])

  // Load sub-categories when parent category is selected
  useEffect(() => {
    if (selectedParentCategory) {
      fetchSubCategories(selectedParentCategory)
    } else {
      setSubCategories([])
      setSelectedSubCategory('')
    }
  }, [selectedParentCategory])

  const fetchCustomCategories = async () => {
    try {
      const response = await fetch(`/api/categories?shop=${shop}`)

      // Check for HTTP errors (401, 404, 500, etc.)
      if (!response.ok) {
        const errorMsg = `Categories API error: ${response.status} ${response.statusText}`
        console.error(errorMsg)
        setCategoriesError(errorMsg)
        return
      }

      const data = await response.json()

      if (data.success && data.data.length > 0) {
        setCustomCategories(data.data)
        setCategoriesError(null) // Clear any previous errors
      } else {
        // No custom categories configured - this is OK, not an error
        console.log('No custom categories found, using defaults')
      }
    } catch (err) {
      const errorMsg = `Failed to load categories: ${err instanceof Error ? err.message : 'Unknown error'}`
      console.error(errorMsg, err)
      setCategoriesError(errorMsg)
    } finally {
      setCategoriesLoading(false)
    }
  }

  const fetchParentCategories = async () => {
    try {
      const response = await fetch(`/api/categories/children?shop=${shop}&parentId=null`)
      const data = await response.json()

      if (data.success) {
        setParentCategories(data.data)
      }
    } catch (err) {
      console.error('Error fetching parent categories:', err)
    }
  }

  const fetchShopSizes = async () => {
    try {
      const response = await fetch(`/api/shop-sizes?shop=${shop}`)
      const data = await response.json()

      if (data.success && data.data.length > 0) {
        // Convert shop sizes to dropdown options
        const options = [
          { label: 'Select sizing range', value: '' },
          ...data.data.map((size: any) => ({
            label: `${size.name}${size.is_default ? ' (Default)' : ''}: ${size.sizes.join(', ')}`,
            value: size.sizes.join(', ')
          }))
        ]
        setSizingOptions(options)

        // Set default sizing if available
        const defaultSize = data.data.find((size: any) => size.is_default)
        if (defaultSize && !availableSizing) {
          setAvailableSizing(defaultSize.sizes.join(', '))
        }
      } else {
        // Fallback to hardcoded defaults if no shop sizes exist
        setSizingOptions([
          { label: 'Select sizing range', value: '' },
          { label: 'One Size', value: 'One Size' },
          { label: 'XS - XL', value: 'XS - XL' },
          { label: 'XS - XXL', value: 'XS - XXL' },
          { label: 'XS - XXXL', value: 'XS - XXXL' },
          { label: 'Numeric (6-16)', value: 'Numeric (6-16)' },
          { label: 'Numeric (28-44)', value: 'Numeric (28-44)' },
          { label: 'Children (2T-14)', value: 'Children (2T-14)' }
        ])
      }
    } catch (err) {
      console.error('Error fetching shop sizes:', err)
      // Fallback to hardcoded defaults on error
      setSizingOptions([
        { label: 'Select sizing range', value: '' },
        { label: 'One Size', value: 'One Size' },
        { label: 'XS - XL', value: 'XS - XL' },
        { label: 'XS - XXL', value: 'XS - XXL' },
        { label: 'XS - XXXL', value: 'XS - XXXL' },
        { label: 'Numeric (6-16)', value: 'Numeric (6-16)' },
        { label: 'Numeric (28-44)', value: 'Numeric (28-44)' },
        { label: 'Children (2T-14)', value: 'Children (2T-14)' }
      ])
    }
  }

  const fetchSubCategories = async (parentId: string) => {
    try {
      const response = await fetch(`/api/categories/children?shop=${shop}&parentId=${parentId}`)
      const data = await response.json()
      
      if (data.success) {
        setSubCategories(data.data)
      }
    } catch (err) {
      console.error('Error fetching sub-categories:', err)
    }
  }


  const fetchGlobalDefaultTemplate = async () => {
    try {
      const storeId = shop // Using shop as store identifier
      const response = await fetch(`/api/prompts?store_id=${storeId}&get_default=true`)
      const data = await response.json()
      
      if (data.default_template) {
        console.log('🎯 Global default template loaded:', data.default_template)
        setSelectedTemplate(data.default_template)
      }
    } catch (err) {
      console.error('Error fetching global default template:', err)
      // Fall back to 'general' if there's an error
    }
  }

  const suggestCategoryFromContent = async (generatedContent: any) => {
    try {
      console.log('🎯 Requesting category suggestion for generated content')
      
      const response = await authenticatedFetch('/api/categories/suggest', {
        method: 'POST',
        body: JSON.stringify({
          title: generatedContent.title,
          description: generatedContent.description,
          keywords: generatedContent.keywords
        })
      })

      const data = await response.json()

      if (data.success && data.suggestion) {
        const { category, confidence, shouldAutoAssign } = data.suggestion
        
        console.log('🎯 Category suggestion received:', { category, confidence, shouldAutoAssign })
        
        // Store the suggestion for display
        setSuggestedCategory({ category, confidence })
        
        // Auto-assign if confidence is high enough
        if (shouldAutoAssign && confidence >= 0.6) {
          console.log('🎯 Auto-assigning category:', category, 'from current:', selectedTemplate)

          // If no category is selected, auto-assign
          if (!selectedTemplate || selectedTemplate === 'general') {
            setSelectedTemplate(category)
            setCategoryDetected(true)
            console.log('🎯 Category auto-assigned (no previous selection):', category)
          }
          // If category is different and confidence is very high, suggest replacement
          else if (selectedTemplate !== category && confidence >= 0.8) {
            console.log('🎯 Suggesting category replacement:', selectedTemplate, '→', category)
            // For now, just log - could add UI notification later
            // Future: show user a suggestion to replace category
          }
          // If same category, confirm it's correct
          else if (selectedTemplate === category) {
            console.log('🎯 Category confirmed correct:', category)
          }
        }
      }
    } catch (err) {
      console.error('Error getting category suggestion:', err)
      // Don't show error to user - this is a background enhancement
    }
  }


  // Sizing options are now dynamically loaded from shop_sizes API via fetchShopSizes()

  // Description template options
  const templateOptions = [
    { label: 'Default Template (system)', value: 'Default Template (system)' },
    { label: 'Fashion Template', value: 'Fashion Template' },
    { label: 'Electronics Template', value: 'Electronics Template' },
    { label: 'Home & Garden Template', value: 'Home & Garden Template' },
    { label: 'Beauty Template', value: 'Beauty Template' },
    { label: 'Sports Template', value: 'Sports Template' }
  ]

  // Function to detect category from uploaded image
  const detectCategoryFromImage = useCallback(async (file: File) => {
    try {
      // Convert file to base64
      const reader = new FileReader()
      const imageData = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // Call the category detection API
      const response = await authenticatedFetch('/api/detect-category', {
        method: 'POST',
        body: JSON.stringify({
          imageData: imageData
        })
      })

      const result = await response.json()
      
      if (result.success && result.data) {
        const { subCategory, confidence } = result.data
        console.log('🎯 AI detected category:', subCategory, 'confidence:', confidence)

        // Auto-assign category if confidence is high and no category is selected
        if (confidence === 'high' && (!selectedTemplate || selectedTemplate === 'general')) {
          setSelectedTemplate(subCategory.toLowerCase() as ProductCategory)
          setCategoryDetected(true)
          console.log('🎯 Category auto-assigned from image:', subCategory)
        }
      }
    } catch (error) {
      console.error('Error detecting category from image:', error)
      // Don't show error to user - this is a background enhancement
    }
  }, [selectedTemplate])

  const detectColorsFromPrimaryPhotos = useCallback(async (photos: UploadedFile[]) => {
    if (photos.length === 0) {
      setDetectedVariants([])
      return
    }

    setColorDetectionLoading(true)
    console.log(`🎨 Starting color detection for ${photos.length} primary photos`)

    try {
      // Convert files to base64 for API
      const imageData = await Promise.all(
        photos.map(async ({ file }) => {
          return new Promise<{ dataUrl: string; filename: string }>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => {
              resolve({
                dataUrl: reader.result as string,
                filename: file.name
              })
            }
            reader.readAsDataURL(file)
          })
        })
      )

      const response = await authenticatedFetch('/api/detect-colors', {
        method: 'POST',
        body: JSON.stringify({ images: imageData })
      })

      const result = await response.json()
      
      if (result.success && result.variants) {
        setDetectedVariants(result.variants)
        console.log(`✅ Detected ${result.variants.length} color variants`)
      } else {
        console.error('Color detection failed:', result.error)
        setDetectedVariants([])
      }
    } catch (error) {
      console.error('Error detecting colors:', error)
      setDetectedVariants([])
    } finally {
      setColorDetectionLoading(false)
    }
  }, [])

  const updateVariantOverride = useCallback((standardizedColor: string, override: string) => {
    setDetectedVariants(prev => prev.map(variant => 
      variant.standardizedColor === standardizedColor 
        ? { ...variant, userOverride: override.trim() || undefined }
        : variant
    ))
  }, [])

  const handlePrimaryPhotosDrop = useCallback((files: File[]) => {
    const newFiles = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }))
    
    setPrimaryPhotos(prev => {
      const updated = [...prev, ...newFiles]
      
      // Trigger color detection when primary photos are added
      detectColorsFromPrimaryPhotos(updated)
      
      // Also trigger category detection from first image
      if (prev.length === 0 && newFiles.length > 0) {
        setCategoryDetected(true)
        detectCategoryFromImage(newFiles[0].file)
      }
      
      return updated
    })
  }, [detectColorsFromPrimaryPhotos, detectCategoryFromImage])

  const handleSecondaryPhotosDrop = useCallback((files: File[]) => {
    const newFiles = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }))
    
    setSecondaryPhotos(prev => [...prev, ...newFiles])
  }, [])

  const removePrimaryPhoto = (index: number) => {
    setPrimaryPhotos(prev => {
      const newPhotos = [...prev]
      URL.revokeObjectURL(newPhotos[index].preview)
      newPhotos.splice(index, 1)
      
      // Re-trigger color detection with remaining photos
      detectColorsFromPrimaryPhotos(newPhotos)
      
      return newPhotos
    })
  }

  const removeSecondaryPhoto = (index: number) => {
    setSecondaryPhotos(prev => {
      const newPhotos = [...prev]
      URL.revokeObjectURL(newPhotos[index].preview)
      newPhotos.splice(index, 1)
      return newPhotos
    })
  }

  const handleDrop = useCallback(
    (dropFiles: File[], acceptedFiles: File[], rejectedFiles: File[]) => {
      const newFiles = acceptedFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file)
      }))
      setUploadedFiles(prev => {
        const updated = [...prev, ...newFiles]
        
        // Enable manual category selection when images are uploaded
        if (prev.length === 0 && newFiles.length > 0) {
          setCategoryDetected(true) // Allow manual selection immediately
          
          // Automatically detect category from the first uploaded image
          detectCategoryFromImage(newFiles[0].file)
        }
        
        return updated
      })
    },
    [detectCategoryFromImage]
  )

  const removeFile = (index: number) => {
    setUploadedFiles(prev => {
      const newFiles = [...prev]
      URL.revokeObjectURL(newFiles[index].preview)
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  const handleGenerateDescription = async () => {
    if (primaryPhotos.length === 0) {
      setError('Please upload at least one primary photo')
      return
    }

    if (!selectedTemplate) {
      setError('Please select a product category template')
      return
    }

    setGenerating(true)
    setError(null)
    setProgress(0)
    setShowModal(true)
    
    // Start progress animation (15 seconds to ~90%, then slow down)
    let currentProgress = 0
    progressTimer.current = setInterval(() => {
      currentProgress += Math.random() * 8 + 2 // 2-10% increments
      if (currentProgress >= 90) {
        currentProgress = 90 // Cap at 90% until completion
        if (progressTimer.current) {
          clearInterval(progressTimer.current)
        }
      }
      setProgress(Math.min(currentProgress, 90))
    }, 800) // Update every 800ms

    try {
      // Convert primary photos to base64 for API (combine with secondary photos for description generation)
      const allPhotos = [...primaryPhotos, ...secondaryPhotos]
      const imageData = await Promise.all(
        allPhotos.map(async ({ file }) => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.readAsDataURL(file)
          })
        })
      )

      const response = await authenticatedFetch('/api/generate/create', {
        method: 'POST',
        body: JSON.stringify({
          images: imageData,
          category: selectedTemplate,
          sizing: availableSizing,
          template: selectedTemplate,
          productType,
          fabricMaterial,
          occasionUse,
          targetAudience,
          keyFeatures,
          additionalNotes
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Generation failed')
      }

      // Complete progress bar
      if (progressTimer.current) {
        clearInterval(progressTimer.current)
      }
      setProgress(100)
      
      // Handle successful generation
      setGeneratedContent(data.data.generatedContent)
      console.log('Generated content:', data.data)
      
      // Auto-suggest category based on generated content
      if (data.data.generatedContent) {
        console.log('🎯 Starting category suggestion for:', data.data.generatedContent.title)
        console.log('🎯 Current category before suggestion:', selectedTemplate)
        try {
          await suggestCategoryFromContent(data.data.generatedContent)
          console.log('🎯 Category suggestion completed successfully')
        } catch (suggestionError) {
          console.error('🎯 Category suggestion failed:', suggestionError)
        }
      } else {
        console.log('🎯 No generated content found for category suggestion')
      }
      
    } catch (err) {
      console.error('Error generating content:', err)
      setError('Failed to generate product description. Please try again.')
    } finally {
      // Cleanup progress timer
      if (progressTimer.current) {
        clearInterval(progressTimer.current)
      }
      setGenerating(false)
      setShowModal(false)
    }
  }

  const handleCreateInShopify = async () => {
    if (!generatedContent) return

    setCreatingProduct(true)
    setError(null)

    try {
      // Prepare all images for upload (primary photos will be used as variant images)
      const allPhotos = [...primaryPhotos, ...secondaryPhotos]
      const uploadedImagesData = await Promise.all(
        allPhotos.map(async ({ file }) => {
          return new Promise<{ dataUrl: string; name: string; altText: string }>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => {
              resolve({
                dataUrl: reader.result as string,
                name: file.name,
                altText: generatedContent.title || file.name
              })
            }
            reader.readAsDataURL(file)
          })
        })
      )

      const url = new URL('/api/shopify/products/create', window.location.origin)
      if (shop) {
        url.searchParams.append('shop', shop)
      }
      
      console.log('🔍 DEBUG Frontend: Creating product with sizing:', {
        availableSizing,
        sizingType: typeof availableSizing,
        sizingLength: availableSizing?.length
      })

      // Determine which category to use
      const finalCategory = suggestedCategory && suggestedCategory.confidence >= 0.6
        ? suggestedCategory.category
        : selectedTemplate

      console.log('🎯 Category selection for Shopify:', {
        manualCategory: selectedTemplate,
        suggestedCategory: suggestedCategory?.category,
        confidence: suggestedCategory?.confidence,
        finalCategory,
        reason: suggestedCategory && suggestedCategory.confidence >= 0.6 ? 'Using AI suggestion' : 'Using manual selection'
      })
      
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          generatedContent,
          productData: {
            category: finalCategory,
            productType,
            sizing: availableSizing,
            template: selectedTemplate,
            fabricMaterial,
            occasionUse,
            targetAudience,
            keyFeatures,
            additionalNotes,
            colorVariants: detectedVariants
          },
          uploadedImages: uploadedImagesData
        })
      })

      const data = await response.json()
      
      console.log('🔍 DEBUG: Frontend received response:', {
        status: response.status,
        ok: response.ok,
        data: data
      })

      if (!data.success) {
        console.error('❌ Backend returned error:', data)
        throw new Error(data.error || 'Failed to create product in Shopify')
      }

      console.log('Product created successfully:', data.data)
      setProductCreated(data.data)
      setGeneratedContent(null) // Close the generated content modal

    } catch (err) {
      console.error('Error creating product in Shopify:', err)
      setError(`Failed to create product in Shopify: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setCreatingProduct(false)
    }
  }

  // Check if auth bypass is enabled in development
  const authBypass = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_SHOPIFY_AUTH_BYPASS === 'true'
  
  console.log('🔍 AUTH DEBUG:', {
    shop,
    authenticated,
    authBypass,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SHOPIFY_AUTH_BYPASS: process.env.NEXT_PUBLIC_SHOPIFY_AUTH_BYPASS
  })
  
  // Temporarily disable auth check for development
  if (false) { // if (!shop || (!authenticated && !authBypass)) {
    return (
      <Page title="Create New Product">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg">Authentication Required</Text>
                <Text as="p">
                  Please install Thunder Text from your Shopify admin panel to access this page.
                </Text>
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

  return (
    <Page 
      title="Create New Product" 
      subtitle="Generate product descriptions from images"
      primaryAction={
        <Button 
          primary 
          onClick={() => window.location.href = `/dashboard?${searchParams?.toString() || ''}`}
        >
          Back to Dashboard
        </Button>
      }
    >
      <Layout>
        {/* Information Banners */}
        <Layout.Section>
          <BlockStack gap="400">
            {/* Product Data Loading State */}
            {dataLoading && (
              <Banner status="info">
                <BlockStack gap="200" inlineAlign="center">
                  <Spinner size="small" />
                  <Text as="p">Loading product data from Shopify...</Text>
                </BlockStack>
              </Banner>
            )}
            
            {/* Product Data Load Error */}
            {dataLoadError && (
              <Banner status="warning">
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd">Product Data Load Error</Text>
                  <Text as="p">{dataLoadError}</Text>
                  <Text as="p">You can still create a product manually by uploading images and filling in the details below.</Text>
                </BlockStack>
              </Banner>
            )}
            
            {/* Pre-populated Data Success */}
            {prePopulatedData && !dataLoading && (
              <Banner status="success">
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd">✅ Product Data Loaded from Shopify</Text>
                  <Text as="p">
                    Successfully loaded data for: <strong>{prePopulatedData.title}</strong>
                  </Text>
                  <BlockStack gap="100">
                    <Text as="p">• {prePopulatedData.images.length} images available</Text>
                    <Text as="p">• Category: {prePopulatedData.category.primary}</Text>
                    <Text as="p">• {prePopulatedData.variants.length} variant(s)</Text>
                    {prePopulatedData.materials.fabric && (
                      <Text as="p">• Material: {prePopulatedData.materials.fabric}</Text>
                    )}
                  </BlockStack>
                  <Text as="p" tone="subdued">
                    Form fields have been pre-populated. You can upload additional images or modify the details below, then generate your description.
                  </Text>
                </BlockStack>
              </Banner>
            )}


          </BlockStack>
        </Layout.Section>

        <Layout.Section>
          <BlockStack gap="500">
            {/* Primary Photos Upload */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Step 1: Primary Photos (One per color variant)</Text>
                <Text as="p" tone="subdued">
                  Upload one photo for each color variant of your product. These will be used for automatic color detection.
                </Text>
                <DropZone
                  onDrop={(files) => handlePrimaryPhotosDrop(files.filter(f => f instanceof File) as File[])}
                  accept="image/*"
                  type="image"
                  allowMultiple
                >
                  {primaryPhotos.length > 0 ? (
                    <BlockStack gap="300">
                      <InlineStack gap="300" wrap={false}>
                        {primaryPhotos.map(({ file, preview }, index) => {
                          // Find the detected color for this image index
                          const detectionResult = detectedVariants.find(variant => 
                            variant.imageIndices.includes(index)
                          )
                          
                          return (
                            <Box key={index}>
                              <div style={{ position: 'relative' }}>
                                <Thumbnail
                                  source={preview}
                                  alt={file.name}
                                  size="large"
                                />
                                {/* Color detection badge */}
                                {detectionResult && (
                                  <div style={{
                                    position: 'absolute',
                                    top: '4px',
                                    right: '4px',
                                    background: detectionResult.confidence > 50 ? '#1f8f4f' : '#d72c0d',
                                    color: 'white',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: 'bold',
                                    maxWidth: '80px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {detectionResult.userOverride || detectionResult.standardizedColor}
                                  </div>
                                )}
                                {/* Loading indicator during detection */}
                                {colorDetectionLoading && !detectionResult && (
                                  <div style={{
                                    position: 'absolute',
                                    top: '4px',
                                    right: '4px',
                                    background: '#666',
                                    color: 'white',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '10px'
                                  }}>
                                    ...
                                  </div>
                                )}
                              </div>
                              <Box paddingBlockStart="200">
                                <Button 
                                  size="micro" 
                                  onClick={() => removePrimaryPhoto(index)}
                                >
                                  Remove
                                </Button>
                              </Box>
                            </Box>
                          )
                        })}
                      </InlineStack>
                      <Text as="p" tone="subdued">
                        Drop more primary photos here, or click to browse
                      </Text>
                    </BlockStack>
                  ) : (
                    <div style={{ 
                      padding: '60px 40px', 
                      textAlign: 'center',
                      border: '2px dashed #cccccc',
                      borderRadius: '8px',
                      backgroundColor: '#fafafa',
                      cursor: 'pointer'
                    }}>
                      <BlockStack gap="200">
                        <Text as="p" variant="bodyLg">
                          📷 Upload Primary Photos
                        </Text>
                        <Text as="p" tone="subdued">
                          One photo per color variant for automatic detection
                        </Text>
                        <Button>Select Primary Photos</Button>
                      </BlockStack>
                    </div>
                  )}
                </DropZone>
              </BlockStack>
            </Card>

            {/* Color Detection Results */}
            {(colorDetectionLoading || detectedVariants.length > 0) && (
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Detected Color Variants</Text>
                  
                  {colorDetectionLoading ? (
                    <BlockStack gap="200" inlineAlign="center">
                      <Spinner size="small" />
                      <Text as="p" tone="subdued">Detecting colors from your primary photos...</Text>
                    </BlockStack>
                  ) : (
                    <BlockStack gap="300">
                      {detectedVariants.map((variant, index) => (
                        <Card key={variant.standardizedColor} background="bg-surface-secondary">
                          <BlockStack gap="200">
                            <InlineStack align="space-between">
                              <Text as="h3" variant="headingSm">
                                {variant.userOverride || variant.standardizedColor}
                              </Text>
                              <Text as="p" tone="subdued" variant="bodySm">
                                {variant.confidence}% confidence
                              </Text>
                            </InlineStack>
                            <Text as="p" tone="subdued" variant="bodySm">
                              {variant.imageIndices.length} image(s) • Original detection: {variant.colorName}
                            </Text>
                            <TextField
                              label="Override color name (optional)"
                              value={variant.userOverride || ''}
                              onChange={(value) => updateVariantOverride(variant.standardizedColor, value)}
                              placeholder={`Leave blank to use "${variant.standardizedColor}"`}
                            />
                          </BlockStack>
                        </Card>
                      ))}
                    </BlockStack>
                  )}
                </BlockStack>
              </Card>
            )}

            {/* Secondary Photos Upload */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Additional Photos (Multiple angles)</Text>
                <Text as="p" tone="subdued">
                  Upload additional photos showing different angles of the same color variants. These won't be used for color detection.
                </Text>
                <DropZone
                  onDrop={(files) => handleSecondaryPhotosDrop(files.filter(f => f instanceof File) as File[])}
                  accept="image/*"
                  type="image"
                  allowMultiple
                >
                  {secondaryPhotos.length > 0 ? (
                    <BlockStack gap="300">
                      <InlineStack gap="300" wrap={false}>
                        {secondaryPhotos.map(({ file, preview }, index) => (
                          <Box key={index}>
                            <Thumbnail
                              source={preview}
                              alt={file.name}
                              size="large"
                            />
                            <Box paddingBlockStart="200">
                              <Button 
                                size="micro" 
                                onClick={() => removeSecondaryPhoto(index)}
                              >
                                Remove
                              </Button>
                            </Box>
                          </Box>
                        ))}
                      </InlineStack>
                      <Text as="p" tone="subdued">
                        Drop more additional photos here, or click to browse
                      </Text>
                    </BlockStack>
                  ) : (
                    <div style={{ 
                      padding: '60px 40px', 
                      textAlign: 'center',
                      border: '2px dashed #cccccc',
                      borderRadius: '8px',
                      backgroundColor: '#fafafa',
                      cursor: 'pointer'
                    }}>
                      <BlockStack gap="200">
                        <Text as="p" variant="bodyLg">
                          📷 Upload Additional Photos
                        </Text>
                        <Text as="p" tone="subdued">
                          Optional: Multiple angles of the same color variants
                        </Text>
                        <Button>Select Additional Photos</Button>
                      </BlockStack>
                    </div>
                  )}
                </DropZone>
              </BlockStack>
            </Card>

            {/* Product Details Form */}
            <Layout>
              <Layout.Section variant="oneHalf">
                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">Step 2: Product Details</Text>
                    
                    {/* Image Upload Requirement Notice */}
                    {primaryPhotos.length === 0 && (
                      <Banner status="info">
                        <Text as="p">
                          Upload primary photos first, then manually select the product category below
                        </Text>
                      </Banner>
                    )}
                    
                    {/* Category Suggestion Display */}
                    {suggestedCategory && (
                      <Banner status="success">
                        <BlockStack gap="200">
                          <Text as="p">
                            <Text as="span" fontWeight="bold">Suggested Category:</Text> {suggestedCategory.category}
                          </Text>
                          <Text as="p" tone="subdued" variant="bodySm">
                            Confidence: {(suggestedCategory.confidence * 100).toFixed(0)}%
                            {suggestedCategory.confidence >= 0.6 ? ' (Auto-assigned)' : ' (Please review and select manually)'}
                          </Text>
                          {suggestedCategory.confidence < 0.6 && (
                            <Button
                              size="micro"
                              onClick={() => {
                                setSelectedTemplate(suggestedCategory.category as ProductCategory)
                                setCategoryDetected(true)
                              }}
                            >
                              Use This Suggestion
                            </Button>
                          )}
                        </BlockStack>
                      </Banner>
                    )}
                    
                    <Select
                      label="Available Sizing"
                      helpText="Select the available size range for this product"
                      options={sizingOptions}
                      value={availableSizing}
                      disabled={primaryPhotos.length === 0}
                      onChange={setAvailableSizing}
                    />
                    
                    <ProductTypeSelector
                      value={productType}
                      onChange={setProductType}
                      shopDomain={shop || undefined}
                    />

                    <CategoryTemplateSelector
                      value={selectedTemplate}
                      onChange={handleTemplateChange}
                      storeId={shop || 'test-store'}
                      onPreview={setTemplatePreview}
                    />
                  </BlockStack>
                </Card>
              </Layout.Section>

              <Layout.Section variant="oneHalf">
                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">Step 3: Additional Information</Text>
                    
                    <TextField
                      label="Fabric/Material Content"
                      placeholder="e.g. 100% organic cotton, stainless steel, recycled plastic"
                      value={fabricMaterial}
                      onChange={setFabricMaterial}
                      helpText="Describe the materials used in this product"
                      multiline={2}
                    />
                    
                    <TextField
                      label="Occasion Use"
                      placeholder="e.g. outdoor activities, formal events, everyday use"
                      value={occasionUse}
                      onChange={setOccasionUse}
                      helpText="When or where would customers use this product?"
                      multiline={2}
                    />
                    
                    <TextField
                      label="Target Audience"
                      placeholder="e.g. young professionals, parents, fitness enthusiasts"
                      value={targetAudience}
                      onChange={setTargetAudience}
                      helpText="Who is this product designed for?"
                      multiline={2}
                    />
                  </BlockStack>
                </Card>
              </Layout.Section>
            </Layout>

            {/* Additional Features and Notes */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Step 4: Features & Additional Details</Text>
                
                <TextField
                  label="Key Features"
                  placeholder="e.g. waterproof, eco-friendly, machine washable, lifetime warranty"
                  value={keyFeatures}
                  onChange={setKeyFeatures}
                  helpText="List the main features and benefits"
                  multiline={3}
                />
                
                <TextField
                  label="Additional Notes"
                  placeholder="Any other important information about this product"
                  value={additionalNotes}
                  onChange={setAdditionalNotes}
                  helpText="Optional: Add any special instructions or details"
                  multiline={3}
                />
              </BlockStack>
            </Card>

            {/* Error Display */}
            {error && (
              <Banner status="critical">
                <Text as="p">{error}</Text>
              </Banner>
            )}

            {/* Action Buttons */}
            <Card>
              <InlineStack align="end" gap="300">
                <Button onClick={() => window.history.back()}>
                  Cancel
                </Button>
                <Button
                  primary
                  loading={generating}
                  onClick={handleGenerateDescription}
                  disabled={primaryPhotos.length === 0 || !selectedTemplate}
                >
                  {generating ? 'Generating...' : 'Generate Description'}
                </Button>
              </InlineStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>

      {/* AI Generation Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title=""
        primaryAction={undefined}
        secondaryActions={undefined}
      >
        <Modal.Section>
          <BlockStack gap="500" align="center">
            <BlockStack gap="300" align="center">
              <Text as="h2" variant="headingLg" alignment="center">
                Creating Your Product Description
              </Text>
              
              <Box paddingBlockStart="400" paddingBlockEnd="400" width="100%">
                <ProgressBar progress={progress} size="large" />
              </Box>
              
              <BlockStack gap="200" align="center">
                <Text as="p" variant="bodyLg" alignment="center" tone="subdued">
                  A work of art is in progress...
                </Text>
                <Text as="p" variant="bodyMd" alignment="center">
                  Our AI is analyzing your images and crafting the perfect description.
                </Text>
                <Text as="p" variant="bodySm" alignment="center" tone="subdued">
                  This typically takes 10-15 seconds.
                </Text>
              </BlockStack>
            </BlockStack>
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* Generated Content Results */}
      {generatedContent && (
        <Modal
          open={!!generatedContent}
          onClose={() => setGeneratedContent(null)}
          title="Generated Product Description"
          primaryAction={{
            content: creatingProduct ? 'Creating Product...' : 'Create Product in Shopify',
            loading: creatingProduct,
            onAction: handleCreateInShopify
          }}
          secondaryActions={[
            {
              content: 'Generate Again',
              onAction: () => {
                setGeneratedContent(null)
                handleGenerateDescription()
              }
            },
            {
              content: 'Close',
              onAction: () => setGeneratedContent(null)
            }
          ]}
        >
          <Modal.Section>
            <BlockStack gap="400">
              <TextField
                label="Product Title"
                value={generatedContent.title || ''}
                onChange={() => {}}
                readOnly
              />

              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd">Description</Text>
                  <Box
                    padding="400"
                    background="bg-surface-secondary"
                    borderRadius="200"
                  >
                    <div
                      style={{
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'inherit',
                        fontSize: '14px',
                        lineHeight: '1.6'
                      }}
                      dangerouslySetInnerHTML={{
                        __html: generatedContent.description || ''
                      }}
                    />
                  </Box>
                </BlockStack>
              </Card>
              
              <TextField
                label="Meta Description"
                value={generatedContent.metaDescription || ''}
                onChange={() => {}}
                multiline={2}
                readOnly
              />
              
              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd">Key Features</Text>
                  {generatedContent.bulletPoints && generatedContent.bulletPoints.length > 0 ? (
                    <BlockStack gap="100">
                      {generatedContent.bulletPoints.map((point: string, index: number) => (
                        <Text as="p" key={index}>• {point}</Text>
                      ))}
                    </BlockStack>
                  ) : (
                    <Text as="p" tone="subdued">No bullet points generated</Text>
                  )}
                </BlockStack>
              </Card>
              
              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd">SEO Keywords</Text>
                  <Text as="p">
                    {generatedContent.keywords && generatedContent.keywords.length > 0 
                      ? generatedContent.keywords.join(', ') 
                      : 'No keywords generated'
                    }
                  </Text>
                </BlockStack>
              </Card>
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}

      {/* Product Created Success Modal */}
      {productCreated && (
        <Modal
          open={!!productCreated}
          onClose={() => setProductCreated(null)}
          title="🎉 Product Created Successfully!"
          primaryAction={{
            content: 'View in Shopify Admin',
            onAction: () => {
              window.open(productCreated.shopifyUrl, '_blank')
            }
          }}
          secondaryActions={[
            {
              content: 'Create Another Product',
              onAction: () => {
                setProductCreated(null)
                // Reset form
                setUploadedFiles([])
                setSelectedTemplate('general')
                setSelectedParentCategory('')
                setSelectedSubCategory('')
                setCategoryDetected(false)
                setSuggestedCategory(null)
                setAvailableSizing('')
                setFabricMaterial('')
                setOccasionUse('')
                setTargetAudience('')
                setKeyFeatures('')
                setAdditionalNotes('')
              }
            },
            {
              content: 'Close',
              onAction: () => setProductCreated(null)
            }
          ]}
        >
          <Modal.Section>
            <BlockStack gap="400">
              <Banner status="success">
                <Text as="p">
                  Your product has been successfully created in Shopify as a draft. 
                  You can now review and publish it from your Shopify admin.
                </Text>
              </Banner>
              
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Product Details</Text>
                  <BlockStack gap="200">
                    <Text as="p">
                      <Text as="span" fontWeight="bold">Title:</Text> {productCreated.product?.title}
                    </Text>
                    <Text as="p">
                      <Text as="span" fontWeight="bold">Status:</Text> Draft (ready for review)
                    </Text>
                    <Text as="p">
                      <Text as="span" fontWeight="bold">Product ID:</Text> {productCreated.product?.id}
                    </Text>
                  </BlockStack>
                </BlockStack>
              </Card>
              
              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd">Next Steps</Text>
                  <BlockStack gap="100">
                    <Text as="p">• Review the product details in your Shopify admin</Text>
                    <Text as="p">• Add product images if needed</Text>
                    <Text as="p">• Set pricing and inventory</Text>
                    <Text as="p">• Publish when ready to sell</Text>
                  </BlockStack>
                </BlockStack>
              </Card>
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}
    </Page>
  )
}

export default function CreateProductPage() {
  return (
    <Suspense fallback={
      <Box padding="800">
        <InlineStack align="center" blockAlign="center">
          <Spinner size="small" />
          <Text as="p">Loading Create Product Page...</Text>
        </InlineStack>
      </Box>
    }>
      <CreateProductContent />
    </Suspense>
  )
}