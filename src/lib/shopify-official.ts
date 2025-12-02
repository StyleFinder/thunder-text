import { createAdminApiClient, type AdminApiClient } from '@shopify/admin-api-client'
import type {
  ShopifyProductInput,
  ShopifyMetafieldInput,
  ShopifyVariantInput,
  ShopifyMediaUploadTarget,
  ShopifyMediaImage,
  ShopifyProductCreateMediaResponse
} from '@/types/shopify'
import { logger } from '@/lib/logger'

export class ShopifyOfficialAPI {
  private shop: string
  private accessToken: string
  public client: AdminApiClient

  constructor(shop: string, accessToken: string) {
    this.shop = shop
    this.accessToken = accessToken
    this.client = createAdminApiClient({
      storeDomain: shop,
      accessToken: accessToken,
      apiVersion: '2025-01',
    })
  }

  async createProduct(productData: ShopifyProductInput) {
    try {
      const mutation = `
        mutation productCreate($input: ProductInput!) {
          productCreate(input: $input) {
            product {
              id
              title
              handle
              status
              description
              vendor
              productType
              category {
                id
                fullName
              }
              tags
              options {
                id
                name
                position
                values
              }
              variants(first: 50) {
                edges {
                  node {
                    id
                    title
                    selectedOptions {
                      name
                      value
                    }
                    price
                    availableForSale
                  }
                }
              }
              images(first: 10) {
                edges {
                  node {
                    id
                    url
                    altText
                  }
                }
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `

      const response = await this.client.request(mutation, {
        variables: { input: productData }
      })

      return response

    } catch (error) {
      logger.error('Error creating product with official Admin API client', error as Error, { component: 'shopify-official', operation: 'createProduct', shop: this.shop })
      throw error
    }
  }

  // CORRECTED GraphQL Media Upload - Using recommended productUpdate approach
  async createProductImage(productId: string, imageData: string | { data?: string; src?: string; dataURL?: string; dataUrl?: string; url?: string; base64?: string }, altText?: string) {
    try {
      // Handle different imageData formats
      let base64Data: string
      let mimeType: string

      if (typeof imageData === 'string') {
        // Handle base64 data URL format
        const matches = imageData.match(/^data:([^;]+);base64,(.+)$/)
        if (!matches) {
          throw new Error('Invalid base64 data URL format')
        }
        mimeType = matches[1]
        base64Data = matches[2]
      } else if (imageData && typeof imageData === 'object') {
        // Handle object format from frontend - try different property patterns
        let dataString: string | null = null

        // Try common object patterns
        if (imageData.data && typeof imageData.data === 'string') {
          dataString = imageData.data
        } else if (imageData.src && typeof imageData.src === 'string') {
          dataString = imageData.src
        } else if (imageData.dataURL && typeof imageData.dataURL === 'string') {
          dataString = imageData.dataURL
        } else if (imageData.dataUrl && typeof imageData.dataUrl === 'string') {
          dataString = imageData.dataUrl
        } else if (imageData.url && typeof imageData.url === 'string') {
          dataString = imageData.url
        } else if (imageData.base64 && typeof imageData.base64 === 'string') {
          dataString = imageData.base64
        } else {
          // If no known property found, throw error with object structure info
          throw new Error(`Invalid imageData object format - available properties: ${Object.keys(imageData).join(', ')}`)
        }

        // Parse the data string
        const matches = dataString.match(/^data:([^;]+);base64,(.+)$/)
        if (!matches) {
          throw new Error(`Invalid base64 data URL format in object property: ${dataString.substring(0, 50)}...`)
        }
        mimeType = matches[1]
        base64Data = matches[2]
      } else {
        throw new Error('Invalid imageData format - must be string or object with data property')
      }

      if (!mimeType.startsWith('image/')) {
        throw new Error(`Invalid media type: ${mimeType}. Only image formats are supported.`)
      }

      const extension = mimeType.split('/')[1] || 'jpg'
      const filename = `product-image-${Date.now()}.${extension}`

      // Step 1: Create staged upload using IMAGE resource (for compatibility)
      const stagedUploadInput = {
        filename,
        mimeType,
        resource: 'IMAGE',  // Use IMAGE resource for better compatibility
        httpMethod: 'POST'
      }
      
      const stagedUploadMutation = `
        mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
          stagedUploadsCreate(input: $input) {
            stagedTargets {
              url
              resourceUrl
              parameters {
                name
                value
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `

      const stagedUploadResponse = await this.client.request(stagedUploadMutation, {
        variables: {
          input: [stagedUploadInput]
        }
      })

      const stagedUploadData = stagedUploadResponse.data.stagedUploadsCreate

      if (stagedUploadData.userErrors?.length > 0) {
        logger.error('Staged upload creation failed', undefined, { userErrors: stagedUploadData.userErrors, component: 'shopify-official', operation: 'createProductImage' })
        throw new Error(`Staged upload failed: ${stagedUploadData.userErrors.map((e: { message: string }) => e.message).join(', ')}`)
      }

      const stagedTarget = stagedUploadData.stagedTargets[0]
      if (!stagedTarget) {
        throw new Error('No staged upload target received from Shopify')
      }

      // Step 2: Upload file to staged target
      
      // Convert base64 to Buffer (Node.js environment)
      const buffer = Buffer.from(base64Data, 'base64')
      
      if (buffer.length < 100) {
        throw new Error(`Image buffer too small (${buffer.length} bytes) - likely truncated base64 data`)
      }
      
      const FormDataModule = await import('form-data')
      const FormData = FormDataModule.default
      const form = new FormData()

      
      // Add staged upload parameters first (order matters for S3)
      for (const param of stagedTarget.parameters) {
        form.append(param.name, param.value)
      }
      
      // CRITICAL: Add file parameter LAST (required by S3/CDN) 
      form.append('file', buffer, {
        filename: filename,
        contentType: mimeType
      })

      // Get proper headers from form-data package (includes boundary)
      const headers = form.getHeaders()

      // Use form-data with proper stream handling for Node.js + fetch compatibility
      const uploadResponse = await fetch(stagedTarget.url, {
        method: 'POST',
        body: form.getBuffer() as unknown as BodyInit,
        headers: {
          ...headers,
          'Content-Length': form.getLengthSync().toString()
        }
      })

      if (uploadResponse.status !== 204 && uploadResponse.status !== 201) {
        const errorText = await uploadResponse.text()
        logger.error('File upload failed', new Error(`${uploadResponse.status} ${uploadResponse.statusText}`), { errorText, component: 'shopify-official', operation: 'createProductImage' })
        throw new Error(`Upload failed: ${uploadResponse.statusText}`)
      }


      // Step 3: Use CORRECT productCreateMedia to attach media using resourceUrl
      
      const productCreateMediaMutation = `
        mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
          productCreateMedia(productId: $productId, media: $media) {
            media {
              id
              alt
              status
              mediaContentType
              ... on MediaImage {
                image {
                  url
                  altText
                }
              }
            }
            mediaUserErrors {
              field
              message
              code
            }
          }
        }
      `

      const mediaInput = [{
        alt: altText || 'Product image',
        originalSource: stagedTarget.resourceUrl,
        mediaContentType: 'IMAGE'
      }]

      const mediaResponse = await this.client.request(productCreateMediaMutation, {
        variables: {
          productId,
          media: mediaInput
        }
      })

      
      const mediaData = mediaResponse.data?.productCreateMedia

      if (mediaData?.mediaUserErrors?.length > 0) {
        logger.error('Media creation failed', undefined, { mediaUserErrors: mediaData.mediaUserErrors, component: 'shopify-official', operation: 'createProductImage' })
        throw new Error(`Media creation failed: ${mediaData.mediaUserErrors.map((e: { message: string }) => e.message).join(', ')}`)
      }

      if (!mediaData?.media?.length) {
        logger.error('No media was created', undefined, { component: 'shopify-official', operation: 'createProductImage' })
        throw new Error('No media was created - productCreateMedia returned empty media array')
      }

      const createdMedia = mediaData.media[0]

      return {
        data: {
          productCreateMedia: {
            media: mediaData.media
          }
        },
        success: true,
        method: 'CORRECT_PRODUCT_CREATE_MEDIA_APPROACH'
      }

    } catch (error) {
      logger.error('Error in corrected media upload process', error as Error, { component: 'shopify-official', operation: 'createProductImage', productId })
      throw error
    }
  }

