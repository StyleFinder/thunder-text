// shopifyImageUploader.ts - TypeScript version of proven GraphQL image upload helper

import axios, { AxiosInstance } from 'axios'
import FormData from 'form-data'

interface StagedUploadParameter {
  name: string
  value: string
}

interface StagedUploadTarget {
  url: string
  resourceUrl: string
  parameters: StagedUploadParameter[]
}

interface StagedUploadResponse {
  data: {
    stagedUploadsCreate: {
      stagedTargets: StagedUploadTarget[]
      userErrors: Array<{
        field: string[]
        message: string
      }>
    }
  }
}

interface MediaImage {
  id: string
  alt: string
  status: string
  mediaContentType: string
  image?: {
    url: string
    altText: string
  }
}

interface ProductCreateMediaResponse {
  data: {
    productCreateMedia: {
      media: MediaImage[]
      mediaUserErrors: Array<{
        field: string[]
        message: string
      }>
    }
  }
}

interface UploadResult {
  success: boolean
  media: MediaImage
  method: string
}

export class ShopifyImageUploader {
  private shop: string
  private accessToken: string
  private apiVersion: string
  private shopifyGraphQL: AxiosInstance

  constructor(shop: string, accessToken: string, apiVersion: string = '2025-01') {
    this.shop = shop
    this.accessToken = accessToken
    this.apiVersion = apiVersion
    
    // Set up reusable GraphQL client
    this.shopifyGraphQL = axios.create({
      baseURL: `https://${shop}/admin/api/${apiVersion}/graphql.json`,
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    })
  }

  // Step 1: Request a staged upload URL from Shopify
  async getStagedUpload(filename: string, mimeType: string = "image/jpeg"): Promise<StagedUploadTarget> {
    const mutation = `
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

    const variables = {
      input: [
        {
          filename,
          mimeType,
          resource: "IMAGE",
          httpMethod: "POST"
        }
      ]
    }

    const res = await this.shopifyGraphQL.post<StagedUploadResponse>('', {
      query: mutation,
      variables,
    })

    const errors = res.data.data.stagedUploadsCreate.userErrors
    if (errors.length > 0) throw new Error(JSON.stringify(errors))

    return res.data.data.stagedUploadsCreate.stagedTargets[0]
  }

  // Step 2: Upload the file to Shopify's CDN (modified for base64 data)
  async uploadFileToShopify(uploadTarget: StagedUploadTarget, imageData: string | Buffer): Promise<boolean> {
    const form = new FormData()

    // Add staged upload parameters
    for (const param of uploadTarget.parameters) {
      form.append(param.name, param.value)
    }

    // Handle base64 image data
    let buffer: Buffer
    let mimeType = 'image/jpeg'
    
    if (typeof imageData === 'string' && imageData.startsWith('data:')) {
      // Extract base64 data from data URL
      const matches = imageData.match(/^data:([^;]+);base64,(.+)$/)
      if (matches) {
        mimeType = matches[1]
        const base64Data = matches[2]
        buffer = Buffer.from(base64Data, 'base64')
      } else {
        throw new Error('Invalid base64 data URL format')
      }
    } else if (Buffer.isBuffer(imageData)) {
      // Direct buffer
      buffer = imageData
    } else {
      throw new Error('Invalid image data format')
    }

    // Append file data
    form.append('file', buffer, {
      filename: 'image.jpg',
      contentType: mimeType
    })

    const res = await axios.post(uploadTarget.url, form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    })

    if (res.status !== 204 && res.status !== 201) {
      throw new Error(`Upload failed: ${res.statusText}`)
    }

    return true
  }

  // Step 3: Attach image to a Shopify product
  async attachImageToProduct(productGID: string, resourceUrl: string, alt: string = "Uploaded image"): Promise<MediaImage[]> {
    const mutation = `
      mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
        productCreateMedia(productId: $productId, media: $media) {
          media {
            id
            alt
            status
            mediaContentType
            ... on MediaImage {
              id
              image {
                url
                altText
              }
            }
          }
          mediaUserErrors {
            field
            message
          }
        }
      }
    `

    const variables = {
      productId: productGID,
      media: [
        {
          alt,
          originalSource: resourceUrl,
          mediaContentType: "IMAGE",
        },
      ],
    }

    const res = await this.shopifyGraphQL.post<ProductCreateMediaResponse>('', {
      query: mutation,
      variables,
    })

    const errors = res.data.data.productCreateMedia.mediaUserErrors
    if (errors.length > 0) throw new Error(JSON.stringify(errors))

    return res.data.data.productCreateMedia.media
  }

  // Combined method: Complete image upload process
  async uploadImageToProduct(productGID: string, imageData: string | Buffer, altText: string = "Product image"): Promise<UploadResult> {
    try {
      console.log('🔄 Starting proven GraphQL image upload process...')

      // Extract filename and mime type
      let filename = `product-image-${Date.now()}.jpg`
      let mimeType = 'image/jpeg'
      
      if (typeof imageData === 'string' && imageData.startsWith('data:')) {
        const matches = imageData.match(/^data:([^;]+);base64,(.+)$/)
        if (matches) {
          mimeType = matches[1]
          const extension = mimeType.split('/')[1] || 'jpg'
          filename = `product-image-${Date.now()}.${extension}`
        }
      }

      console.log('📤 Step 1: Getting staged upload URL...')
      const uploadTarget = await this.getStagedUpload(filename, mimeType)
      
      console.log('📤 Step 2: Uploading file to Shopify CDN...')
      await this.uploadFileToShopify(uploadTarget, imageData)
      
      console.log('📤 Step 3: Attaching image to product...')
      const media = await this.attachImageToProduct(productGID, uploadTarget.resourceUrl, altText)
      
      console.log('✅ Image upload completed successfully!', {
        mediaId: media[0]?.id,
        status: media[0]?.status,
        imageUrl: media[0]?.image?.url
      })

      return {
        success: true,
        media: media[0],
        method: 'PROVEN_HELPER_MODULE'
      }

    } catch (error) {
      console.error('❌ Error in proven image upload process:', error)
      throw error
    }
  }
}

export default ShopifyImageUploader