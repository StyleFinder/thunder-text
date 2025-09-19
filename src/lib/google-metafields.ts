// Google Shopping Metafields Implementation
// Based on Google Shopping requirements and Shopify metafield structure

export interface GoogleProductMetafields {
  google_product_category: string
  gender?: 'male' | 'female' | 'unisex'
  age_group?: 'newborn' | 'infant' | 'toddler' | 'kids' | 'adult'
  material?: string
  condition: 'new' | 'refurbished' | 'used'
  product_highlights?: string[]
  color?: string
  size_type?: 'regular' | 'petite' | 'plus' | 'big_and_tall' | 'maternity'
  pattern?: string
}

export interface GoogleVariantMetafields {
  google_color?: string
  google_size?: string
  google_material?: string
}

// Google Shopping Category Mapping
// Maps common product categories to Google Shopping categories
export const GOOGLE_CATEGORY_MAPPING: Record<string, string> = {
  'Fashion & Apparel': 'Apparel & Accessories',
  'Clothing': 'Apparel & Accessories > Clothing',
  'Clothing > Tops': 'Apparel & Accessories > Clothing > Tops',
  'Clothing > Sweaters': 'Apparel & Accessories > Clothing > Tops > Sweaters',
  'Clothing > Shirts': 'Apparel & Accessories > Clothing > Tops > Shirts & Tops',
  'Clothing > T-Shirts': 'Apparel & Accessories > Clothing > Tops > Shirts & Tops',
  'Clothing > Dresses': 'Apparel & Accessories > Clothing > Dresses',
  'Clothing > Pants': 'Apparel & Accessories > Clothing > Pants',
  'Clothing > Jeans': 'Apparel & Accessories > Clothing > Pants',
  'Clothing > Outerwear': 'Apparel & Accessories > Clothing > Outerwear',
  'Shoes': 'Apparel & Accessories > Shoes',
  'Accessories': 'Apparel & Accessories > Accessories',
  'Jewelry': 'Apparel & Accessories > Jewelry',
  'Home & Garden': 'Home & Garden',
  'Electronics': 'Electronics',
  'Sports & Outdoors': 'Sporting Goods',
  'Health & Beauty': 'Health & Beauty',
  'Books': 'Media > Books',
  'Toys': 'Toys & Games'
}

// Generate Google Shopping metafields for products
export function generateGoogleProductMetafields(
  category: string,
  productType?: string,
  description?: string,
  additionalData?: Partial<GoogleProductMetafields>
): Array<{
  namespace: string
  key: string
  value: string
  type: string
}> {
  const metafields = []

  // Google Product Category (required)
  const googleCategory = GOOGLE_CATEGORY_MAPPING[category] || 'Apparel & Accessories'
  metafields.push({
    namespace: 'google',
    key: 'google_product_category',
    value: googleCategory,
    type: 'single_line_text_field'
  })

  // Condition (required - default to new)
  metafields.push({
    namespace: 'google',
    key: 'condition',
    value: additionalData?.condition || 'new',
    type: 'single_line_text_field'
  })

  // Gender (inferred from category/description/keywords)
  const keywords = additionalData?.product_highlights || []
  const gender = inferGender(category, productType, description, keywords) || additionalData?.gender
  if (gender) {
    metafields.push({
      namespace: 'google',
      key: 'gender',
      value: gender,
      type: 'single_line_text_field'
    })
  }

  // Age Group (inferred from category/description)
  const ageGroup = inferAgeGroup(category, productType, description) || additionalData?.age_group
  if (ageGroup) {
    metafields.push({
      namespace: 'google',
      key: 'age_group',
      value: ageGroup,
      type: 'single_line_text_field'
    })
  }

  // Material (inferred from description)
  const material = inferMaterial(description) || additionalData?.material
  if (material) {
    metafields.push({
      namespace: 'google',
      key: 'material',
      value: material,
      type: 'single_line_text_field'
    })
  }

  // Size Type (inferred from category)
  const sizeType = inferSizeType(category) || additionalData?.size_type
  if (sizeType) {
    metafields.push({
      namespace: 'google',
      key: 'size_type',
      value: sizeType,
      type: 'single_line_text_field'
    })
  }

  // Pattern (inferred from description)
  const pattern = inferPattern(description) || additionalData?.pattern
  if (pattern) {
    metafields.push({
      namespace: 'google',
      key: 'pattern',
      value: pattern,
      type: 'single_line_text_field'
    })
  }

  // Product Highlights (from additional data)
  if (additionalData?.product_highlights && additionalData.product_highlights.length > 0) {
    metafields.push({
      namespace: 'google',
      key: 'product_highlights',
      value: JSON.stringify(additionalData.product_highlights),
      type: 'list.single_line_text_field'
    })
  }

  return metafields
}

