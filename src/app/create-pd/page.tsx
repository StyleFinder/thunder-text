'use client'

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic'

import { useState, useCallback, useEffect, Suspense, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamicImport from 'next/dynamic'
import 'react-quill-new/dist/quill.snow.css'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/logger'

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamicImport(() => import('react-quill-new'), { ssr: false })
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Loader2, Upload, X } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
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
  const [templatePreview, setTemplatePreview] = useState<{id: string; name: string; category: string; content: string; is_default: boolean} | null>(null)
  const [fabricMaterial, setFabricMaterial] = useState('')
  const [occasionUse, setOccasionUse] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [keyFeatures, setKeyFeatures] = useState('')
  const [additionalNotes, setAdditionalNotes] = useState('')

  // Loading states
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<Record<string, unknown> | null>(null)
  const [creatingProduct, setCreatingProduct] = useState(false)
  const [productCreated, setProductCreated] = useState<Record<string, unknown> | null>(null)
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
  const [customCategories, setCustomCategories] = useState<Array<Record<string, unknown>>>([])
  const [parentCategories, setParentCategories] = useState<Array<Record<string, unknown>>>([])
  const [subCategories, setSubCategories] = useState<Array<Record<string, unknown>>>([])
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
          const data = await fetchProductDataForPrePopulation(productId, shop)

          if (data) {
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
            const formattedSizing = data.metafields.sizing ? formatSizingData(data.metafields.sizing) : null
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
          logger.error('Error fetching product data', error as Error, {
            component: 'create-pd-page',
            operation: 'fetchProductData',
            productId,
            shop
          })
          setDataLoadError(`Failed to load product data: ${error instanceof Error ? error.message : 'Unknown error'}`)

          // Fallback to basic admin extension data if comprehensive fetch fails
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
    if (shop) {
      // Fetch shop sizes (doesn't require authentication)
      fetchShopSizes()

      // Fetch authenticated-only data
      if (authenticated) {
        fetchCustomCategories()
        fetchParentCategories()
        fetchGlobalDefaultTemplate()
      }
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
        logger.error(errorMsg, new Error(errorMsg), {
          component: 'create-pd-page',
          operation: 'fetchCustomCategories',
          status: response.status,
          shop
        })
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
      logger.error(errorMsg, err as Error, {
        component: 'create-pd-page',
        operation: 'fetchCustomCategories',
        shop
      })
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
      logger.error('Error fetching parent categories', err as Error, {
        component: 'create-pd-page',
        operation: 'fetchParentCategories',
        shop
      })
    }
  }

  const fetchShopSizes = async () => {
    try {
      const response = await fetch(`/api/shop-sizes?shop=${shop}`)
      const data = await response.json()

      if (data.success && data.data.length > 0) {
        // Convert shop sizes to dropdown options
        interface ShopSize {
          name: string
          is_default: boolean
          sizes: string[]
        }

        const options = data.data.map((size: ShopSize) => ({
          label: `${size.name}${size.is_default ? ' (Default)' : ''}: ${size.sizes.join(', ')}`,
          value: size.sizes.join(', ')
        }))
        setSizingOptions(options)

        // Set default sizing if available
        const defaultSize = data.data.find((size: ShopSize) => size.is_default)
        if (defaultSize && !availableSizing) {
          setAvailableSizing(defaultSize.sizes.join(', '))
        }
      } else {
        // Fallback to hardcoded defaults if no shop sizes exist
        setSizingOptions([
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
      logger.error('Error fetching shop sizes', err as Error, {
        component: 'create-pd-page',
        operation: 'fetchShopSizes',
        shop
      })
      // Fallback to hardcoded defaults on error
      setSizingOptions([
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
      logger.error('Error fetching sub-categories', err as Error, {
        component: 'create-pd-page',
        operation: 'fetchSubCategories',
        shop,
        parentId
      })
    }
  }


  const fetchGlobalDefaultTemplate = async () => {
    try {
      const storeId = shop // Using shop as store identifier
      const response = await fetch(`/api/prompts?store_id=${storeId}&get_default=true`)
      const data = await response.json()

      if (data.default_template) {
        setSelectedTemplate(data.default_template)
      }
    } catch (err) {
      logger.error('Error fetching global default template', err as Error, {
        component: 'create-pd-page',
        operation: 'fetchGlobalDefaultTemplate',
        storeId: shop
      })
      // Fall back to 'general' if there's an error
    }
  }

  const suggestCategoryFromContent = async (generatedContent: {
    title: string
    description: string
    keywords: string[]
  }) => {
    try {

      const response = await authenticatedFetch('/api/categories/suggest', {
        method: 'POST',
        body: JSON.stringify({
          title: generatedContent.title,
          description: generatedContent.description,
          keywords: generatedContent.keywords
        })
      }, shop || undefined)

      const data = await response.json()

      if (data.success && data.suggestion) {
        const { category, confidence, shouldAutoAssign } = data.suggestion


        // Store the suggestion for display
        setSuggestedCategory({ category, confidence })

        // Auto-assign if confidence is high enough
        if (shouldAutoAssign && confidence >= 0.6) {

          // If no category is selected, auto-assign
          if (!selectedTemplate || selectedTemplate === 'general') {
            setSelectedTemplate(category)
            setCategoryDetected(true)
          }
          // If category is different and confidence is very high, suggest replacement
          else if (selectedTemplate !== category && confidence >= 0.8) {
            // For now, just log - could add UI notification later
            // Future: show user a suggestion to replace category
          }
          // If same category, confirm it's correct
          else if (selectedTemplate === category) {
          }
        }
      }
    } catch (err) {
      logger.error('Error getting category suggestion', err as Error, {
        component: 'create-pd-page',
        operation: 'suggestCategoryFromContent',
        title: generatedContent.title,
        shop
      })
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
      }, shop || undefined)

      const result = await response.json()

      if (result.success && result.data) {
        const { subCategory, confidence } = result.data

        // Auto-assign category if confidence is high and no category is selected
        if (confidence === 'high' && (!selectedTemplate || selectedTemplate === 'general')) {
          setSelectedTemplate(subCategory.toLowerCase() as ProductCategory)
          setCategoryDetected(true)
        }
      }
    } catch (error) {
      logger.error('Error detecting category from image', error as Error, {
        component: 'create-pd-page',
        operation: 'detectCategoryFromImage',
        shop
      })
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
      }, shop || undefined)

      const result = await response.json()

      if (result.success && result.variants) {
        setDetectedVariants(result.variants)
      } else {
        logger.error('Color detection failed', new Error(result.error || 'Unknown error'), {
          component: 'create-pd-page',
          operation: 'detectColorsFromPrimaryPhotos',
          photosCount: photos.length,
          shop
        })
        setDetectedVariants([])
      }
    } catch (error) {
      logger.error('Error detecting colors', error as Error, {
        component: 'create-pd-page',
        operation: 'detectColorsFromPrimaryPhotos',
        photosCount: photos.length,
        shop
      })
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

    if (!shop) {
      setError('Shop parameter is required. Please include ?shop=your-store.myshopify.com in the URL.')
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
      }, shop || undefined)

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
        try {
          await suggestCategoryFromContent(data.data.generatedContent)
        } catch (suggestionError) {
          logger.error('Category suggestion failed', suggestionError as Error, {
            component: 'create-pd-page',
            operation: 'handleGenerateDescription-suggestCategory',
            shop
          })
        }
      } else {
      }

    } catch (err) {
      logger.error('Error generating content', err as Error, {
        component: 'create-pd-page',
        operation: 'handleGenerateDescription',
        category: selectedTemplate,
        photosCount: primaryPhotos.length + secondaryPhotos.length,
        shop
      })
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
                altText: (typeof generatedContent?.title === 'string' ? generatedContent.title : null) || file.name
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

      // Determine which category to use
      const finalCategory = suggestedCategory && suggestedCategory.confidence >= 0.6
        ? suggestedCategory.category
        : selectedTemplate

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

      if (!data.success) {
        logger.error('Backend returned error', new Error(data.error), {
          component: 'create-pd-page',
          operation: 'handleCreateInShopify',
          shop,
          category: finalCategory
        })
        throw new Error(data.error || 'Failed to create product in Shopify')
      }
      setProductCreated(data.data)
      setGeneratedContent(null) // Close the generated content modal

    } catch (err) {
      logger.error('Error creating product in Shopify', err as Error, {
        component: 'create-pd-page',
        operation: 'handleCreateInShopify',
        shop,
        photosCount: primaryPhotos.length + secondaryPhotos.length
      })
      setError(`Failed to create product in Shopify: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setCreatingProduct(false)
    }
  }

  // Check if auth bypass is enabled in development
  const authBypass = process.env.NODE_ENV === 'development'

  // Temporarily disable auth check for development
  if (false) { // if (!shop || (!authenticated && !authBypass)) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold text-oxford-900 mb-6">Create New Product</h1>
        <div className="space-y-6">
          <section>
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4">
                  <h2 className="text-xl font-semibold text-oxford-800">Authentication Required</h2>
                  <p className="text-sm text-gray-900">
                    Please install Thunder Text from your Shopify admin panel to access this page.
                  </p>
                  <Button onClick={() => window.location.href = '/'} >
                    Back to Home
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Page Header with Back Button */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        maxWidth: '800px',
        margin: '0 auto 24px auto',
        width: '100%'
      }}>
        <div>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 700,
            color: '#003366',
            margin: '0 0 4px 0',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
          }}>
            Create New Product
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            margin: 0,
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
          }}>
            Generate product descriptions from images
          </p>
        </div>
        <button
          onClick={() => window.location.href = `/dashboard?${searchParams?.toString() || ''}`}
          style={{
            background: 'transparent',
            color: '#003366',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f9fafb'
            e.currentTarget.style.borderColor = '#0066cc'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.borderColor = '#e5e7eb'
          }}
        >
          Back to Dashboard
        </button>
      </div>

      {/* All Cards Container - gap is handled by parent main element */}
      <div style={{ display: 'contents' }}>
        {/* Information Banners */}
        <section style={{ maxWidth: '800px', margin: '0 auto', width: '100%', marginBottom: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Product Data Loading State */}
            {dataLoading && (
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: '#0066cc', flexShrink: 0 }} />
                <p style={{ fontSize: '14px', color: '#003366', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Loading product data from Shopify...</p>
              </div>
            )}

            {/* Product Data Load Error */}
            {dataLoadError && (
              <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#92400e', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Product Data Load Error</h3>
                  <p style={{ fontSize: '14px', color: '#78350f', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>{dataLoadError}</p>
                  <p style={{ fontSize: '14px', color: '#78350f', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>You can still create a product manually by uploading images and filling in the details below.</p>
                </div>
              </div>
            )}

            {/* Pre-populated Data Success */}
            {prePopulatedData && !dataLoading && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#15803d', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>✅ Product Data Loaded from Shopify</h3>
                  <p style={{ fontSize: '14px', color: '#166534', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                    Successfully loaded data for: <strong>{prePopulatedData.title}</strong>
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <p style={{ fontSize: '14px', color: '#166534', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>• {prePopulatedData.images.length} images available</p>
                    <p style={{ fontSize: '14px', color: '#166534', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>• Category: {prePopulatedData.category.primary}</p>
                    <p style={{ fontSize: '14px', color: '#166534', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>• {prePopulatedData.variants.length} variant(s)</p>
                    {prePopulatedData.materials.fabric && (
                      <p style={{ fontSize: '14px', color: '#166534', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>• Material: {prePopulatedData.materials.fabric}</p>
                    )}
                  </div>
                  <p style={{ fontSize: '14px', color: '#16a34a', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                    Form fields have been pre-populated. You can upload additional images or modify the details below, then generate your description.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section>
          {/* Step Cards - Each card is constrained and centered */}
          <>
            {/* Step 1: Product Type Selection */}
            <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', maxWidth: '800px', margin: '0 auto 24px auto', width: '100%' }}>
              <div style={{ padding: '24px' }}>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#003366',
                  margin: '0 0 8px 0',
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
                }}>
                  Step 1: What Product Are You Selling?
                </h2>
                <p style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  lineHeight: 1.6,
                  margin: '0 0 24px 0',
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
                }}>
                  Specify the primary product type first. This helps the AI focus on the correct item when analyzing images with multiple objects (e.g., jacket with visible shirt, shoes with pants).
                </p>

                <ProductTypeSelector
                  value={productType}
                  onChange={setProductType}
                  shopDomain={shop || undefined}
                />
              </div>
            </div>

            {/* Primary Photos Upload */}
            <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', maxWidth: '800px', margin: '0 auto 24px auto', width: '100%' }}>
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h2 style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: '#003366',
                    margin: '0 0 8px 0',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
                  }}>
                    Step 2: Primary Photos (One per color variant)
                  </h2>
                  <p style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    lineHeight: 1.6,
                    margin: '0 0 24px 0',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
                  }}>
                    Upload one photo for each color variant of your product. These will be used for automatic color detection.
                  </p>

                  {!productType && (
                    <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', padding: '16px' }}>
                      <p style={{ fontSize: '14px', color: '#78350f', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                        Please specify the product type in Step 1 before uploading images.
                      </p>
                    </div>
                  )}

                  <div
                    className="border-2 border-dashed border-oxford-200 rounded-lg p-6 hover:border-smart-500 transition-colors cursor-pointer"
                    onClick={() => {
                      const input = document.createElement('input')
                      input.type = 'file'
                      input.accept = 'image/*'
                      input.multiple = true
                      input.onchange = (e) => {
                        const files = Array.from((e.target as HTMLInputElement).files || [])
                        handlePrimaryPhotosDrop(files)
                      }
                      input.click()
                    }}
                  >
                    {primaryPhotos.length > 0 ? (
                      <div className="flex flex-col gap-3">
                        <div className="flex gap-3 flex-wrap">
                          {primaryPhotos.map(({ file, preview }, index) => {
                            // Find the detected color for this image index
                            const detectionResult = detectedVariants.find(variant =>
                              variant.imageIndices.includes(index)
                            )

                            return (
                              <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                                  <img
                                    src={preview}
                                    alt={file.name}
                                    style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                                  />
                                  {/* Color detection badge */}
                                  {detectionResult && (
                                    <div
                                      style={{
                                        position: 'absolute',
                                        top: '4px',
                                        right: '4px',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        background: detectionResult.confidence > 50 ? '#16a34a' : '#dc2626',
                                        color: '#ffffff',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        maxWidth: '92px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                      }}
                                    >
                                      {detectionResult.userOverride || detectionResult.standardizedColor}
                                    </div>
                                  )}
                                  {/* Loading indicator during detection */}
                                  {colorDetectionLoading && !detectionResult && (
                                    <div style={{ position: 'absolute', top: '4px', right: '4px', background: '#6b7280', color: '#ffffff', padding: '4px 8px', borderRadius: '4px', fontSize: '11px' }}>
                                      ...
                                    </div>
                                  )}
                                </div>
                                <button
                                  style={{
                                    background: 'transparent',
                                    color: '#dc2626',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '6px',
                                    padding: '8px 12px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    removePrimaryPhoto(index)
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#fff5f5'
                                    e.currentTarget.style.borderColor = '#dc2626'
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent'
                                    e.currentTarget.style.borderColor = '#e5e7eb'
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            )
                          })}
                        </div>
                        <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                          Drop more primary photos here, or click to browse
                        </p>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '32px 0' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                          <Upload className="h-12 w-12" style={{ color: '#6b7280' }} />
                          <p style={{ fontSize: '16px', fontWeight: 600, color: '#003366', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>📷 Upload Primary Photos</p>
                          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                            One photo per color variant for automatic detection
                          </p>
                          <button type="button" style={{ background: 'transparent', color: '#003366', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontWeight: 600, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', cursor: 'pointer', marginTop: '8px', transition: 'all 0.15s ease' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#0066cc' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#e5e7eb' }}>Select Primary Photos</button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Color Detection Results - Integrated */}
                  {(colorDetectionLoading || detectedVariants.length > 0) && (
                    <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
                      <h3 style={{
                        fontSize: '18px',
                        fontWeight: 700,
                        color: '#003366',
                        margin: '0 0 16px 0',
                        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
                      }}>
                        Detected Color Variants
                      </h3>

                      {colorDetectionLoading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', padding: '24px 0' }}>
                          <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#0066cc' }} />
                          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Detecting colors from your primary photos...</p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {detectedVariants.map((variant) => (
                            <div key={variant.standardizedColor} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#003366', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                                    {variant.userOverride || variant.standardizedColor}
                                  </h4>
                                  <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                                    {variant.confidence}% confidence
                                  </p>
                                </div>
                                <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                                  {variant.imageIndices.length} image(s) • Original detection: {variant.colorName}
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <label htmlFor={`override-${variant.standardizedColor}`} style={{ fontSize: '14px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Override color name (optional)</label>
                                  <input
                                    id={`override-${variant.standardizedColor}`}
                                    type="text"
                                    value={variant.userOverride || ''}
                                    onChange={(e) => updateVariantOverride(variant.standardizedColor, e.target.value)}
                                    placeholder={`Leave blank to use "${variant.standardizedColor}"`}
                                    style={{
                                      padding: '12px',
                                      fontSize: '14px',
                                      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                                      border: '1px solid #e5e7eb',
                                      borderRadius: '8px',
                                      outline: 'none',
                                      transition: 'border-color 0.15s ease'
                                    }}
                                    onFocus={(e) => { e.currentTarget.style.borderColor = '#0066cc' }}
                                    onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e7eb' }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Secondary Photos Upload */}
            <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', maxWidth: '800px', margin: '0 auto 24px auto', width: '100%' }}>
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h2 style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: '#003366',
                    margin: '0 0 8px 0',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
                  }}>
                    Step 3: Additional Photos (Multiple angles)
                  </h2>
                  <p style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    lineHeight: 1.6,
                    margin: '0 0 24px 0',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
                  }}>
                    Upload additional photos showing different angles of the same color variants. These will not be used for color detection.
                  </p>

                  <div
                    className="border-2 border-dashed border-oxford-200 rounded-lg p-6 hover:border-smart-500 transition-colors cursor-pointer"
                    onClick={() => {
                      const input = document.createElement('input')
                      input.type = 'file'
                      input.accept = 'image/*'
                      input.multiple = true
                      input.onchange = (e) => {
                        const files = Array.from((e.target as HTMLInputElement).files || [])
                        handleSecondaryPhotosDrop(files)
                      }
                      input.click()
                    }}
                  >
                    {secondaryPhotos.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          {secondaryPhotos.map(({ file, preview }, index) => (
                            <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                                <img
                                  src={preview}
                                  alt={file.name}
                                  style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                                />
                              </div>
                              <button
                                style={{
                                  background: 'transparent',
                                  color: '#dc2626',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '6px',
                                  padding: '8px 12px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeSecondaryPhoto(index)
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#fff5f5'
                                  e.currentTarget.style.borderColor = '#dc2626'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'transparent'
                                  e.currentTarget.style.borderColor = '#e5e7eb'
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                        <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                          Drop more additional photos here, or click to browse
                        </p>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '32px 0' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                          <Upload className="h-12 w-12" style={{ color: '#6b7280' }} />
                          <p style={{ fontSize: '16px', fontWeight: 600, color: '#003366', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>📷 Upload Additional Photos</p>
                          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                            Optional: Multiple angles of the same color variants
                          </p>
                          <button type="button" style={{ background: 'transparent', color: '#003366', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontWeight: 600, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', cursor: 'pointer', marginTop: '8px', transition: 'all 0.15s ease' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#0066cc' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#e5e7eb' }}>Select Additional Photos</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Product Details Form */}
            <div className="grid grid-cols-1 md:grid-cols-2" style={{ maxWidth: '800px', margin: '0 auto', marginBottom: '32px', width: '100%', gap: '32px' }}>
              {/* Step 4: Product Details Card */}
              <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
                <div style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h2 style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: '#003366',
                      margin: 0,
                      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
                    }}>
                      Step 4: Product Details
                    </h2>

                    {/* Image Upload Requirement Notice */}
                    {primaryPhotos.length === 0 && (
                      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '16px' }}>
                        <p style={{ fontSize: '14px', color: '#003366', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                          Upload primary photos first, then manually select the product category below
                        </p>
                      </div>
                    )}

                    {/* Category Suggestion Display */}
                    {suggestedCategory && (
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <p style={{ fontSize: '14px', color: '#166534', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                            <span style={{ fontWeight: 700 }}>Suggested Category:</span> {suggestedCategory.category}
                          </p>
                          <p style={{ fontSize: '14px', color: '#166534', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                            Confidence: {(suggestedCategory.confidence * 100).toFixed(0)}%
                            {suggestedCategory.confidence >= 0.6 ? ' (Auto-assigned)' : ' (Please review and select manually)'}
                          </p>
                          {suggestedCategory.confidence < 0.6 && (
                            <button
                              onClick={() => {
                                setSelectedTemplate(suggestedCategory.category as ProductCategory)
                                setCategoryDetected(true)
                              }}
                              style={{
                                background: '#16a34a',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '8px 16px',
                                fontSize: '12px',
                                fontWeight: 600,
                                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                alignSelf: 'flex-start'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = '#15803d' }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = '#16a34a' }}
                            >
                              Use This Suggestion
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Available Sizing */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label htmlFor="sizing-select" style={{ fontSize: '14px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                        Available Sizing
                      </label>
                      <Select
                        value={availableSizing}
                        onValueChange={setAvailableSizing}
                      >
                        <SelectTrigger id="sizing-select">
                          <SelectValue placeholder="Select the available size range" />
                        </SelectTrigger>
                        <SelectContent>
                          {sizingOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Product Templates - Add proper spacing */}
                    <div style={{ marginTop: '8px' }}>
                      <CategoryTemplateSelector
                        value={selectedTemplate}
                        onChange={handleTemplateChange}
                        storeId={shop || 'test-store'}
                        onPreview={setTemplatePreview}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 5: Additional Information Card */}
              <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
                <div style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h2 style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: '#003366',
                      margin: 0,
                      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
                    }}>
                      Step 5: Additional Information
                    </h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label htmlFor="fabric-material" style={{ fontSize: '14px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                        Fabric/Material Content
                      </label>
                      <Textarea
                        id="fabric-material"
                        placeholder="e.g. 100% organic cotton, stainless steel, recycled plastic"
                        value={fabricMaterial}
                        onChange={(e) => setFabricMaterial(e.target.value)}
                        rows={2}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label htmlFor="occasion-use" style={{ fontSize: '14px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                        Occasion Use
                      </label>
                      <Textarea
                        id="occasion-use"
                        placeholder="e.g. outdoor activities, formal events, everyday use"
                        value={occasionUse}
                        onChange={(e) => setOccasionUse(e.target.value)}
                        rows={2}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label htmlFor="target-audience" style={{ fontSize: '14px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                        Target Audience
                      </label>
                      <Textarea
                        id="target-audience"
                        placeholder="e.g. young professionals, parents, fitness enthusiasts"
                        value={targetAudience}
                        onChange={(e) => setTargetAudience(e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Features and Notes */}
            <Card style={{ maxWidth: '800px', margin: '0 auto 32px auto', width: '100%' }}>
              <CardContent style={{ padding: '32px' }}>
                <div className="flex flex-col gap-4">
                  <h2 style={{
                    fontSize: '20px',
                    fontWeight: 600,
                    color: '#111827',
                    margin: '0 0 16px 0'
                  }}>
                    Step 6: Features & Additional Details
                  </h2>

                  <div className="space-y-2">
                    <Label htmlFor="key-features">List the main features and benefits</Label>
                    <Textarea
                      id="key-features"
                      placeholder="e.g. waterproof, eco-friendly, machine washable, lifetime warranty"
                      value={keyFeatures}
                      onChange={(e) => setKeyFeatures(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="additional-notes">Additional Notes</Label>
                    <Textarea
                      id="additional-notes"
                      placeholder="Any other important information about this product"
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Error Display */}
            {error && (
              <div style={{ maxWidth: '800px', margin: '0 auto 24px auto', width: '100%' }}>
                <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px' }}>
                  <p style={{ fontSize: '14px', color: '#b91c1c', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>{error}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{
              maxWidth: '800px',
              margin: '0 auto',
              width: '100%',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button
                onClick={() => window.history.back()}
                style={{
                  background: 'transparent',
                  color: '#003366',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f9fafb'
                  e.currentTarget.style.borderColor = '#0066cc'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderColor = '#e5e7eb'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateDescription}
                disabled={primaryPhotos.length === 0 || !selectedTemplate || generating}
                style={{
                  background: (primaryPhotos.length === 0 || !selectedTemplate || generating) ? '#f9fafb' : '#0066cc',
                  color: (primaryPhotos.length === 0 || !selectedTemplate || generating) ? '#6b7280' : '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  cursor: (primaryPhotos.length === 0 || !selectedTemplate || generating) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.background = '#0052a3'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.background = '#0066cc'
                  }
                }}
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Description'
                )}
              </button>
            </div>
          </>
        </section>
      </div>

      {/* AI Generation Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        {showModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 50,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              pointerEvents: 'none'
            }}
            aria-hidden="true"
          />
        )}
        <DialogContent className="max-w-md" style={{ maxWidth: '480px', backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', zIndex: 51 }}>
          <DialogHeader>
            <DialogTitle className="text-center" style={{ fontSize: '20px', fontWeight: 700, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
              Creating Your Product Description
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-5 items-center py-6">
            <div className="w-full">
              <Progress value={progress} className="h-3" />
            </div>

            <div className="flex flex-col gap-2 items-center text-center">
              <p className="text-base text-gray-500" style={{ fontSize: '14px', color: '#6b7280', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                A work of art is in progress...
              </p>
              <p className="text-sm text-gray-900">
                Our AI is analyzing your images and crafting the perfect description.
              </p>
              <p className="text-xs text-gray-500">
                This typically takes 10-15 seconds.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generated Content Results */}
      {generatedContent && (
        <Dialog open={!!generatedContent} onOpenChange={() => setGeneratedContent(null)}>
          {generatedContent && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 50,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                pointerEvents: 'none'
              }}
              aria-hidden="true"
            />
          )}
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" style={{ maxWidth: '800px', backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', zIndex: 51, padding: '32px' }}>
            <DialogHeader style={{ marginBottom: '24px' }}>
              <DialogTitle style={{ fontSize: '24px', fontWeight: 700, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                Generated Product Description
              </DialogTitle>
            </DialogHeader>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Label htmlFor="generated-title" style={{ fontSize: '14px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Product Title</Label>
                <Input
                  id="generated-title"
                  value={(typeof generatedContent?.title === 'string' ? generatedContent.title : null) || ''}
                  onChange={(e) => setGeneratedContent(prev => prev ? { ...prev, title: e.target.value } : null)}
                  style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Label htmlFor="generated-description" style={{ fontSize: '14px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Description</Label>
                <ReactQuill
                  theme="snow"
                  value={(typeof generatedContent.description === 'string' ? generatedContent.description : '') as string}
                  onChange={(content) => setGeneratedContent(prev => prev ? { ...prev, description: content } : null)}
                  modules={{
                    toolbar: [
                      ['bold', 'italic', 'underline'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      ['link'],
                      ['clean']
                    ]
                  }}
                  formats={['bold', 'italic', 'underline', 'list', 'link']}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '6px',
                    minHeight: '250px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Label htmlFor="meta-description" style={{ fontSize: '14px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Meta Description</Label>
                <Textarea
                  id="meta-description"
                  value={(typeof generatedContent?.metaDescription === 'string' ? generatedContent.metaDescription : null) || ''}
                  onChange={(e) => setGeneratedContent(prev => prev ? { ...prev, metaDescription: e.target.value } : null)}
                  rows={2}
                  style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Label htmlFor="key-features" style={{ fontSize: '14px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Key Features</Label>
                <Textarea
                  id="key-features"
                  value={Array.isArray(generatedContent?.bulletPoints) ? generatedContent.bulletPoints.join('\n') : ''}
                  onChange={(e) => setGeneratedContent(prev => prev ? { ...prev, bulletPoints: e.target.value.split('\n').filter(line => line.trim()) } : null)}
                  rows={5}
                  placeholder="Enter each feature on a new line"
                  style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Label htmlFor="seo-keywords" style={{ fontSize: '14px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>SEO Keywords</Label>
                <Textarea
                  id="seo-keywords"
                  value={Array.isArray(generatedContent?.keywords) ? generatedContent.keywords.join(', ') : ''}
                  onChange={(e) => setGeneratedContent(prev => prev ? { ...prev, keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k) } : null)}
                  rows={3}
                  placeholder="Enter keywords separated by commas"
                  style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}
                />
              </div>
            </div>

            <DialogFooter style={{ marginTop: '32px', gap: '8px' }}>
              <Button
                variant="outline"
                onClick={() => setGeneratedContent(null)}
                style={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e5e7eb',
                  color: '#003366',
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  fontSize: '14px',
                  fontWeight: 500,
                  padding: '10px 20px',
                  borderRadius: '6px'
                }}
              >
                Close
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setGeneratedContent(null)
                  handleGenerateDescription()
                }}
                style={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e5e7eb',
                  color: '#003366',
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  fontSize: '14px',
                  fontWeight: 500,
                  padding: '10px 20px',
                  borderRadius: '6px'
                }}
              >
                Generate Again
              </Button>
              <Button
                onClick={handleCreateInShopify}
                disabled={creatingProduct}
                style={{
                  backgroundColor: '#0066cc',
                  borderColor: '#0066cc',
                  color: '#ffffff',
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  fontSize: '14px',
                  fontWeight: 500,
                  padding: '10px 20px',
                  borderRadius: '6px'
                }}
              >
                {creatingProduct ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Product...
                  </>
                ) : (
                  'Create Product in Shopify'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Product Created Success Modal */}
      {productCreated && (
        <Dialog open={!!productCreated} onOpenChange={() => setProductCreated(null)}>
          {productCreated && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 50,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                pointerEvents: 'none'
              }}
              aria-hidden="true"
            />
          )}
          <DialogContent className="max-w-2xl" style={{ maxWidth: '700px', maxHeight: '85vh', overflowY: 'auto', backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', zIndex: 51, padding: '32px' }}>
            <DialogHeader style={{ marginBottom: '24px' }}>
              <DialogTitle style={{ fontSize: '24px', fontWeight: 700, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                🎉 Product Created Successfully!
              </DialogTitle>
            </DialogHeader>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ padding: '16px', backgroundColor: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                <p style={{ fontSize: '14px', color: '#1f2937', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', lineHeight: '1.5' }}>
                  Your product has been successfully created in Shopify as a draft.
                  You can now review and publish it from your Shopify admin.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '24px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', marginBottom: '4px' }}>Product Details</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p style={{ fontSize: '14px', color: '#1f2937', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                    <span style={{ fontWeight: 600 }}>Title:</span> {typeof productCreated?.product === 'object' && productCreated.product && 'title' in productCreated.product ? String(productCreated.product.title) : 'N/A'}
                  </p>
                  <p style={{ fontSize: '14px', color: '#1f2937', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                    <span style={{ fontWeight: 600 }}>Status:</span> Draft (ready for review)
                  </p>
                  <p style={{ fontSize: '14px', color: '#1f2937', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                    <span style={{ fontWeight: 600 }}>Product ID:</span> {typeof productCreated?.product === 'object' && productCreated.product && 'id' in productCreated.product ? String(productCreated.product.id) : 'N/A'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '24px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', marginBottom: '4px' }}>Next Steps</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p style={{ fontSize: '14px', color: '#1f2937', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>• Review the product details in your Shopify admin</p>
                  <p style={{ fontSize: '14px', color: '#1f2937', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>• Add product images if needed</p>
                  <p style={{ fontSize: '14px', color: '#1f2937', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>• Set pricing and inventory</p>
                  <p style={{ fontSize: '14px', color: '#1f2937', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>• Publish when ready to sell</p>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Button
                onClick={() => {
                  const url = typeof productCreated?.shopifyUrl === 'string' ? productCreated.shopifyUrl : undefined
                  if (url) window.open(url, '_blank')
                }}
                style={{
                  backgroundColor: '#0066cc',
                  borderColor: '#0066cc',
                  color: '#ffffff',
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  fontSize: '14px',
                  fontWeight: 500,
                  padding: '12px 20px',
                  borderRadius: '6px',
                  width: '100%'
                }}
              >
                View in Shopify Admin
              </Button>
              <Button
                variant="outline"
                onClick={() => setProductCreated(null)}
                style={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e5e7eb',
                  color: '#003366',
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  fontSize: '14px',
                  fontWeight: 500,
                  padding: '12px 20px',
                  borderRadius: '6px',
                  width: '100%'
                }}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

export default function CreateProductPage() {
  return (
    <div style={{ background: '#fafaf9', minHeight: '100vh', padding: '32px 16px' }}>
      <Suspense fallback={
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '48px' }}>
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#0066cc' }} />
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Loading Create Product Page...</p>
          </div>
        </div>
      }>
        <CreateProductContent />
      </Suspense>
    </div>
  )
}
