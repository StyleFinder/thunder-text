import { shopifyGraphQL } from './shopify/client'

export interface ProductImage {
  id: string
  url: string
  altText?: string
}

export interface ProductVariant {
  id: string
  title: string
  price: string
  compareAtPrice?: string
  inventoryQuantity?: number
  weight?: number
  weightUnit?: string
}

export interface ProductData {
  id: string
  title: string
  description: string
  handle: string
  images: ProductImage[]
  variants: ProductVariant[]
  tags: string[]
  productType: string
  vendor: string
  collections: string[]
  metafields: Record<string, any>
  seo: {
    title?: string
    description?: string
  }
  status: string
  createdAt: string
  updatedAt: string
}

const PRODUCT_QUERY = `
  query getProduct($id: ID!) {
    product(id: $id) {
      id
      title
      description
      handle
      productType
      vendor
      tags
      status
      createdAt
      updatedAt
      seo {
        title
        description
      }
      images(first: 20) {
        edges {
          node {
            id
            url
            altText
          }
        }
      }
      variants(first: 50) {
        edges {
          node {
            id
            title
            price
            compareAtPrice
            inventoryQuantity
            weight
            weightUnit
          }
        }
      }
      collections(first: 10) {
        edges {
          node {
            title
            handle
          }
        }
      }
      metafields(first: 20) {
        edges {
          node {
            namespace
            key
            value
            type
          }
        }
      }
    }
  }
`

export async function importProductData(productId: string, shopDomain: string, accessToken: string): Promise<ProductData> {
  try {
    const response = await shopifyGraphQL(PRODUCT_QUERY, {
      id: productId
    }, shopDomain)

    if (!response.data?.product) {
      throw new Error('Product not found')
    }

    const product = response.data.product

    // Process metafields into a more usable format
    const metafields: Record<string, any> = {}
    product.metafields.edges.forEach(({ node }: any) => {
      const key = `${node.namespace}.${node.key}`
      metafields[key] = {
        value: node.value,
        type: node.type
      }
    })

    // Extract collection names
    const collections = product.collections.edges.map(({ node }: any) => node.title)

    const productData: ProductData = {
      id: product.id,
      title: product.title,
      description: product.description || '',
      handle: product.handle,
      images: product.images.edges.map(({ node }: any) => ({
        id: node.id,
        url: node.url,
        altText: node.altText
      })),
      variants: product.variants.edges.map(({ node }: any) => ({
        id: node.id,
        title: node.title,
        price: node.price,
        compareAtPrice: node.compareAtPrice,
        inventoryQuantity: node.inventoryQuantity,
        weight: node.weight,
        weightUnit: node.weightUnit
      })),
      tags: product.tags || [],
      productType: product.productType || '',
      vendor: product.vendor || '',
      collections,
      metafields,
      seo: {
        title: product.seo.title,
        description: product.seo.description
      },
      status: product.status,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    }

    return productData
  } catch (error) {
    console.error('Error importing product data:', error)
    throw new Error('Failed to import product data')
  }
}

// Helper function to detect product category from product data
export function detectProductCategory(productData: ProductData): string {
  const { productType, title, tags, collections } = productData
  
  // Category detection logic based on product data
  const categoryKeywords = {
    'Fashion & Apparel': ['clothing', 'shirt', 'dress', 'pants', 'jacket', 'sweater', 'fashion', 'apparel', 'top', 'bottom'],
    'Electronics & Gadgets': ['electronic', 'tech', 'gadget', 'phone', 'computer', 'tablet', 'device'],
    'Home & Garden': ['home', 'garden', 'furniture', 'decor', 'kitchen', 'bedroom', 'living'],
    'Health & Beauty': ['beauty', 'health', 'cosmetic', 'skincare', 'makeup', 'wellness'],
    'Sports & Outdoors': ['sport', 'outdoor', 'fitness', 'exercise', 'athletic', 'gym'],
    'Jewelry & Accessories': ['jewelry', 'accessory', 'necklace', 'bracelet', 'ring', 'earring', 'watch'],
    'Food & Beverages': ['food', 'beverage', 'drink', 'snack', 'organic', 'gourmet'],
    'Books & Media': ['book', 'media', 'magazine', 'dvd', 'cd', 'audio'],
    'Toys & Games': ['toy', 'game', 'kids', 'children', 'play', 'educational'],
    'Arts & Crafts': ['art', 'craft', 'creative', 'diy', 'paint', 'draw']
  }

  const searchText = [productType, title, ...tags, ...collections].join(' ').toLowerCase()

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => searchText.includes(keyword))) {
      return category
    }
  }

  return 'Other'
}

// Helper function to generate suggested keywords from product data
export function generateSuggestedKeywords(productData: ProductData): string[] {
  const keywords = new Set<string>()
  
  // Extract keywords from title
  const titleWords = productData.title.toLowerCase().split(/\s+/)
  titleWords.forEach(word => {
    if (word.length > 3 && !['the', 'and', 'for', 'with', 'from'].includes(word)) {
      keywords.add(word)
    }
  })

  // Add tags
  productData.tags.forEach(tag => keywords.add(tag.toLowerCase()))

  // Add product type
  if (productData.productType) {
    keywords.add(productData.productType.toLowerCase())
  }

  // Add vendor if it's not too generic
  if (productData.vendor && productData.vendor.length > 2) {
    keywords.add(productData.vendor.toLowerCase())
  }

  // Add collection names
  productData.collections.forEach(collection => {
    keywords.add(collection.toLowerCase())
  })

  return Array.from(keywords).slice(0, 10) // Limit to 10 keywords
}

// Helper function to analyze existing description for improvement areas
export function analyzeExistingDescription(description: string): {
  hasDescription: boolean
  length: number
  hasBulletPoints: boolean
  hasKeywords: boolean
  suggestions: string[]
} {
  const suggestions: string[] = []
  
  const hasDescription = description.trim().length > 0
  const length = description.length
  const hasBulletPoints = /[•\-\*]/.test(description) || description.includes('<li>')
  const hasKeywords = description.split(' ').length > 10

  if (!hasDescription) {
    suggestions.push('No existing description - perfect for AI generation')
  } else if (length < 100) {
    suggestions.push('Current description is quite short - could be expanded')
  } else if (length > 500) {
    suggestions.push('Current description is long - consider summarizing key points')
  }

  if (!hasBulletPoints && hasDescription) {
    suggestions.push('Consider adding bullet points for key features')
  }

  if (!hasKeywords && hasDescription) {
    suggestions.push('Description could benefit from more descriptive keywords')
  }

  return {
    hasDescription,
    length,
    hasBulletPoints,
    hasKeywords,
    suggestions
  }
}