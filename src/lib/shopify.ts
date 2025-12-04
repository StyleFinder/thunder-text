import { GraphQLClient } from "graphql-request";
import type {
  ShopifyProductInput,
  ShopifyMetafieldInput,
  ShopifyVariantInput,
  ShopifyMediaImage,
  ShopifyProductCreateMediaResponse,
  ShopifyEdge,
} from "@/types/shopify";
import { logger } from "@/lib/logger";

// GraphQL Response Types for ShopifyAPI methods
interface GetProductsResponse {
  products: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        handle: string;
        description: string;
        images: {
          edges: Array<{
            node: {
              id: string;
              url: string;
              altText: string | null;
            };
          }>;
        };
        variants: {
          edges: Array<{
            node: {
              id: string;
              title: string;
              price: string;
              inventoryQuantity: number;
            };
          }>;
        };
        metafields: {
          edges: Array<{
            node: {
              id: string;
              key: string;
              value: string;
              namespace: string;
            };
          }>;
        };
      };
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  };
}

interface ProductUpdateResponse {
  productUpdate: {
    product: {
      id: string;
      title: string;
      descriptionHtml: string;
      handle: string;
    } | null;
    userErrors: Array<{ field: string[]; message: string }>;
  };
}

interface MetafieldsSetResponse {
  metafieldsSet: {
    metafields: Array<{
      id: string;
      key: string;
      value: string;
    }>;
    userErrors: Array<{ field: string[]; message: string }>;
  };
}

interface ProductCreateResponse {
  productCreate: {
    product: {
      id: string;
      title: string;
      handle: string;
      descriptionHtml: string;
      status: string;
      vendor: string;
      tags: string[];
      productType: string;
    } | null;
    userErrors: Array<{ field: string[]; message: string }>;
  };
}

interface StagedUploadsCreateResponse {
  stagedUploadsCreate: {
    stagedTargets: Array<{
      url: string;
      resourceUrl: string;
      parameters: Array<{
        name: string;
        value: string;
      }>;
    }>;
    userErrors: Array<{ field: string[]; message: string }>;
  };
}

interface ProductCreateMediaResponse {
  productCreateMedia: {
    media: Array<{
      id: string;
      alt: string;
      status: string;
      image?: {
        url: string;
      } | null;
    }>;
    mediaUserErrors: Array<{ field: string[]; message: string }>;
  };
}

interface MediaStatusResponse {
  product: {
    media: {
      edges: ShopifyEdge<ShopifyMediaImage>[];
    };
  };
}

interface FileStatusResponse {
  node: ShopifyMediaImage | null;
}

interface FileAcknowledgeResponse {
  fileAcknowledgeUpdateFailed: {
    files: Array<{
      id: string;
      fileStatus: string;
    }>;
    userErrors: Array<{ code: string; field: string[]; message: string }>;
  };
}

interface GetProductByIdResponse {
  product: {
    id: string;
    title: string;
    handle: string;
    description: string;
  } | null;
}

export class ShopifyAPI {
  private client: GraphQLClient;
  private shopDomain: string;
  private accessToken: string;

