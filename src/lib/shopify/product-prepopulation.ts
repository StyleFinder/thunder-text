import { shopifyGraphQL } from './client'

export interface PrePopulatedProductData {
  id: string
  title: string
  handle: string
  images: Array<{
    url: string
    altText?: string
    width?: number
    height?: number
  }>
  category: {
    primary?: string
    collections?: string[]
  }
  variants: Array<{
    id: string
    title: string
    price: string
    sku?: string
    weight?: number
    dimensions?: {
      length?: number
      width?: number
      height?: number
    }
  }>
  materials: {
    fabric?: string
    composition?: string[]
    careInstructions?: string[]
  }
  metafields: {
    sizing?: any
    specifications?: any
    features?: any
  }
  vendor: string
  productType: string
  tags: string[]
  existingDescription?: string
  seoTitle?: string
  seoDescription?: string
}

export async function fetchProductDataForPrePopulation(
  productId: string,
  shop: string
): Promise<PrePopulatedProductData | null> {
  try {
    console.log('🔍 Fetching comprehensive product data for:', productId)
    
    // Use Shopify Admin API to fetch comprehensive product data
    const productData = await fetchShopifyProduct(productId, shop)
    
    if (!productData) {
      console.error('❌ No product data returned from Shopify')
      return null
    }

    const processedData: PrePopulatedProductData = {
      id: productData.id,
      title: productData.title,
      handle: productData.handle,
      images: productData.images.edges.map(({ node }: any) => ({
        url: node.url,
        altText: node.altText,
        width: node.width,
        height: node.height,
      })),
      category: {
        primary: extractPrimaryCategory(productData),
        collections: productData.collections.edges.map(({ node }: any) => node.title),
      },
      variants: productData.variants.edges.map(({ node }: any) => ({
        id: node.id,
        title: node.title,
        price: node.price,
        sku: node.sku,
        weight: node.weight,
        dimensions: extractDimensions(node.metafields),
      })),
      materials: extractMaterials(productData.metafields),
      metafields: {
        sizing: extractSizingInfo(productData.metafields),
        specifications: extractSpecifications(productData.metafields),
        features: extractFeatures(productData.metafields),
      },
      vendor: productData.vendor,
      productType: productData.productType,
      tags: productData.tags,
      existingDescription: productData.descriptionHtml,
      seoTitle: productData.seo?.title,
      seoDescription: productData.seo?.description,
    }

    console.log('✅ Product data successfully processed:', {
      title: processedData.title,
      imageCount: processedData.images.length,
      variantCount: processedData.variants.length,
      collectionCount: processedData.category.collections?.length || 0,
      category: processedData.category.primary,
    })

    return processedData
  } catch (error) {
    console.error('❌ Failed to fetch product data for pre-population:', error)
    return null
  }
}