  async createProductOption(productId: string, option: { name: string; values: string[]; position?: number }) {
    try {

      const mutation = `
        mutation productOptionCreate($productId: ID!, $option: ProductOptionInput!) {
          productOptionCreate(productId: $productId, option: $option) {
            productOption {
              id
              name
              position
              values
            }
            userErrors {
              field
              message
            }
          }
        }
      `

      const response = await this.client.request(mutation, {
        variables: {
          productId,
          option: option
        }
      })

      return response

    } catch (error) {
      logger.error('Error creating option with official library', error as Error, { component: 'shopify-official', operation: 'createProductOption', productId })
      throw error
    }
  }

  async createProductVariants(productId: string, variants: ShopifyVariantInput[]) {
    try {

      const mutation = `
        mutation productVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkCreate(productId: $productId, variants: $variants) {
            product {
              id
              variants(first: 50) {
                edges {
                  node {
                    id
                    title
                    price
                    selectedOptions {
                      name
                      value
                    }
                  }
                }
              }
            }
            productVariants {
              id
              title
              price
            }
            userErrors {
              field
              message
            }
          }
        }
      `

      const response = await this.client.request(mutation, {
        variables: {
          productId,
          variants: variants
        }
      })



      // Check for user errors
      if (response.data?.productVariantsBulkCreate?.userErrors?.length > 0) {
        logger.error('Variant creation user errors', undefined, { userErrors: response.data.productVariantsBulkCreate.userErrors, component: 'shopify-official', operation: 'createProductVariants', productId })
      }

      return response

    } catch (error) {
      logger.error('Error creating variants with official library', error as Error, { component: 'shopify-official', operation: 'createProductVariants', productId })
      throw error
    }
  }

  async createProductMetafield(productId: string, metafield: ShopifyMetafieldInput) {
    try {

      const mutation = `
        mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              namespace
              key
              value
            }
            userErrors {
              field
              message
            }
          }
        }
      `

      const response = await this.client.request(mutation, {
        variables: {
          metafields: [{
            ownerId: productId,
            namespace: metafield.namespace,
            key: metafield.key,
            value: metafield.value,
            type: metafield.type
          }]
        }
      })

      return response

    } catch (error) {
      logger.error('Error creating metafield with official library', error as Error, { component: 'shopify-official', operation: 'createProductMetafield', productId })
      throw error
    }
  }

  async createProductVariantMetafield(variantId: string, metafield: ShopifyMetafieldInput) {
    try {

      const mutation = `
        mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              namespace
              key
              value
            }
            userErrors {
              field
              message
            }
          }
        }
      `

      const response = await this.client.request(mutation, {
        variables: {
          metafields: [{
            ownerId: variantId,
            namespace: metafield.namespace,
            key: metafield.key,
            value: metafield.value,
            type: metafield.type
          }]
        }
      })

      return response

    } catch (error) {
      logger.error('Error creating variant metafield with official library', error as Error, { component: 'shopify-official', operation: 'createProductVariantMetafield', variantId })
      throw error
    }
  }
}

