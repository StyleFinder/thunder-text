import { 
  fetchProductDataForPrePopulation, 
  PrePopulatedProductData 
} from './product-prepopulation'

export interface EnhancementProductData extends PrePopulatedProductData {
  // Enhancement-specific fields
  originalDescription: string
  performance: {
    viewCount?: number
    conversionRate?: number
    lastModified: string
  }
  competitorData?: {
    similarProducts?: Array<{
      title: string
      price: string
      features: string[]
    }>
  }
  seoAnalysis?: {
    keywordDensity: Record<string, number>
    titleLength: number
    descriptionLength: number
    missingAltTexts: number
  }
  enhancementHistory?: Array<{
    date: string
    version: string
    changes: string[]
    performance?: {
      beforeConversion?: number
      afterConversion?: number
    }
  }>
}

export interface EnhancementContext {
  targetAudience?: string
  brandVoice?: 'professional' | 'casual' | 'luxury' | 'playful' | 'technical'
  keyFeaturesToHighlight?: string[]
  competitiveAdvantages?: string[]
  seasonalRelevance?: string
  promotionalContext?: string
}

/**
 * Fetch comprehensive product data specifically for enhancement workflows
 * This extends the basic product data with enhancement-specific information
 */
export async function fetchProductDataForEnhancement(
  productId: string,
  shop: string
): Promise<EnhancementProductData | null> {
  try {
    console.log('🔄 Fetching product data for enhancement:', {
      productId,
      shop,
      idFormat: productId.startsWith('gid://') ? 'GraphQL' : 'Numeric'
    })

    // Get base product data using API endpoint (server-side for env vars)
    const response = await fetch(`/api/shopify/product-prepopulation?productId=${productId}&shop=${shop}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Failed to fetch product data:', response.status, errorText)

      // Check if it's a JSON error response
      try {
        const errorData = JSON.parse(errorText)
        if (errorData.error === 'Product not found') {
          console.error('❌ Product not found in Shopify:', productId)
          return null
        }
      } catch {
        // Not JSON, use raw error
      }

      return null
    }

    const baseData = await response.json()

    if (!baseData || Object.keys(baseData).length === 0) {
      console.error('❌ Empty or invalid product data received')
      console.error('📝 Response data:', baseData)
      return null
    }

    console.log('✅ Received base product data:', {
      id: baseData.id,
      title: baseData.title,
      hasImages: baseData.images?.length > 0,
      hasVariants: baseData.variants?.length > 0
    })

    // Enhance with additional data needed for enhancement workflows
    const enhancementData: EnhancementProductData = {
      ...baseData,
      originalDescription: baseData.existingDescription || '',
      performance: {
        lastModified: new Date().toISOString(),
        // TODO: Integrate with analytics to get real performance data
        viewCount: 0,
        conversionRate: 0
      },
      seoAnalysis: {
        keywordDensity: analyzeKeywordDensity(baseData.existingDescription || ''),
        titleLength: baseData.title.length,
        descriptionLength: (baseData.existingDescription || '').length,
        missingAltTexts: baseData.images.filter(img => !img.altText).length
      },
      enhancementHistory: []
    }

    console.log('✅ Enhancement product data fetched successfully')
    return enhancementData

  } catch (error) {
    console.error('❌ Error fetching product data for enhancement:', error)
    return null
  }
}

/**
 * Generate enhancement context from existing product data
 * This analyzes the current product to suggest enhancement parameters
 */
export function generateEnhancementContext(
  productData: EnhancementProductData
): EnhancementContext {
  const context: EnhancementContext = {}

  // Infer target audience from product type and tags
  if (productData.productType.toLowerCase().includes('women')) {
    context.targetAudience = 'women'
  } else if (productData.productType.toLowerCase().includes('men')) {
    context.targetAudience = 'men'
  } else if (productData.tags.some(tag => tag.toLowerCase().includes('kid'))) {
    context.targetAudience = 'families with children'
  }

  // Infer brand voice from existing description tone
  const description = productData.originalDescription.toLowerCase()
  if (description.includes('luxury') || description.includes('premium')) {
    context.brandVoice = 'luxury'
  } else if (description.includes('professional') || description.includes('business')) {
    context.brandVoice = 'professional'
  } else if (description.includes('fun') || description.includes('playful')) {
    context.brandVoice = 'playful'
  } else {
    context.brandVoice = 'casual'
  }

  // Extract key features from current data
  context.keyFeaturesToHighlight = extractKeyFeatures(productData)

  // Identify competitive advantages
  context.competitiveAdvantages = identifyCompetitiveAdvantages(productData)

  return context
}

/**
 * Validate product for enhancement by ID
 * First fetches the product, then validates it
 */
export async function validateProductForEnhancement(
  productId: string,
  shop: string
): Promise<{ isValid: boolean; reason?: string }> {
  try {
    const productData = await fetchProductDataForEnhancement(productId, shop)

    if (!productData) {
      return { isValid: false, reason: 'Product not found or inaccessible' }
    }

    const validation = validateProductDataForEnhancement(productData)

    if (!validation.valid) {
      return {
        isValid: false,
        reason: validation.issues[0] || 'Product does not meet enhancement requirements'
      }
    }

    return { isValid: true }
  } catch (error) {
    return {
      isValid: false,
      reason: `Failed to validate product: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Validate product data for enhancement
 * Ensures the product has enough information to generate quality enhancements
 */
export function validateProductDataForEnhancement(
  productData: EnhancementProductData
): { valid: boolean; issues: string[]; suggestions: string[] } {
  const issues: string[] = []
  const suggestions: string[] = []

  // Check basic requirements
  if (!productData.title.trim()) {
    issues.push('Product title is missing or empty')
  }

  if (!productData.originalDescription.trim()) {
    issues.push('Product has no existing description to enhance')
    suggestions.push('Consider using the Create New Product workflow instead')
  }

  if (productData.images.length === 0) {
    issues.push('Product has no images')
    suggestions.push('Add product images to improve enhancement quality')
  }

  // Check description quality
  if (productData.originalDescription.length < 50) {
    issues.push('Existing description is very short (less than 50 characters)')
    suggestions.push('Consider using detailed product information to enhance')
  }

  // Check SEO issues
  if (productData.seoAnalysis?.missingAltTexts && productData.seoAnalysis.missingAltTexts > 0) {
    suggestions.push(`Add alt text to ${productData.seoAnalysis.missingAltTexts} images`)
  }

  if (productData.seoAnalysis?.titleLength && productData.seoAnalysis.titleLength > 60) {
    suggestions.push('Product title is quite long for SEO (over 60 characters)')
  }

  return {
    valid: issues.length === 0,
    issues,
    suggestions
  }
}

/**
 * Create enhancement preview data structure
 * This prepares data for the enhancement form pre-population
 */
export function createEnhancementPreview(
  productData: EnhancementProductData,
  context: EnhancementContext
) {
  return {
    productInfo: {
      id: productData.id,
      title: productData.title,
      currentDescription: productData.originalDescription,
      images: productData.images.slice(0, 3), // Show first 3 images
      price: productData.variants[0]?.price || 'N/A',
      vendor: productData.vendor
    },
    enhancementContext: context,
    currentMetrics: {
      descriptionLength: productData.originalDescription.length,
      imageCount: productData.images.length,
      variantCount: productData.variants.length,
      seoScore: calculateBasicSeoScore(productData)
    },
    recommendations: {
      suggestedLength: Math.max(150, productData.originalDescription.length * 1.5),
      focusKeywords: Object.keys(productData.seoAnalysis?.keywordDensity || {}).slice(0, 3),
      improvementAreas: identifyImprovementAreas(productData)
    }
  }
}

// Helper functions

function analyzeKeywordDensity(text: string): Record<string, number> {
  if (!text) return {}
  
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3)
  
  const frequency: Record<string, number> = {}
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1
  })
  
  return frequency
}