// Generate Google Shopping metafields for variants
export function generateGoogleVariantMetafields(
  variantTitle: string,
  color?: string,
  size?: string,
  material?: string
): Array<{
  namespace: string
  key: string
  value: string
  type: string
}> {
  const metafields = []

  // Extract color from variant title if not provided
  const variantColor = color || extractColorFromVariantTitle(variantTitle)
  if (variantColor) {
    metafields.push({
      namespace: 'google',
      key: 'google_color',
      value: variantColor,
      type: 'single_line_text_field'
    })
  }

  // Extract size from variant title if not provided
  const variantSize = size || extractSizeFromVariantTitle(variantTitle)
  if (variantSize) {
    metafields.push({
      namespace: 'google',
      key: 'google_size',
      value: variantSize,
      type: 'single_line_text_field'
    })
  }

  // Material for variant
  if (material) {
    metafields.push({
      namespace: 'google',
      key: 'google_material',
      value: material,
      type: 'single_line_text_field'
    })
  }

  return metafields
}

// Helper functions for inference
function inferGender(category: string, productType?: string, description?: string, keywords?: string[]): 'male' | 'female' | 'unisex' | null {
  // Combine all text sources for analysis
  const allText = [
    category || '',
    productType || '',
    description || '',
    (keywords || []).join(' ')
  ].join(' ').toLowerCase()
  
  console.log('🔍 Gender detection analyzing:', allText.substring(0, 200) + '...')
  
  // Female indicators (more comprehensive)
  const femaleKeywords = [
    'women', 'womens', "women's", 'ladies', 'female', 'feminine', 
    'dress', 'dresses', 'skirt', 'skirts', 'blouse', 'blouses',
    'bra', 'lingerie', 'maternity', 'pregnancy', 'girl', 'girls',
    'she', 'her', 'woman', 'lady', 'gal', 'chic', 'elegant'
  ]
  
  // Male indicators
  const maleKeywords = [
    'men', 'mens', "men's", 'male', 'masculine', 'gentleman', 
    'gentlemen', 'boy', 'boys', 'guy', 'guys', 'he', 'him', 
    'man', 'dude', 'rugged', 'beard'
  ]
  
  // Unisex indicators
  const unisexKeywords = [
    'unisex', 'gender neutral', 'gender-neutral', 'everyone', 
    'all genders', 'universal'
  ]
  
  // Check for female indicators
  const femaleMatches = femaleKeywords.filter(keyword => allText.includes(keyword))
  if (femaleMatches.length > 0) {
    console.log('✅ Female detected from keywords:', femaleMatches)
    return 'female'
  }
  
  // Check for male indicators
  const maleMatches = maleKeywords.filter(keyword => allText.includes(keyword))
  if (maleMatches.length > 0) {
    console.log('✅ Male detected from keywords:', maleMatches)
    return 'male'
  }
  
  // Check for unisex indicators
  const unisexMatches = unisexKeywords.filter(keyword => allText.includes(keyword))
  if (unisexMatches.length > 0) {
    console.log('✅ Unisex detected from keywords:', unisexMatches)
    return 'unisex'
  }
  
  // Default to unisex for ambiguous items
  console.log('⚠️ No gender indicators found, defaulting to unisex')
  return 'unisex'
}

function inferAgeGroup(category: string, productType?: string, description?: string): string | null {
  const text = `${category} ${productType || ''} ${description || ''}`.toLowerCase()
  
  if (text.includes('baby') || text.includes('newborn')) {
    return 'newborn'
  }
  
  if (text.includes('infant') || text.includes('0-2')) {
    return 'infant'
  }
  
  if (text.includes('toddler') || text.includes('2t') || text.includes('3t') || text.includes('4t')) {
    return 'toddler'
  }
  
  if (text.includes('kids') || text.includes('children') || text.includes('youth')) {
    return 'kids'
  }
  
  return 'adult' // Default to adult
}

