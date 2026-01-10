import { ShopifyAPI } from "../shopify";
import { type EnhancementResponse } from "../openai-enhancement";
import { type EnhancementProductData } from "./product-enhancement";
import { logger } from "@/lib/logger";
import { getShopToken } from "./token-manager";
import { sanitizeDescriptionForShopify } from "@/lib/security/input-sanitization";

export interface ProductUpdateOptions {
  updateTitle?: boolean;
  updateDescription?: boolean;
  updateSeo?: boolean;
  updateMetafields?: boolean;
  preserveOriginal?: boolean;
  backupToMetafield?: boolean;
}

export interface ProductUpdateResult {
  success: boolean;
  product: {
    id: string;
    title: string;
    description: string;
    handle: string;
    updated_at: string;
    changes: {
      title_updated: boolean;
      description_updated: boolean;
      seo_updated: boolean;
      metafields_updated: boolean;
      image_alt_updated?: boolean;
      images_alt_count?: number;
    };
  };
  backup?: {
    original_description: string;
    original_title: string;
    backup_id: string;
    backup_timestamp: string;
    metafield_id?: string;
  };
  errors?: string[];
  warnings?: string[];
}

export class ShopifyProductUpdater {
  private shopifyApi: ShopifyAPI;

  constructor(shop: string, accessToken: string) {
    this.shopifyApi = new ShopifyAPI(shop, accessToken);
  }

  async updateProductWithEnhancement(
    productId: string,
    enhancedContent: EnhancementResponse,
    originalProduct: EnhancementProductData,
    options: ProductUpdateOptions = {},
  ): Promise<ProductUpdateResult> {
    const {
      updateTitle = false,
      updateDescription = true,
      updateSeo = true,
      updateMetafields = false,
      preserveOriginal = true,
      backupToMetafield = true,
    } = options;

    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Prepare backup if needed
      let backup: {
        original_description: string;
        original_title: string;
        backup_id: string;
        backup_timestamp: string;
        metafield_id?: string;
      } | null = null;
      if (preserveOriginal) {
        backup = {
          original_description: originalProduct.originalDescription,
          original_title: originalProduct.title,
          backup_id: `backup_${Date.now()}`,
          backup_timestamp: new Date().toISOString(),
        };

        // Store backup in metafield if requested
        if (backupToMetafield) {
          try {
            const backupMetafield =
              await this.shopifyApi.createProductMetafield(productId, {
                namespace: "thunder_text",
                key: "description_backup",
                value: JSON.stringify(backup),
                type: "json",
              });
            if (backupMetafield?.metafieldsSet?.metafields?.[0]?.id) {
              backup.metafield_id =
                backupMetafield.metafieldsSet.metafields[0].id;
            }
          } catch (error) {
            warnings.push("Failed to create backup metafield");
            logger.warn("Backup metafield creation failed", error as Error, {
              component: "product-updater",
              productId,
            });
          }
        }
      }

      // Prepare product update input
      const updateInput: Record<string, unknown> = {};
      const changes = {
        title_updated: false,
        description_updated: false,
        seo_updated: false,
        metafields_updated: false,
      };

      // Update title if requested and provided
      if (
        updateTitle &&
        enhancedContent.title &&
        enhancedContent.title !== originalProduct.title
      ) {
        updateInput.title = enhancedContent.title;
        changes.title_updated = true;
      }

      // Update description - sanitize to remove &nbsp; entities that cause copy/paste issues
      if (updateDescription && enhancedContent.description) {
        updateInput.descriptionHtml = sanitizeDescriptionForShopify(enhancedContent.description);
        changes.description_updated = true;
      }

      // Update SEO fields
      if (updateSeo) {
        if (enhancedContent.metaDescription) {
          updateInput.seo = {
            description: enhancedContent.metaDescription,
            title: enhancedContent.title || originalProduct.title,
          };
          changes.seo_updated = true;
        }
      }

      // Perform the product update
      const updatedProduct = await this.shopifyApi.updateProduct(
        productId,
        updateInput,
      );

      if (!updatedProduct || !updatedProduct.productUpdate.product) {
        throw new Error("Product update failed - no response from Shopify API");
      }

      const product = updatedProduct.productUpdate.product;

      // Update metafields if requested
      if (updateMetafields && enhancedContent.keywords?.length > 0) {
        try {
          await this.shopifyApi.createProductMetafield(productId, {
            namespace: "thunder_text",
            key: "generated_keywords",
            value: enhancedContent.keywords.join(", "),
            type: "single_line_text_field",
          });
          changes.metafields_updated = true;
        } catch (error) {
          warnings.push("Failed to update keywords metafield");
          logger.warn("Keywords metafield update failed", error as Error, {
            component: "product-updater",
            productId,
          });
        }
      }

      return {
        success: true,
        product: {
          id: productId,
          title:
            product.title || enhancedContent.title || originalProduct.title,
          description: enhancedContent.description,
          handle: product.handle || originalProduct.handle,
          updated_at: new Date().toISOString(),
          changes,
        },
        backup: backup ?? undefined,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      logger.error("❌ Error updating product in Shopify:", error as Error, {
        component: "product-updater",
      });

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
            metafields_updated: false,
          },
        },
        errors: [
          error instanceof Error
            ? error.message
            : "Unknown error occurred during update",
        ],
      };
    }
  }

  async validateProductAccess(productId: string): Promise<boolean> {
    try {
      // Validate access by fetching the specific product
      const product = await this.shopifyApi.getProductById(productId);
      return product !== null;
    } catch (error) {
      logger.error("❌ Product access validation failed:", error as Error, {
        component: "product-updater",
        productId,
      });
      return false;
    }
  }

  async createUpdatePreview(
    productId: string,
    enhancedContent: EnhancementResponse,
    originalProduct: EnhancementProductData,
    options: ProductUpdateOptions = {},
  ) {
    return {
      productId,
      currentState: {
        title: originalProduct.title,
        description: originalProduct.originalDescription,
        seoTitle: originalProduct.seoTitle,
        seoDescription: originalProduct.seoDescription,
      },
      proposedChanges: {
        title: options.updateTitle
          ? enhancedContent.title
          : originalProduct.title,
        description: options.updateDescription
          ? enhancedContent.description
          : originalProduct.originalDescription,
        seoTitle: options.updateSeo
          ? enhancedContent.title || originalProduct.title
          : originalProduct.seoTitle,
        seoDescription: options.updateSeo
          ? enhancedContent.metaDescription
          : originalProduct.seoDescription,
      },
      updateOptions: options,
      estimatedImpact: {
        descriptionLengthChange:
          enhancedContent.description.length -
          originalProduct.originalDescription.length,
        seoScoreImprovement: enhancedContent.improvements.seo_score_improvement,
        readabilityImprovement:
          enhancedContent.improvements.readability_improvement,
        addedElements: enhancedContent.improvements.added_elements,
      },
    };
  }
}

export async function createShopifyProductUpdater(
  shop: string,
): Promise<ShopifyProductUpdater> {
  // Retrieve OAuth token from database
  const tokenResult = await getShopToken(shop);

  if (!tokenResult.success || !tokenResult.accessToken) {
    logger.error("Failed to retrieve Shopify access token", undefined, {
      component: "product-updater",
      shop,
      error: tokenResult.error,
    });
    throw new Error(
      tokenResult.error ||
        "Shopify access token not available - ensure shop is properly authenticated",
    );
  }

  return new ShopifyProductUpdater(shop, tokenResult.accessToken);
}