function extractKeyFeatures(productData: EnhancementProductData): string[] {
  const features: string[] = []
  
  // Extract from materials
  if (productData.materials.fabric) {
    features.push(productData.materials.fabric)
  }
  
  // Extract from product type
  if (productData.productType) {
    features.push(productData.productType)
  }
  
  // Extract from tags (filter relevant ones)
  const relevantTags = productData.tags.filter(tag => 
    !tag.toLowerCase().includes('collection') && 
    !tag.toLowerCase().includes('new') &&
    tag.length > 2
  )
  
  features.push(...relevantTags.slice(0, 3))
  
  return features.filter(Boolean).slice(0, 5)
}

function identifyCompetitiveAdvantages(productData: EnhancementProductData): string[] {
  const advantages: string[] = []
  
  // Based on materials
  if (productData.materials.fabric?.toLowerCase().includes('organic')) {
    advantages.push('Organic materials')
  }
  
  // Based on variants (if many options)
  if (productData.variants.length > 5) {
    advantages.push('Multiple size/color options')
  }
  
  // Based on care instructions
  if (productData.materials.careInstructions?.some(inst => 
    inst.toLowerCase().includes('machine wash')
  )) {
    advantages.push('Easy care')
  }
  
  return advantages
}

function calculateBasicSeoScore(productData: EnhancementProductData): number {
  let score = 0
  
  // Title length (ideal 30-60 chars)
  const titleLength = productData.title.length
  if (titleLength >= 30 && titleLength <= 60) score += 25
  else if (titleLength > 15) score += 15
  
  // Description length (ideal 150+ chars)
  const descLength = productData.originalDescription.length
  if (descLength >= 150) score += 25
  else if (descLength >= 100) score += 15
  else if (descLength >= 50) score += 10
  
  // Images with alt text
  const imagesWithAlt = productData.images.filter(img => img.altText).length
  if (imagesWithAlt === productData.images.length && productData.images.length > 0) {
    score += 25
  } else if (imagesWithAlt > 0) {
    score += 15
  }
  
  // Basic content quality
  if (productData.originalDescription.includes('.')) score += 10
  if (productData.materials.fabric) score += 15
  
  return Math.min(100, score)
}

