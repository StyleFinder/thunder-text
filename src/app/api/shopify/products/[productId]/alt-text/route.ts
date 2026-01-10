import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { getAccessToken } from "@/lib/shopify-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ShopifyAPI } from "@/lib/shopify";
import { generateAltText, generateAltTextBatch } from "@/lib/services/alt-text-generator";
import { logger } from "@/lib/logger";

/**
 * GET /api/shopify/products/[productId]/alt-text
 *
 * Get all images for a product with their current alt text status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
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

    const { productId } = await params;

    // Verify shop exists and is active
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

    // Ensure productId is a proper GID
    const productGID = productId.startsWith("gid://")
      ? productId
      : `gid://shopify/Product/${productId}`;

    const mediaData = await shopifyApi.getProductMedia(productGID);

    // Categorize images by alt text status
    const imagesWithAlt = mediaData.images.filter(img => img.alt && img.alt.trim() !== '');
    const imagesWithoutAlt = mediaData.images.filter(img => !img.alt || img.alt.trim() === '');

    return NextResponse.json({
      success: true,
      data: {
        productId: productGID,
        productTitle: mediaData.productTitle,
        totalImages: mediaData.images.length,
        imagesWithAlt: imagesWithAlt.length,
        imagesWithoutAlt: imagesWithoutAlt.length,
        images: mediaData.images.map(img => ({
          id: img.id,
          url: img.url,
          alt: img.alt,
          hasAlt: Boolean(img.alt && img.alt.trim() !== ''),
          status: img.status,
        })),
      },
    });
  } catch (error) {
    logger.error("Error fetching product media", error as Error, {
      component: "alt-text-api",
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
 * POST /api/shopify/products/[productId]/alt-text
 *
 * Generate and apply alt text for product images
 *
 * Body:
 * - onlyMissing?: boolean (default: true - only generate for images without alt text)
 * - imageIds?: string[] (optional - specific image IDs to process)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
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

    const { productId } = await params;
    const body = await request.json();
    const { onlyMissing = true, imageIds } = body;

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

    // Ensure productId is a proper GID
    const productGID = productId.startsWith("gid://")
      ? productId
      : `gid://shopify/Product/${productId}`;

    // Get product media
    const mediaData = await shopifyApi.getProductMedia(productGID);

    // Filter images to process
    let imagesToProcess = mediaData.images;

    // Filter by specific image IDs if provided
    if (imageIds && imageIds.length > 0) {
      imagesToProcess = imagesToProcess.filter(img => imageIds.includes(img.id));
    }

    // Filter to only missing alt text if requested
    if (onlyMissing) {
      imagesToProcess = imagesToProcess.filter(img => !img.alt || img.alt.trim() === '');
    }

    // Filter out images without URLs
    imagesToProcess = imagesToProcess.filter(img => img.url);

    if (imagesToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          message: onlyMissing
            ? "All images already have alt text"
            : "No images to process",
          processed: 0,
          updated: 0,
        },
      });
    }

    logger.info(`Generating alt text for ${imagesToProcess.length} images`, {
      component: "alt-text-api",
      productId: productGID,
      productTitle: mediaData.productTitle,
    });

    // Generate alt text for each image
    const batchInput = imagesToProcess.map(img => ({
      url: img.url!,
      productTitle: mediaData.productTitle,
    }));

    const altTextResults = await generateAltTextBatch(batchInput);

    // Map results back to file IDs and prepare updates
    const updates: Array<{ fileId: string; altText: string }> = [];
    const generatedAltTexts: Array<{ imageId: string; url: string; altText: string }> = [];

    for (let i = 0; i < imagesToProcess.length; i++) {
      const image = imagesToProcess[i];
      const result = altTextResults.results.find(r => r.imageUrl === image.url);

      if (result) {
        updates.push({
          fileId: image.id,
          altText: result.altText,
        });
        generatedAltTexts.push({
          imageId: image.id,
          url: image.url!,
          altText: result.altText,
        });
      }
    }

    // Apply updates to Shopify
    let updateResult = { success: 0, failed: 0, errors: [] as string[] };
    if (updates.length > 0) {
      updateResult = await shopifyApi.batchUpdateImageAltText(updates);
    }

    logger.info(`Alt text generation complete for product ${productGID}`, {
      component: "alt-text-api",
      processed: imagesToProcess.length,
      generated: altTextResults.results.length,
      updated: updateResult.success,
      failed: updateResult.failed,
    });

    return NextResponse.json({
      success: true,
      data: {
        productId: productGID,
        productTitle: mediaData.productTitle,
        processed: imagesToProcess.length,
        generated: altTextResults.results.length,
        updated: updateResult.success,
        failed: updateResult.failed,
        generatedAltTexts,
        errors: [
          ...altTextResults.errors.map(e => `Generation: ${e.error}`),
          ...updateResult.errors,
        ],
      },
    });
  } catch (error) {
    logger.error("Error generating alt text", error as Error, {
      component: "alt-text-api",
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