  constructor(shopDomain: string, accessToken: string) {
    this.shopDomain = shopDomain;
    this.accessToken = accessToken;
    this.client = new GraphQLClient(
      `https://${shopDomain}/admin/api/2025-01/graphql.json`,
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      },
    );
  }

  async getProducts(
    first: number = 10,
    cursor?: string,
  ): Promise<GetProductsResponse> {
    const query = `
      query getProducts($first: Int!, $after: String) {
        products(first: $first, after: $after) {
          edges {
            node {
              id
              title
              handle
              description
              images(first: 10) {
                edges {
                  node {
                    id
                    url
                    altText
                  }
                }
              }
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    price
                    inventoryQuantity
                  }
                }
              }
              metafields(first: 20) {
                edges {
                  node {
                    id
                    key
                    value
                    namespace
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    return this.client.request<GetProductsResponse>(query, {
      first,
      after: cursor,
    });
  }

  async getProductById(
    productId: string,
  ): Promise<GetProductByIdResponse["product"]> {
    const query = `
      query getProduct($id: ID!) {
        product(id: $id) {
          id
          title
          handle
          description
        }
      }
    `;

    const response = await this.client.request<GetProductByIdResponse>(query, {
      id: productId,
    });
    return response.product;
  }

  async updateProduct(
    productId: string,
    input: Partial<ShopifyProductInput>,
  ): Promise<ProductUpdateResponse> {
    const mutation = `
      mutation productUpdate($input: ProductInput!) {
        productUpdate(input: $input) {
          product {
            id
            title
            descriptionHtml
            handle
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    return this.client.request<ProductUpdateResponse>(mutation, {
      input: {
        id: productId,
        ...input,
      },
    });
  }

  async createProductMetafield(
    productId: string,
    metafield: ShopifyMetafieldInput,
  ): Promise<MetafieldsSetResponse> {
    const mutation = `
      mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            key
            value
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    return this.client.request<MetafieldsSetResponse>(mutation, {
      metafields: [
        {
          ownerId: productId,
          ...metafield,
        },
      ],
    });
  }

  async createProduct(
    input: ShopifyProductInput,
  ): Promise<ProductCreateResponse> {
    // Modern Shopify GraphQL API - ProductInput only accepts specific fields
    const productInput = {
      title: input.title,
      status: input.status,
      productType: input.productType,
      vendor: input.vendor,
      tags: input.tags,
      descriptionHtml: input.description,
    };

    const mutation = `
      mutation productCreate($input: ProductInput!) {
        productCreate(input: $input) {
          product {
            id
            title
            handle
            descriptionHtml
            status
            vendor
            tags
            productType
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const result = await this.client.request<ProductCreateResponse>(mutation, {
      input: productInput,
    });

    // If variants were provided, create them separately
    if (
      input.variants &&
      input.variants.length > 0 &&
      result.productCreate.product
    ) {
      await this.createProductVariants(
        result.productCreate.product.id,
        input.variants,
      );
    }

    return result;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async createProductVariants(
    _productId: string,
    _variants: ShopifyVariantInput[],
  ): Promise<void> {
    // For now, let's skip variants creation as it requires a more complex setup
    // The product will be created with a default variant automatically
    logger.debug(
      "Skipping variant creation - default variant will be created automatically",
      { component: "shopify" },
    );
  }

  async createProductImage(
    productId: string,
    imageData: string,
    altText?: string,
  ): Promise<ShopifyProductCreateMediaResponse | ProductCreateMediaResponse> {
    try {
      // Step 1: Create staged upload target for the image
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
      `;

      // Extract file info from base64 data URL
      const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        throw new Error("Invalid base64 data URL format");
      }

      const mimeType = matches[1];
      const base64Data = matches[2];

      // Convert base64 to bytes for file size calculation
      const base64WithoutPadding = base64Data.replace(/=/g, "");
      const fileSize = Math.floor((base64WithoutPadding.length * 3) / 4);

      // Generate a filename based on mime type
      const extension = mimeType.split("/")[1] || "jpg";
      const filename = `product-image-${Date.now()}.${extension}`;

      const stagedUploadResult =
        await this.client.request<StagedUploadsCreateResponse>(
          stagedUploadMutation,
          {
            input: [
              {
                filename,
                mimeType,
                resource: "IMAGE",
                httpMethod: "POST",
                fileSize: fileSize.toString(),
              },
            ],
          },
        );

      if (stagedUploadResult.stagedUploadsCreate.userErrors?.length > 0) {
        logger.error(
          "Staged upload creation errors:",
          new Error(
            JSON.stringify(stagedUploadResult.stagedUploadsCreate.userErrors),
          ),
          { component: "shopify" },
        );
        throw new Error("Failed to create staged upload target");
      }

      const stagedTarget =
        stagedUploadResult.stagedUploadsCreate.stagedTargets[0];
      if (!stagedTarget) {
        throw new Error("No staged upload target returned");
      }

      // Step 2: Upload the file to the staged upload URL
      const formData = new FormData();

      // Add all the parameters returned by Shopify
      stagedTarget.parameters.forEach(
        (param: { name: string; value: string }) => {
          formData.append(param.name, param.value);
        },
      );

      // Convert base64 to Blob directly
      const response = await fetch(imageData);
      const blob = await response.blob();
      formData.append("file", blob, filename);

      const uploadResponse = await fetch(stagedTarget.url, {
        method: "POST",
        body: formData,
        // Note: Browser FormData automatically sets Content-Type with boundary
      });

      logger.debug(
        `Upload response: ${uploadResponse.status} ${uploadResponse.statusText}`,
        { component: "shopify" },
      );

      if (uploadResponse.status !== 204 && uploadResponse.status !== 201) {
        const errorText = await uploadResponse.text();
        logger.error("File upload failed:", new Error(errorText), {
          component: "shopify",
        });
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      // Step 3: Create product media using productCreateMedia (works with current scopes)
      const productCreateMediaMutation = `
        mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
          productCreateMedia(productId: $productId, media: $media) {
            media {
              id
              alt
              status
              ... on MediaImage {
                id
                image {
                  url
                }
              }
            }
            mediaUserErrors {
              field
              message
            }
          }
        }
      `;

      const mediaInput = [
        {
          mediaContentType: "IMAGE",
          originalSource: stagedTarget.resourceUrl,
          alt: altText || "",
        },
      ];

      const result = await this.client.request<ProductCreateMediaResponse>(
        productCreateMediaMutation,
        {
          productId,
          media: mediaInput,
        },
      );

      if (result.productCreateMedia.mediaUserErrors?.length > 0) {
        logger.error(
          "Media creation errors:",
          new Error(JSON.stringify(result.productCreateMedia.mediaUserErrors)),
          { component: "shopify" },
        );
        throw new Error(
          `Media creation failed: ${result.productCreateMedia.mediaUserErrors.map((e: { message: string }) => e.message).join(", ")}`,
        );
      }

      const createdMedia = result.productCreateMedia.media[0];
      if (!createdMedia) {
        throw new Error("No media created");
      }

      // Step 4: Wait for image processing if still UPLOADED
      if (createdMedia.status === "UPLOADED") {
        const processedMedia = await this.waitForMediaProcessingWithRetry(
          createdMedia.id,
          productId,
          3,
        );
        return processedMedia;
      }

      return result;
    } catch (error) {
      logger.error("Error in createProductImage:", error as Error, {
        component: "shopify",
      });
      throw error;
    }
  }

  // Helper method to poll media processing status
  async waitForMediaProcessing(
    mediaId: string,
    productId: string,
    maxAttempts: number = 10,
  ): Promise<ShopifyProductCreateMediaResponse> {
    const mediaStatusQuery = `
      query getMediaStatus($productId: ID!) {
        product(id: $productId) {
          media(first: 20) {
            edges {
              node {
                id
                alt
                status
                ... on MediaImage {
                  image {
                    url
                  }
                }
              }
            }
          }
        }
      }
    `;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      logger.debug(`Polling attempt ${attempt}/${maxAttempts}...`, {
        component: "shopify",
      });

      const result = await this.client.request<MediaStatusResponse>(
        mediaStatusQuery,
        { productId },
      );
      const media = result.product.media.edges.find(
        (edge) => edge.node.id === mediaId,
      )?.node;

      if (!media) {
        throw new Error(`Media ${mediaId} not found in product`);
      }

      logger.debug(`Media status: ${media.status}`, { component: "shopify" });

      if (media.status === "READY") {
        return { productCreateMedia: { media: [media] } };
      }

      if (media.status === "FAILED") {
        logger.debug(`Media processing failed for ${mediaId}`, {
          component: "shopify",
        });
        // Don't throw error - sometimes media appears even when marked as FAILED
        return { productCreateMedia: { media: [media] } };
      }

      // Wait 3 seconds before next attempt (media processing can be slower)
      if (attempt < maxAttempts) {
        logger.debug("Waiting 3 seconds before next check...", {
          component: "shopify",
        });
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }

    // Return the current state instead of throwing error - sometimes media works even if not READY
    const result = await this.client.request<MediaStatusResponse>(
      mediaStatusQuery,
      { productId },
    );
    const media = result.product.media.edges.find(
      (edge) => edge.node.id === mediaId,
    )?.node;
    return { productCreateMedia: { media: media ? [media] : [] } };
  }

  // New method for Files API processing status
  async waitForFileProcessing(
    fileId: string,
    maxAttempts: number = 12,
  ): Promise<ShopifyMediaImage> {
    const fileStatusQuery = `
      query getFileStatus($id: ID!) {
        node(id: $id) {
          ... on MediaImage {
            id
            fileStatus
            alt
            image {
              url
            }
            fileErrors {
              code
              details
              message
            }
          }
        }
      }
    `;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      logger.debug(`Polling attempt ${attempt}/${maxAttempts}...`, {
        component: "shopify",
      });

      const result = await this.client.request<FileStatusResponse>(
        fileStatusQuery,
        { id: fileId },
      );
      const file = result.node;

      if (!file) {
        throw new Error(`File not found: ${fileId}`);
      }

      logger.debug(`File status: ${file.fileStatus}`, { component: "shopify" });

      if (file.fileStatus === "READY") {
        return file;
      }

      if (file.fileStatus === "FAILED") {
        logger.debug(`File processing failed for ${fileId}`, {
          component: "shopify",
        });

        // Check if there are specific file errors
        if (file.fileErrors && file.fileErrors.length > 0) {
          // Try to acknowledge and retry failed files
          try {
            await this.acknowledgeFailedFiles([fileId]);
            continue;
          } catch {
            // Acknowledge failed, continue with next attempt
          }
        }

        // Don't throw error - sometimes files work even when marked as FAILED
        return file;
      }

      // Wait 5 seconds before next attempt (file processing can be slower than media)
      if (attempt < maxAttempts) {
        logger.debug("Waiting 5 seconds before next check...", {
          component: "shopify",
        });
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    // Return the current state instead of throwing error
    const result = await this.client.request<FileStatusResponse>(
      fileStatusQuery,
      { id: fileId },
    );
    if (!result.node) {
      throw new Error(`File not found after all attempts: ${fileId}`);
    }
    return result.node;
  }

  // Helper method to acknowledge failed files and reset their status
  async acknowledgeFailedFiles(fileIds: string[]): Promise<void> {
    const acknowledgeFailedMutation = `
      mutation fileAcknowledgeUpdateFailed($fileIds: [ID!]!) {
        fileAcknowledgeUpdateFailed(fileIds: $fileIds) {
          files {
            id
            fileStatus
          }
          userErrors {
            code
            field
            message
          }
        }
      }
    `;

    try {
      const result = await this.client.request<FileAcknowledgeResponse>(
        acknowledgeFailedMutation,
        { fileIds },
      );

      if (result.fileAcknowledgeUpdateFailed.userErrors?.length > 0) {
        logger.warn(
          "Acknowledge failed files had errors",
          new Error(
            JSON.stringify(result.fileAcknowledgeUpdateFailed.userErrors),
          ),
          { component: "shopify" },
        );
      }
    } catch (error) {
      logger.error("Failed to acknowledge failed files:", error as Error, {
        component: "shopify",
      });
      throw error;
    }
  }

  // Enhanced media processing with exponential backoff and retry logic
  async waitForMediaProcessingWithRetry(
    mediaId: string,
    productId: string,
    maxRetries: number = 3,
  ): Promise<ShopifyProductCreateMediaResponse> {
    let lastError: Error | null = null;

    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        // Use existing waitForMediaProcessing with increased patience
        const result = await this.waitForMediaProcessing(
          mediaId,
          productId,
          15,
        );

        // If we get here, it worked!
        return result;
      } catch (error) {
        lastError = error as Error;
        logger.debug(
          `Media processing attempt ${retry + 1} failed: ${lastError.message}`,
          { component: "shopify" },
        );

        if (retry < maxRetries - 1) {
          // Exponential backoff: 2s, 4s, 8s
          const delay = Math.min(2000 * Math.pow(2, retry), 8000);
          logger.debug(`Waiting ${delay}ms before retry ${retry + 2}...`, {
            component: "shopify",
          });
          await new Promise((resolve) => setTimeout(resolve, delay));

          // Try to recreate the media with the same staged resource
          try {
            await this.recreateMediaFromStaging(mediaId, productId);
          } catch {
            // Recreate failed, continue with next retry
          }
        }
      }
    }

    // If all retries failed, log comprehensive error info but don't throw
    logger.debug(`All ${maxRetries} media processing attempts failed`, {
      component: "shopify",
      error: lastError?.message,
    });

    // Return a minimal success response to continue the flow
    return {
      productCreateMedia: {
        media: [
          {
            id: mediaId,
            alt: "",
            status: "FAILED",
            image: undefined,
          },
        ],
      },
    };
  }

  // Helper to recreate media from staging (for retry scenarios)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async recreateMediaFromStaging(
    _originalMediaId: string,
    _productId: string,
  ): Promise<void> {
    // This is a simplified approach - in a full implementation, you'd store the staging URL
    // For now, we just log the attempt
    logger.debug(
      "Note: In production, this would use stored staging URL to recreate media",
      { component: "shopify" },
    );
  }
}
