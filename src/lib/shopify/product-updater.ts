import { ShopifyAPI } from '../shopify'
import { type EnhancementResponse } from '../openai-enhancement'
import { type EnhancementProductData } from './product-enhancement'

export interface ProductUpdateOptions {
  updateTitle?: boolean
  updateDescription?: boolean
  updateSeo?: boolean
  updateMetafields?: boolean
  preserveOriginal?: boolean
  backupToMetafield?: boolean
}

export interface ProductUpdateResult {
  success: boolean
  product: {
    id: string
    title: string
    description: string
    handle: string
    updated_at: string
    changes: {
      title_updated: boolean
      description_updated: boolean
      seo_updated: boolean
      metafields_updated: boolean
    }
  }
  backup?: {
    original_description: string
    original_title: string
    backup_id: string
    backup_timestamp: string
    metafield_id?: string
  }
  errors?: string[]
  warnings?: string[]
}

export class ShopifyProductUpdater {
  private shopifyApi: ShopifyAPI

  constructor(shop: string, accessToken: string) {
    this.shopifyApi = new ShopifyAPI(shop, accessToken)
  }

  async updateProductWithEnhancement(
    productId: string,
    enhancedContent: EnhancementResponse,
    originalProduct: EnhancementProductData,
    options: ProductUpdateOptions = {}
  ): Promise<ProductUpdateResult> {
    
    const {
      updateTitle = false,
      updateDescription = true,
      updateSeo = true,
      updateMetafields = false,
      preserveOriginal = true,
      backupToMetafield = true
    } = options

    try {
      console.log('🔄 Updating Shopify product with enhanced content:', { productId })

      const errors: string[] = []
      const warnings: string[] = []
      
      // Prepare backup if needed
      let backup: {
        original_description: string
        original_title: string
        backup_id: string
        backup_timestamp: string
        metafield_id?: string
      } | null = null
      if (preserveOriginal) {
        backup = {
          original_description: originalProduct.originalDescription,
          original_title: originalProduct.title,
          backup_id: `backup_${Date.now()}`,
          backup_timestamp: new Date().toISOString()
        }

        // Store backup in metafield if requested
        if (backupToMetafield) {
          try {
            const backupMetafield = await this.shopifyApi.createProductMetafield(
              productId,
              {
                namespace: 'thunder_text',
                key: 'description_backup',
                value: JSON.stringify(backup),
                type: 'json'
              }
            )
            if (backupMetafield?.metafieldsSet?.metafields?.[0]?.id) {
              backup.metafield_id = backupMetafield.metafieldsSet.metafields[0].id
            }
          } catch (error) {
            warnings.push('Failed to create backup metafield')
            console.warn('⚠️ Backup metafield creation failed:', error)
          }
        }
      }

      // Prepare product update input
      const updateInput: Record<string, unknown> = {}
      const changes = {
        title_updated: false,
        description_updated: false,
        seo_updated: false,
        metafields_updated: false
      }

      // Update title if requested and provided
      if (updateTitle && enhancedContent.title && enhancedContent.title !== originalProduct.title) {
        updateInput.title = enhancedContent.title
        changes.title_updated = true
      }

      // Update description
      if (updateDescription && enhancedContent.description) {
        updateInput.descriptionHtml = enhancedContent.description
        changes.description_updated = true
      }

      // Update SEO fields
      if (updateSeo) {
        if (enhancedContent.metaDescription) {
          updateInput.seo = {
            description: enhancedContent.metaDescription,
            title: enhancedContent.title || originalProduct.title
          }
          changes.seo_updated = true
        }
      }

      // Perform the product update
      const updatedProduct = await this.shopifyApi.updateProduct(productId, updateInput)

      if (!updatedProduct) {
        throw new Error('Product update failed - no response from Shopify API')
      }

      // Update metafields if requested
      if (updateMetafields && enhancedContent.keywords?.length > 0) {
        try {
          await this.shopifyApi.createProductMetafield(
            productId,
            {
              namespace: 'thunder_text',
              key: 'generated_keywords',
              value: enhancedContent.keywords.join(', '),
              type: 'single_line_text_field'
            }
          )
          changes.metafields_updated = true
        } catch (error) {
          warnings.push('Failed to update keywords metafield')
          console.warn('⚠️ Keywords metafield update failed:', error)
        }
      }

      console.log('✅ Product updated successfully in Shopify')

      return {
        success: true,
        product: {
          id: productId,
          title: updatedProduct.productUpdate.product.title || enhancedContent.title || originalProduct.title,
          description: enhancedContent.description,
          handle: updatedProduct.productUpdate.product.handle || originalProduct.handle,
          updated_at: new Date().toISOString(),
          changes
        },
        backup: backup ?? undefined,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined
      }

    } catch (error) {
      console.error('❌ Error updating product in Shopify:', error)
      
      return {
        success: false,
        product: {
          id: productId,
          title: originalProduct.title,
          description: originalProduct.originalDescription,
          handle: originalProduct.handle,
          updated_at: new Date().toISOString(),
          changes: {
            title_updated: false,
            description_updated: false,
            seo_updated: false,
            metafields_updated: false
          }
        },
        errors: [error instanceof Error ? error.message : 'Unknown error occurred during update']
      }
    }
  }

  async validateProductAccess(productId: string): Promise<boolean> {
    try {
      // Try to fetch the product to validate access
      const products = await this.shopifyApi.getProducts(1)
      // This is a simple check - in a real implementation, you'd want to 
      // specifically check if the productId is accessible
      return true
    } catch (error) {
      console.error('❌ Product access validation failed:', error)
      return false
    }
  }

  async createUpdatePreview(
    productId: string,
    enhancedContent: EnhancementResponse,
    originalProduct: EnhancementProductData,
    options: ProductUpdateOptions = {}
  ) {
    return {
      productId,
      currentState: {
        title: originalProduct.title,
        description: originalProduct.originalDescription,
        seoTitle: originalProduct.seoTitle,
        seoDescription: originalProduct.seoDescription
      },
      proposedChanges: {
        title: options.updateTitle ? enhancedContent.title : originalProduct.title,
        description: options.updateDescription ? enhancedContent.description : originalProduct.originalDescription,
        seoTitle: options.updateSeo ? (enhancedContent.title || originalProduct.title) : originalProduct.seoTitle,
        seoDescription: options.updateSeo ? enhancedContent.metaDescription : originalProduct.seoDescription
      },
      updateOptions: options,
      estimatedImpact: {
        descriptionLengthChange: enhancedContent.description.length - originalProduct.originalDescription.length,
        seoScoreImprovement: enhancedContent.improvements.seo_score_improvement,
        readabilityImprovement: enhancedContent.improvements.readability_improvement,
        addedElements: enhancedContent.improvements.added_elements
      }
    }
  }
}

export async function createShopifyProductUpdater(shop: string): Promise<ShopifyProductUpdater> {
  // TODO: Implement proper OAuth token retrieval from database
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN

  if (!accessToken) {
    throw new Error('Shopify access token not available - ensure proper OAuth authentication')
  }

  return new ShopifyProductUpdater(shop, accessToken)
}