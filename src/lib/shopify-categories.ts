// Shopify standardized product categories using the 2025-01 taxonomy IDs
// Based on Shopify's Standard Product Taxonomy: https://shopify.github.io/product-taxonomy/

export const SHOPIFY_CATEGORY_MAPPING = {
  'Clothing > Tops': 'gid://shopify/TaxonomyCategory/aa-2-1-1', // Apparel > Clothing > Tops
  'Clothing > Bottoms': 'gid://shopify/TaxonomyCategory/aa-2-1-2', // Apparel > Clothing > Bottoms  
  'Clothing > Dresses': 'gid://shopify/TaxonomyCategory/aa-2-1-3', // Apparel > Clothing > Dresses
  'Clothing > Outerwear': 'gid://shopify/TaxonomyCategory/aa-2-1-4', // Apparel > Clothing > Outerwear
  'Shoes': 'gid://shopify/TaxonomyCategory/aa-2-2', // Apparel > Shoes
  'Accessories': 'gid://shopify/TaxonomyCategory/aa-2-3', // Apparel > Accessories
  'Jewelry': 'gid://shopify/TaxonomyCategory/aa-2-3-1', // Apparel > Accessories > Jewelry
  'Home & Garden': 'gid://shopify/TaxonomyCategory/hg-1', // Home & Garden
  'Fashion & Apparel': 'gid://shopify/TaxonomyCategory/aa-2' // General Apparel category
} as const

/**
 * Maps an inferred category to a Shopify product category ID
 * Returns the appropriate Shopify taxonomy category ID for the category dropdown
 */
export function mapToShopifyCategory(inferredCategory: string): string | null {
  console.log('🎯 Category mapping called with:', inferredCategory)
  
  // Note: Shopify taxonomy IDs change frequently and are store-specific
  // For now, we'll let the productType field handle categorization
  // The productType field (like "Tops") is more reliable and visible in admin
  console.log('🎯 Using productType field for categorization instead of taxonomy IDs')
  return null
  
  // First try exact match
  const categoryId = SHOPIFY_CATEGORY_MAPPING[inferredCategory as keyof typeof SHOPIFY_CATEGORY_MAPPING]
  
  if (categoryId) {
    console.log('🎯 Mapped to Shopify category ID:', categoryId)
    return categoryId
  }
  
  // Try to map individual categories to clothing paths
  const lowerCategory = inferredCategory.toLowerCase()
  let mappedCategory = null
  
  if (lowerCategory === 'tops') {
    mappedCategory = SHOPIFY_CATEGORY_MAPPING['Clothing > Tops']
  } else if (lowerCategory === 'dresses') {
    mappedCategory = SHOPIFY_CATEGORY_MAPPING['Clothing > Dresses']
  } else if (lowerCategory === 'pants' || lowerCategory === 'jeans') {
    mappedCategory = SHOPIFY_CATEGORY_MAPPING['Clothing > Bottoms']
  } else if (lowerCategory === 'jackets' || lowerCategory === 'sweaters') {
    mappedCategory = SHOPIFY_CATEGORY_MAPPING['Clothing > Outerwear']
  } else if (lowerCategory === 'shoes') {
    mappedCategory = SHOPIFY_CATEGORY_MAPPING['Shoes']
  } else if (lowerCategory === 'jewelry') {
    mappedCategory = SHOPIFY_CATEGORY_MAPPING['Jewelry']
  } else if (lowerCategory === 'accessories') {
    mappedCategory = SHOPIFY_CATEGORY_MAPPING['Accessories']
  }
  
  if (mappedCategory) {
    console.log('🎯 Mapped individual category to Shopify ID:', mappedCategory)
    return mappedCategory
  }
  
  // Fallback to general apparel category for clothing-related items
  if (lowerCategory.includes('clothing') || 
      lowerCategory.includes('apparel') ||
      lowerCategory.includes('fashion')) {
    const fallbackId = SHOPIFY_CATEGORY_MAPPING['Fashion & Apparel']
    console.log('🎯 Using fallback apparel category:', fallbackId)
    return fallbackId
  }
  
  console.log('🎯 No category mapping found, returning null')
  return null
}

/**
 * Gets a human-readable category name from the mapping
 */
export function getCategoryDisplayName(inferredCategory: string): string {
  // Check if we have a direct mapping
  if (SHOPIFY_CATEGORY_MAPPING[inferredCategory as keyof typeof SHOPIFY_CATEGORY_MAPPING]) {
    return inferredCategory
  }
  
  // Return the inferred category as-is if no mapping found
  return inferredCategory
}