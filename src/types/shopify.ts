/**
 * Shopify API Type Definitions
 * Provides type safety for Shopify API responses and data structures
 */

export interface ShopifyProduct {
  id: string
  title: string
  handle: string
  description?: string
  descriptionHtml?: string
  status?: string
  vendor?: string
  productType?: string
  tags?: string[]
  images?: ShopifyImage[]
  variants?: ShopifyVariant[]
  metafields?: ShopifyMetafield[]
  options?: ShopifyProductOption[]
  category?: ShopifyCategory
  created_time?: string
  updated_time?: string
}

export interface ShopifyImage {
  id: string
  url: string
  altText?: string | null
  src?: string
}

export interface ShopifyVariant {
  id: string
  title: string
  price: string
  inventoryQuantity?: number
  availableForSale?: boolean
  selectedOptions?: ShopifySelectedOption[]
}

export interface ShopifySelectedOption {
  name: string
  value: string
}

export interface ShopifyMetafield {
  id: string
  key: string
  value: string
  namespace: string
  type?: string
}

export interface ShopifyProductOption {
  id: string
  name: string
  position: number
  values: string[]
}

export interface ShopifyCategory {
  id: string
  fullName: string
}

export interface ShopifyUserError {
  field: string[]
  message: string
}

export interface ShopifyProductInput {
  id?: string
  title: string
  status?: string
  productType?: string
  vendor?: string
  tags?: string[]
  descriptionHtml?: string
  description?: string
  variants?: ShopifyVariantInput[]
}

export interface ShopifyVariantInput {
  title?: string
  price?: string
  optionValues?: Array<{
    optionName: string
    name: string
  }>
  inventoryQuantity?: number
}

export interface ShopifyMetafieldInput {
  namespace: string
  key: string
  value: string
  type: string
}

export interface ShopifyProductResponse {
  productCreate?: {
    product: ShopifyProduct | null
    userErrors: ShopifyUserError[]
  }
  productUpdate?: {
    product: ShopifyProduct | null
    userErrors: ShopifyUserError[]
  }
}

export interface ShopifyMediaUploadTarget {
  url: string
  resourceUrl: string
  parameters: Array<{
    name: string
    value: string
  }>
}

export interface ShopifyMediaImage {
  id: string
  alt: string
  status: string
  mediaContentType?: string
  image?: {
    url: string
    altText?: string
  }
  fileStatus?: string
  fileErrors?: Array<{
    code: string
    details: string
    message: string
  }>
}

export interface ShopifyProductCreateMediaResponse {
  productCreateMedia: {
    media: ShopifyMediaImage[]
    mediaUserErrors?: ShopifyUserError[]
  }
}

export interface ShopifyGraphQLResponse<T> {
  data: T
  extensions?: {
    cost: {
      requestedQueryCost: number
      actualQueryCost: number
      throttleStatus: {
        maximumAvailable: number
        currentlyAvailable: number
        restoreRate: number
      }
    }
  }
}

export interface ShopifyPageInfo {
  hasNextPage: boolean
  endCursor: string | null
}

export interface ShopifyEdge<T> {
  node: T
  cursor: string
}

export interface ShopifyConnection<T> {
  edges: Array<ShopifyEdge<T>>
  pageInfo: ShopifyPageInfo
}
