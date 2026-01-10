import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { getAccessToken } from "@/lib/shopify-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ShopifyAPI } from "@/lib/shopify";
import { generateAltText } from "@/lib/services/alt-text-generator";
import { logger } from "@/lib/logger";

interface ProductWithImages {
  id: string;
  title: string;
  images: Array<{
    id: string;
    url: string | null;
    alt: string | null;
  }>;
}

/**
 * GET /api/shopify/products/bulk-alt-text
 *
 * Get a summary of alt text status across all products
 *
 * Query params:
 * - limit?: number (default: 50, max: 250)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const shopDomain = (session.user as { shopDomain?: string }).shopDomain;
    if (!shopDomain) {
      return NextResponse.json(
        { success: false, error: "Shop domain not found in session" },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 250);

    // Verify shop exists
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("id, shop_domain, linked_shopify_domain")
      .eq("shop_domain", shopDomain)
      .single();

    if (shopError || !shopData) {
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 404 }
      );
    }

    const fullShop = shopData.linked_shopify_domain || shopData.shop_domain;
    const accessToken = await getAccessToken(fullShop);

    const shopifyApi = new ShopifyAPI(fullShop, accessToken);

    // Get products with their media
    const productsResponse = await shopifyApi.getProducts(limit);

    let totalImages = 0;
    let imagesWithAlt = 0;
    let imagesWithoutAlt = 0;
    const productSummaries: Array<{
      id: string;
      title: string;
      totalImages: number;
      missingAlt: number;
    }> = [];

    for (const edge of productsResponse.products.edges) {
      const product = edge.node;
      const productImages = product.images.edges.map(imgEdge => imgEdge.node);

      const missing = productImages.filter(img => !img.altText || img.altText.trim() === '').length;
      const withAlt = productImages.length - missing;

      totalImages += productImages.length;
      imagesWithAlt += withAlt;
      imagesWithoutAlt += missing;

      if (missing > 0) {
        productSummaries.push({
          id: product.id,
          title: product.title,
          totalImages: productImages.length,
          missingAlt: missing,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalProducts: productsResponse.products.edges.length,
          totalImages,
          imagesWithAlt,
          imagesWithoutAlt,
          completionPercentage: totalImages > 0
            ? Math.round((imagesWithAlt / totalImages) * 100)
            : 100,
        },
        productsNeedingAltText: productSummaries,
        hasMoreProducts: productsResponse.products.pageInfo.hasNextPage,
      },
    });
  } catch (error) {
    logger.error("Error fetching bulk alt text status", error as Error, {
      component: "bulk-alt-text-api",
    });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/shopify/products/bulk-alt-text
 *
 * Process alt text for multiple products
 *
 * Body:
 * - productIds?: string[] (optional - specific products to process, otherwise processes all)
 * - maxProducts?: number (default: 10, max: 50 - limits how many products to process in one request)
 * - onlyMissing?: boolean (default: true - only generate for images without alt text)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const shopDomain = (session.user as { shopDomain?: string }).shopDomain;
    if (!shopDomain) {
      return NextResponse.json(
        { success: false, error: "Shop domain not found in session" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      productIds,
      maxProducts = 10,
      onlyMissing = true,
    } = body;

    // Limit max products per request to prevent timeouts
    const productsToProcess = Math.min(maxProducts, 50);

    // Verify shop exists
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("id, shop_domain, linked_shopify_domain")
      .eq("shop_domain", shopDomain)
      .single();

    if (shopError || !shopData) {
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 404 }
      );
    }

    const fullShop = shopData.linked_shopify_domain || shopData.shop_domain;
    const accessToken = await getAccessToken(fullShop);

    const shopifyApi = new ShopifyAPI(fullShop, accessToken);

    // Gather products to process
    const productsWithImages: ProductWithImages[] = [];

    if (productIds && productIds.length > 0) {
      // Process specific products
      for (const productId of productIds.slice(0, productsToProcess)) {
        try {
          const productGID = productId.startsWith("gid://")
            ? productId
            : `gid://shopify/Product/${productId}`;

          const mediaData = await shopifyApi.getProductMedia(productGID);
          productsWithImages.push({
            id: productGID,
            title: mediaData.productTitle,
            images: mediaData.images.map(img => ({
              id: img.id,
              url: img.url,
              alt: img.alt,
            })),
          });
        } catch (error) {
          logger.error(`Error fetching product ${productId}`, error as Error, {
            component: "bulk-alt-text-api",
          });
        }
      }
    } else {
      // Get products that need alt text
      const productsResponse = await shopifyApi.getProducts(productsToProcess);

      for (const edge of productsResponse.products.edges) {
        const product = edge.node;
        const images = product.images.edges.map(imgEdge => ({
          id: imgEdge.node.id,
          url: imgEdge.node.url,
          alt: imgEdge.node.altText,
        }));

        // Skip products that already have all alt text if onlyMissing
        const hasMissing = images.some(img => !img.alt || img.alt.trim() === '');
        if (onlyMissing && !hasMissing) {
          continue;
        }

        productsWithImages.push({
          id: product.id,
          title: product.title,
          images,
        });
      }
    }

    if (productsWithImages.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          message: "No products need alt text generation",
          productsProcessed: 0,
          imagesProcessed: 0,
          imagesUpdated: 0,
        },
      });
    }

    logger.info(`Bulk alt text: Processing ${productsWithImages.length} products`, {
      component: "bulk-alt-text-api",
      shopDomain: fullShop,
    });

    // Process each product
    const results: Array<{
      productId: string;
      productTitle: string;
      imagesProcessed: number;
      imagesUpdated: number;
      errors: string[];
    }> = [];

    let totalImagesProcessed = 0;
    let totalImagesUpdated = 0;
    let totalErrors = 0;

    for (const product of productsWithImages) {
      const productResult = {
        productId: product.id,
        productTitle: product.title,
        imagesProcessed: 0,
        imagesUpdated: 0,
        errors: [] as string[],
      };

      // Filter images to process
      let imagesToProcess = product.images.filter(img => img.url);
      if (onlyMissing) {
        imagesToProcess = imagesToProcess.filter(img => !img.alt || img.alt.trim() === '');
      }

      productResult.imagesProcessed = imagesToProcess.length;

      // Generate and apply alt text for each image
      const updates: Array<{ fileId: string; altText: string }> = [];

      for (const image of imagesToProcess) {
        try {
          const result = await generateAltText(image.url!, {
            productTitle: product.title,
          });

          updates.push({
            fileId: image.id,
            altText: result.altText,
          });

          // Rate limiting between images
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          productResult.errors.push(`Image ${image.id}: ${errorMessage}`);
        }
      }

      // Apply updates to Shopify
      if (updates.length > 0) {
        try {
          const updateResult = await shopifyApi.batchUpdateImageAltText(updates);
          productResult.imagesUpdated = updateResult.success;
          if (updateResult.errors.length > 0) {
            productResult.errors.push(...updateResult.errors);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          productResult.errors.push(`Update failed: ${errorMessage}`);
        }
      }

      results.push(productResult);
      totalImagesProcessed += productResult.imagesProcessed;
      totalImagesUpdated += productResult.imagesUpdated;
      totalErrors += productResult.errors.length;

      logger.debug(`Processed product ${product.title}`, {
        component: "bulk-alt-text-api",
        processed: productResult.imagesProcessed,
        updated: productResult.imagesUpdated,
        errors: productResult.errors.length,
      });
    }

    logger.info(`Bulk alt text complete`, {
      component: "bulk-alt-text-api",
      productsProcessed: productsWithImages.length,
      totalImagesProcessed,
      totalImagesUpdated,
      totalErrors,
    });

    return NextResponse.json({
      success: true,
      data: {
        productsProcessed: productsWithImages.length,
        imagesProcessed: totalImagesProcessed,
        imagesUpdated: totalImagesUpdated,
        errors: totalErrors,
        results,
      },
    });
  } catch (error) {
    logger.error("Error in bulk alt text generation", error as Error, {
      component: "bulk-alt-text-api",
    });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