function inferMaterial(description?: string): string | null {
  if (!description) return null
  
  const text = description.toLowerCase()
  console.log('🧵 Inferring material from text:', text.substring(0, 100) + '...')
  
  // Comprehensive list of materials including blends and common fabrics
  const materials = [
    // Natural fibers
    'cotton', 'organic cotton', 'pima cotton', 'supima cotton',
    'wool', 'merino wool', 'alpaca', 'cashmere', 'mohair',
    'silk', 'mulberry silk', 'linen', 'hemp', 'jute', 'bamboo',
    
    // Synthetic fibers
    'polyester', 'nylon', 'acrylic', 'spandex', 'elastane', 'lycra',
    'rayon', 'viscose', 'modal', 'tencel', 'microfiber',
    
    // Specialty materials
    'leather', 'genuine leather', 'faux leather', 'suede', 'patent leather',
    'denim', 'canvas', 'corduroy', 'velvet', 'satin', 'chiffon',
    'georgette', 'crepe', 'tulle', 'mesh', 'lace',
    
    // Blends (common combinations)
    'cotton blend', 'polyester blend', 'cotton-polyester', 'poly-cotton',
    'cotton-spandex', 'cotton-elastane', 'wool blend', 'silk blend'
  ]
  
  // Sort by length (longest first) to match more specific materials first
  const sortedMaterials = materials.sort((a, b) => b.length - a.length)
  
  for (const material of sortedMaterials) {
    if (text.includes(material)) {
      console.log('✅ Material detected:', material)
      return material.charAt(0).toUpperCase() + material.slice(1)
    }
  }
  
  // Try to detect percentage-based fabric content (e.g., "95% cotton 5% spandex")
  const fabricMatch = text.match(/(\d+%?\s*(?:cotton|polyester|wool|silk|linen|spandex|elastane|nylon|acrylic|rayon|viscose|modal|bamboo|hemp))/i)
  if (fabricMatch) {
    const fabric = fabricMatch[1].replace(/^\d+%?\s*/, '') // Remove percentage
    console.log('✅ Material detected from percentage:', fabric)
    return fabric.charAt(0).toUpperCase() + fabric.slice(1)
  }
  
  console.log('⚠️ No material detected in description')
  return null
}

function inferSizeType(category: string): string | null {
  const text = category.toLowerCase()
  
  if (text.includes('plus') || text.includes('plus size')) {
    return 'plus'
  }
  
  if (text.includes('petite')) {
    return 'petite'
  }
  
  if (text.includes('maternity')) {
    return 'maternity'
  }
  
  if (text.includes('big') || text.includes('tall')) {
    return 'big_and_tall'
  }
  
  return 'regular'
}

function inferPattern(description?: string): string | null {
  if (!description) return null
  
  const text = description.toLowerCase()
  const patterns = [
    'solid', 'striped', 'plaid', 'floral', 'polka dot', 'geometric',
    'abstract', 'animal print', 'paisley', 'checkered', 'houndstooth'
  ]
  
  for (const pattern of patterns) {
    if (text.includes(pattern)) {
      return pattern.charAt(0).toUpperCase() + pattern.slice(1)
    }
  }
  
  return null
}

function extractColorFromVariantTitle(variantTitle: string): string | null {
  const colors = [
    'black', 'white', 'red', 'blue', 'green', 'yellow', 'orange', 'purple',
    'pink', 'brown', 'gray', 'grey', 'navy', 'maroon', 'teal', 'olive',
    'lime', 'aqua', 'silver', 'gold', 'beige', 'tan', 'burgundy',
    'coral', 'salmon', 'turquoise', 'violet', 'indigo', 'magenta'
  ]
  
  const title = variantTitle.toLowerCase()
  
  for (const color of colors) {
    if (title.includes(color)) {
      return color.charAt(0).toUpperCase() + color.slice(1)
    }
  }
  
  return null
}

function extractSizeFromVariantTitle(variantTitle: string): string | null {
  const sizes = ['xs', 's', 'm', 'l', 'xl', 'xxl', '3xl', '4xl', '5xl']
  const numericSizes = /\b(\d+)\b/g
  
  const title = variantTitle.toLowerCase()
  
  // Check for standard sizes
  for (const size of sizes) {
    if (title.includes(size)) {
      return size.toUpperCase()
    }
  }
  
  // Check for numeric sizes
  const numericMatch = title.match(numericSizes)
  if (numericMatch) {
    return numericMatch[0]
  }
  
  return null
}

// Validate Google Shopping metafields
export function validateGoogleMetafields(metafields: Array<{ namespace: string, key: string, value: string }>): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  
  const googleMetafields = metafields.filter(m => m.namespace === 'google')
  
  // Check for required fields
  const hasCategory = googleMetafields.some(m => m.key === 'google_product_category')
  const hasCondition = googleMetafields.some(m => m.key === 'condition')
  
  if (!hasCategory) {
    errors.push('google_product_category is required for Google Shopping')
  }
  
  if (!hasCondition) {
    errors.push('condition is required for Google Shopping')
  }
  
  // Check for recommended fields
  const hasGender = googleMetafields.some(m => m.key === 'gender')
  const hasAgeGroup = googleMetafields.some(m => m.key === 'age_group')
  
  if (!hasGender) {
    warnings.push('gender is recommended for better Google Shopping performance')
  }
  
  if (!hasAgeGroup) {
    warnings.push('age_group is recommended for better Google Shopping performance')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}