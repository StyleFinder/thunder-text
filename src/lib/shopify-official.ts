import { createAdminApiClient } from '@shopify/admin-api-client'
import type {
  ShopifyProductInput,
  ShopifyMetafieldInput,
  ShopifyVariantInput,
  ShopifyMediaUploadTarget,
  ShopifyMediaImage,
  ShopifyProductCreateMediaResponse
} from '@/types/shopify'

interface ShopifyAdminApiClient {
  request: <T>(query: string, options?: { variables?: Record<string, unknown> }) => Promise<{ data: T }>
}

export class ShopifyOfficialAPI {
  private shop: string
  private accessToken: string
  private client: ShopifyAdminApiClient

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
      console.log('🔄 Creating product with official Admin API client...')

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

      console.log('📝 Product input:', JSON.stringify(productData, null, 2))
      
      const response = await this.client.request(mutation, {
        variables: { input: productData }
      })

      console.log('✅ Product created successfully with official Admin API client')
      console.log('🔍 DEBUG: Full Shopify response:', JSON.stringify(response, null, 2))
      return response
      
    } catch (error) {
      console.error('❌ Error creating product with official Admin API client:', error)
      throw error
    }
  }

  // CORRECTED GraphQL Media Upload - Using recommended productUpdate approach
  async createProductImage(productId: string, imageData: string | { data?: string; src?: string; dataURL?: string; dataUrl?: string; url?: string; base64?: string }, altText?: string) {
    try {
      console.log('🔄 Starting CORRECTED GraphQL media upload process...')
      console.log('🔍 DEBUG: imageData type:', typeof imageData)
      console.log('🔍 DEBUG: imageData is Array:', Array.isArray(imageData))
      console.log('🔍 DEBUG: imageData keys:', imageData && typeof imageData === 'object' ? Object.keys(imageData) : 'N/A')
      console.log('🔍 DEBUG: Full imageData structure:', JSON.stringify(imageData, null, 2))

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
      
      console.log('📤 Step 1: Creating staged upload target...')

      // Step 2: Create staged upload using IMAGE resource (for compatibility)
      const stagedUploadInput = {
        filename,
        mimeType,
        resource: 'IMAGE',  // Use IMAGE resource for better compatibility
        httpMethod: 'POST'
      }
      
      console.log('🔍 DEBUG: Staged upload input:', JSON.stringify(stagedUploadInput, null, 2))
      
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
        console.error('❌ Staged upload creation failed:', stagedUploadData.userErrors)
        throw new Error(`Staged upload failed: ${stagedUploadData.userErrors.map((e) => e.message).join(', ')}`)
      }

      const stagedTarget = stagedUploadData.stagedTargets[0]
      if (!stagedTarget) {
        throw new Error('No staged upload target received from Shopify')
      }

      console.log('🔍 DEBUG: Staged upload target:', JSON.stringify({
        url: stagedTarget.url,
        resourceUrl: stagedTarget.resourceUrl,
        parametersCount: stagedTarget.parameters?.length
      }, null, 2))

      console.log('✅ Step 1 complete: Staged upload target created')

      // Step 3: Upload file to staged target
      console.log('📤 Step 2: Uploading file to staged target...')
      
      // Convert base64 to Buffer (Node.js environment)
      const buffer = Buffer.from(base64Data, 'base64')
      console.log('🔍 DEBUG: Buffer size:', buffer.length, 'bytes')
      
      if (buffer.length < 100) {
        throw new Error(`Image buffer too small (${buffer.length} bytes) - likely truncated base64 data`)
      }
      
      const FormDataModule = await import('form-data')
      const FormData = FormDataModule.default
      const form = new FormData()

      console.log('🔍 DEBUG: Adding parameters to form...', stagedTarget.parameters.length, 'parameters')
      
      // Add staged upload parameters first (order matters for S3)
      for (const param of stagedTarget.parameters) {
        form.append(param.name, param.value)
        console.log('🔍 DEBUG: Added parameter:', param.name, '=', param.value.substring(0, 50) + (param.value.length > 50 ? '...' : ''))
      }
      
      // CRITICAL: Add file parameter LAST (required by S3/CDN) 
      form.append('file', buffer, {
        filename: filename,
        contentType: mimeType
      })
      console.log('🔍 DEBUG: Added file buffer with filename:', filename, 'and contentType:', mimeType)

      // Get proper headers from form-data package (includes boundary)
      const headers = form.getHeaders()
      console.log('🔍 DEBUG: Upload headers:', Object.keys(headers))
      console.log('🔍 DEBUG: Content-Type header:', headers['content-type'])

      // Use form-data with proper stream handling for Node.js + fetch compatibility
      const uploadResponse = await fetch(stagedTarget.url, {
        method: 'POST',
        body: form.getBuffer(),
        headers: {
          ...headers,
          'Content-Length': form.getLengthSync().toString()
        }
      })

      if (uploadResponse.status !== 204 && uploadResponse.status !== 201) {
        const errorText = await uploadResponse.text()
        console.error('❌ File upload failed:', errorText)
        throw new Error(`Upload failed: ${uploadResponse.statusText}`)
      }

      console.log('✅ Step 2 complete: File uploaded to staged target')

      // Step 3: Use CORRECT productCreateMedia to attach media using resourceUrl
      console.log('📤 Step 3: Using productCreateMedia to attach media...')
      
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
      
      console.log('🔍 DEBUG: Media creation input:', JSON.stringify({
        productId,
        media: mediaInput
      }, null, 2))

      const mediaResponse = await this.client.request(productCreateMediaMutation, {
        variables: {
          productId,
          media: mediaInput
        }
      })

      console.log('🔍 DEBUG: Full media creation response:', JSON.stringify(mediaResponse, null, 2))
      
      const mediaData = mediaResponse.data?.productCreateMedia

      if (mediaData?.mediaUserErrors?.length > 0) {
        console.error('❌ Media creation failed:', JSON.stringify(mediaData.mediaUserErrors, null, 2))
        throw new Error(`Media creation failed: ${mediaData.mediaUserErrors.map((e) => e.message).join(', ')}`)
      }
      
      if (!mediaData?.media?.length) {
        console.error('❌ No media was created')
        throw new Error('No media was created - productCreateMedia returned empty media array')
      }

      const createdMedia = mediaData.media[0]
      console.log('✅ Step 3 complete: Media attached to product via productCreateMedia')

      console.log('🎉 CORRECT media upload completed successfully!', {
        mediaId: createdMedia.id,
        status: createdMedia.status,
        imageUrl: createdMedia.image?.url
      })

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
      console.error('❌ Error in corrected media upload process:', error)
      throw error
    }
  }

  async createProductOption(productId: string, option: { name: string; values: string[]; position?: number }) {
    try {
      console.log('🔄 Creating product option with official library...')
      
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

      console.log('✅ Product option created successfully with official library')
      console.log('🔍 DEBUG: Option creation response:', JSON.stringify(response, null, 2))
      return response

    } catch (error) {
      console.error('❌ Error creating option with official library:', error)
      throw error
    }
  }

  async createProductVariants(productId: string, variants: ShopifyVariantInput[]) {
    try {
      console.log('🔄 Creating product variants with official library...')
      
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

      console.log('🔍 DEBUG: Sending variant creation request:', JSON.stringify({
        productId,
        variants: variants
      }, null, 2))

      const response = await this.client.request(mutation, {
        variables: {
          productId,
          variants: variants
        }
      })

      console.log('✅ Product variants created successfully with official library')
      console.log('🔍 DEBUG: Full variant creation response:', JSON.stringify(response, null, 2))
      
      // Check for user errors
      if (response.data?.productVariantsBulkCreate?.userErrors?.length > 0) {
        console.error('❌ Variant creation user errors:', response.data.productVariantsBulkCreate.userErrors)
      }
      
      return response

    } catch (error) {
      console.error('❌ Error creating variants with official library:', error)
      throw error
    }
  }

  async createProductMetafield(productId: string, metafield: ShopifyMetafieldInput) {
    try {
      console.log('🔄 Creating product metafield with official library...')
      
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

      console.log('✅ Metafield created successfully with official library')
      return response

    } catch (error) {
      console.error('❌ Error creating metafield with official library:', error)
      throw error
    }
  }

  async createProductVariantMetafield(variantId: string, metafield: ShopifyMetafieldInput) {
    try {
      console.log('🔄 Creating variant metafield with official library...')
      
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

      console.log('✅ Variant metafield created successfully with official library')
      return response

    } catch (error) {
      console.error('❌ Error creating variant metafield with official library:', error)
      throw error
    }
  }
}