async function fetchShopifyProduct(productId: string, shop: string) {
  // Ensure productId is in the correct GraphQL format
  let formattedProductId = productId

  // Handle different ID formats
  if (!productId.startsWith('gid://')) {
    // If it's just a numeric ID, convert to GraphQL format
    formattedProductId = `gid://shopify/Product/${productId}`
    console.log('📝 Converted numeric ID to GraphQL format:', {
      original: productId,
      formatted: formattedProductId
    })
  } else {
    console.log('✅ Product ID already in GraphQL format:', formattedProductId)
  }

  // Check if we're in demo/development mode and should return mock data
  const authBypass = process.env.SHOPIFY_AUTH_BYPASS === 'true'
  const hasRealToken = process.env.SHOPIFY_ACCESS_TOKEN &&
                      process.env.SHOPIFY_ACCESS_TOKEN !== 'placeholder-token'

  if (authBypass && !hasRealToken) {
    console.log('🧪 Using mock product data for enhancement (demo mode)')

    // Return mock product data matching the requested ID
    const mockProducts: Record<string, any> = {
      'gid://shopify/Product/8123456789': {
        id: 'gid://shopify/Product/8123456789',
        title: 'Effortless Elegance: Wrinkle-Resistant Tops',
        handle: 'effortless-elegance-wrinkle-resistant-tops',
        description: 'Step into a world of effortless elegance with these wrinkle-resistant tops.',
        descriptionHtml: '<p>Step into a world of effortless elegance with these wrinkle-resistant tops.</p>',
        vendor: 'Fashion Forward',
        productType: 'Tops',
        tags: ['wrinkle-resistant tops', 'women\'s fashion', 'professional', 'easy-care'],
        seo: {
          title: 'Wrinkle-Resistant Tops | Effortless Elegance',
          description: 'Professional wrinkle-resistant tops for the modern woman'
        },
        images: { edges: [
          { node: { url: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800', altText: 'Elegant top', width: 800, height: 1000 }}
        ]},
        variants: { edges: [
          { node: { id: 'gid://shopify/ProductVariant/1', title: 'Small', price: '49.99', sku: 'WRT-S-001', weight: 0.2 }}
        ]},
        collections: { edges: [
          { node: { id: 'gid://shopify/Collection/1', title: 'Women\'s Fashion', handle: 'womens-fashion' }}
        ]},
        metafields: { edges: [] }
      },
      'gid://shopify/Product/8123456790': {
        id: 'gid://shopify/Product/8123456790',
        title: 'Premium Cotton Casual Shirt',
        handle: 'premium-cotton-casual-shirt',
        description: 'Comfortable and stylish casual shirt made from 100% premium cotton.',
        descriptionHtml: '<p>Comfortable and stylish casual shirt made from 100% premium cotton.</p>',
        vendor: 'Cotton Comfort',
        productType: 'Shirts',
        tags: ['cotton shirt', 'casual wear', 'comfortable', 'breathable'],
        seo: {
          title: 'Premium Cotton Casual Shirt',
          description: 'Comfortable cotton shirt for everyday wear'
        },
        images: { edges: [
          { node: { url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800', altText: 'Cotton shirt', width: 800, height: 1000 }}
        ]},
        variants: { edges: [
          { node: { id: 'gid://shopify/ProductVariant/2', title: 'Medium', price: '39.99', sku: 'PCS-M-001', weight: 0.25 }}
        ]},
        collections: { edges: [
          { node: { id: 'gid://shopify/Collection/2', title: 'Casual Wear', handle: 'casual-wear' }}
        ]},
        metafields: { edges: [] }
      }
    }

    // Return matching mock product or error if not found
    const mockProduct = mockProducts[formattedProductId]

    if (!mockProduct) {
      console.error('❌ Product not found in mock data:', formattedProductId)
      console.error('📝 Available mock products:', Object.keys(mockProducts))
      throw new Error(`Product ${formattedProductId} not found. In demo mode, only specific test products are available. Please use a real Shopify connection for production testing.`)
    }

    console.log('📦 Returning mock product:', mockProduct.title)
    return mockProduct
  }

  const query = `
    query GetProduct($id: ID!) {
      product(id: $id) {
        id
        title
        handle
        description
        descriptionHtml
        vendor
        productType
        tags
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
              width
              height
            }
          }
        }
        variants(first: 50) {
          edges {
            node {
              id
              title
              price
              sku
              weight
              weightUnit
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
        }
        collections(first: 10) {
          edges {
            node {
              id
              title
              handle
            }
          }
        }
        metafields(first: 50) {
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

  console.log('🔍 Executing GraphQL query for product:', formattedProductId)

  try {
    // Use authenticated Shopify GraphQL client
    const response = await shopifyGraphQL(query, { id: formattedProductId }, shop)

    console.log('📦 GraphQL response received:', {
      hasData: !!response?.data,
      hasProduct: !!response?.data?.product,
      productId: response?.data?.product?.id
    })

    if (!response?.data || !response.data.product) {
      console.error('❌ No product found with ID:', formattedProductId)
      console.error('📝 Response structure:', JSON.stringify(response, null, 2))
      return null
    }

    console.log('✅ Product found:', response.data.product.title)
    return response.data.product
  } catch (error) {
    console.error('❌ Error fetching product from Shopify:', error)
    console.error('📝 Query details:', {
      productId: formattedProductId,
      shop
    })
    throw error
  }
}

function extractPrimaryCategory(productData: any): string {
  // Priority order for category detection:
  // 1. First collection title
  // 2. Product type
  // 3. Vendor as fallback
  // 4. Default to 'general'

  if (productData.collections.edges.length > 0) {
    const primaryCollection = productData.collections.edges[0].node.title
    console.log('🏷️ Using collection as primary category:', primaryCollection)
    return primaryCollection
  }

  if (productData.productType) {
    console.log('🏷️ Using product type as primary category:', productData.productType)
    return productData.productType
  }

  if (productData.vendor) {
    console.log('🏷️ Using vendor as primary category:', productData.vendor)
    return productData.vendor
  }

  console.log('🏷️ No specific category found, using general')
  return 'general'
}

function extractDimensions(metafields: any): { length?: number; width?: number; height?: number } {
  const dimensions: { length?: number; width?: number; height?: number } = {}
  
  if (!metafields || !metafields.edges) return dimensions

  metafields.edges.forEach(({ node }: any) => {
    const { namespace, key, value } = node
    
    if (namespace === 'custom' || namespace === 'product') {
      switch (key.toLowerCase()) {
        case 'length':
        case 'dimension_length':
          dimensions.length = parseFloat(value) || undefined
          break
        case 'width':
        case 'dimension_width':
          dimensions.width = parseFloat(value) || undefined
          break
        case 'height':
        case 'dimension_height':
          dimensions.height = parseFloat(value) || undefined
          break
      }
    }
  })

  return dimensions
}

function extractMaterials(metafields: any): { fabric?: string; composition?: string[]; careInstructions?: string[] } {
  const materials: { fabric?: string; composition?: string[]; careInstructions?: string[] } = {}
  
  if (!metafields || !metafields.edges) return materials

  metafields.edges.forEach(({ node }: any) => {
    const { namespace, key, value } = node
    
    if (namespace === 'custom' || namespace === 'product') {
      switch (key.toLowerCase()) {
        case 'fabric':
        case 'material':
        case 'fabric_content':
          materials.fabric = value
          break
        case 'composition':
        case 'fabric_composition':
          try {
            materials.composition = JSON.parse(value)
          } catch {
            materials.composition = value.split(',').map((item: string) => item.trim())
          }
          break
        case 'care_instructions':
        case 'care':
          try {
            materials.careInstructions = JSON.parse(value)
          } catch {
            materials.careInstructions = value.split(',').map((item: string) => item.trim())
          }
          break
      }
    }
  })

  return materials
}

function extractSizingInfo(metafields: any): any {
  if (!metafields || !metafields.edges) return null

  const sizingInfo: any = {}

  metafields.edges.forEach(({ node }: any) => {
    const { namespace, key, value } = node
    
    if (namespace === 'custom' || namespace === 'product') {
      switch (key.toLowerCase()) {
        case 'size_chart':
        case 'sizing':
        case 'sizes':
        case 'size_range':
          try {
            sizingInfo[key] = JSON.parse(value)
          } catch {
            sizingInfo[key] = value
          }
          break
      }
    }
  })

  return Object.keys(sizingInfo).length > 0 ? sizingInfo : null
}

function extractSpecifications(metafields: any): any {
  if (!metafields || !metafields.edges) return null

  const specifications: any = {}

  metafields.edges.forEach(({ node }: any) => {
    const { namespace, key, value } = node
    
    if (namespace === 'custom' || namespace === 'product' || namespace === 'specifications') {
      // Include various specification-related fields
      if (key.toLowerCase().includes('spec') || 
          key.toLowerCase().includes('feature') || 
          key.toLowerCase().includes('detail') ||
          namespace === 'specifications') {
        try {
          specifications[key] = JSON.parse(value)
        } catch {
          specifications[key] = value
        }
      }
    }
  })

  return Object.keys(specifications).length > 0 ? specifications : null
}

function extractFeatures(metafields: any): any {
  if (!metafields || !metafields.edges) return null

  const features: any = {}

  metafields.edges.forEach(({ node }: any) => {
    const { namespace, key, value } = node
    
    if (namespace === 'custom' || namespace === 'product') {
      switch (key.toLowerCase()) {
        case 'features':
        case 'key_features':
        case 'highlights':
        case 'benefits':
          try {
            features[key] = JSON.parse(value)
          } catch {
            features[key] = value.split(',').map((item: string) => item.trim())
          }
          break
      }
    }
  })

  return Object.keys(features).length > 0 ? features : null
}

export function formatKeyFeatures(data: PrePopulatedProductData): string {
  const features: string[] = []

  // Extract features from various sources
  if (data.metafields.features) {
    const metafieldFeatures = data.metafields.features
    Object.values(metafieldFeatures).forEach((value: any) => {
      if (Array.isArray(value)) {
        features.push(...value)
      } else if (typeof value === 'string') {
        features.push(value)
      }
    })
  }

  // Add material information as features
  if (data.materials.fabric) {
    features.push(`Made from ${data.materials.fabric}`)
  }

  // Add sizing information as features
  if (data.metafields.sizing) {
    const sizingInfo = data.metafields.sizing
    Object.entries(sizingInfo).forEach(([key, value]) => {
      if (typeof value === 'string') {
        features.push(`Available in ${value}`)
      }
    })
  }

  // Add collection-based features
  if (data.category.collections && data.category.collections.length > 0) {
    const primaryCollection = data.category.collections[0]
    if (primaryCollection !== data.category.primary) {
      features.push(`Part of ${primaryCollection} collection`)
    }
  }

  return features.join(', ')
}

export function formatSizingData(sizingData: any): string {
  if (!sizingData) return ''

  // Convert sizing data to a readable format
  const sizingStrings: string[] = []

  Object.entries(sizingData).forEach(([key, value]) => {
    if (typeof value === 'string') {
      sizingStrings.push(value)
    } else if (Array.isArray(value)) {
      sizingStrings.push(value.join(', '))
    }
  })

  return sizingStrings.join(' | ')
}

export function extractKeyFeaturesFromData(data: PrePopulatedProductData): string {
  return formatKeyFeatures(data)
}