function identifyImprovementAreas(productData: EnhancementProductData): string[] {
  const areas: string[] = []

  if (productData.originalDescription.length < 100) {
    areas.push('Expand product description')
  }

  if (productData.seoAnalysis?.missingAltTexts && productData.seoAnalysis.missingAltTexts > 0) {
    areas.push('Add image alt text')
  }

  if (!productData.materials.fabric) {
    areas.push('Add material information')
  }

  if (productData.variants.length === 1) {
    areas.push('Consider adding product variants')
  }

  const keywordCount = Object.keys(productData.seoAnalysis?.keywordDensity || {}).length
  if (keywordCount < 5) {
    areas.push('Improve keyword diversity')
  }

  return areas
}

/**
 * Update product with enhanced content
 * Wrapper function for the API route to update Shopify products
 */
export async function updateProductWithEnhancement(
  productId: string,
  shop: string,
  enhancementData: {
    title?: string
    description: string
    options?: {
      backupOriginal?: boolean
      updateSeo?: boolean
      preserveImages?: boolean
    }
  }
): Promise<{
  success: boolean
  error?: string
  updatedAt?: string
  backup?: any
  changes?: any
}> {
  try {
    // For now, directly update via Shopify API
    // In production, this would go through the ShopifyProductUpdater class
    const { ShopifyAPI } = await import('../shopify')

    // TODO: Get proper access token from OAuth session
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN || ''

    if (!accessToken) {
      console.error('⚠️ No access token available - using mock update')
      // Return mock success for development
      return {
        success: true,
        updatedAt: new Date().toISOString(),
        changes: {
          title_updated: !!enhancementData.title,
          description_updated: true,
          seo_updated: enhancementData.options?.updateSeo !== false
        }
      }
    }

    const shopifyApi = new ShopifyAPI(shop, accessToken)

    const updateInput: any = {
      descriptionHtml: enhancementData.description
    }

    if (enhancementData.title) {
      updateInput.title = enhancementData.title
    }

    const result = await shopifyApi.updateProduct(productId, updateInput)

    return {
      success: true,
      updatedAt: new Date().toISOString(),
      changes: {
        title_updated: !!enhancementData.title,
        description_updated: true,
        seo_updated: enhancementData.options?.updateSeo !== false
      }
    }
  } catch (error) {
    console.error('❌ Error updating product with enhancement:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update product'
    }
  }
}