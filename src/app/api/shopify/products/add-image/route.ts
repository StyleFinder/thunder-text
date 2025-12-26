import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { getAccessToken } from "@/lib/shopify-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ShopifyImageUploader } from "@/lib/shopifyImageUploader";
import { logger } from "@/lib/logger";

/**
 * POST /api/shopify/products/add-image
 *
 * Add an image to a Shopify product
 *
 * Body:
 * - productId: string (Shopify product GID, e.g., "gid://shopify/Product/123")
 * - imageUrl: string (URL or base64 data URL of the image)
 * - altText?: string (optional alt text for the image)
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
    const { productId, imageUrl, altText = "Generated image" } = body;

    if (!productId || !imageUrl) {
      return NextResponse.json(
        { success: false, error: "productId and imageUrl are required" },
        { status: 400 }
      );
    }

    // Verify shop exists and is active
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("id, shop_domain, linked_shopify_domain, shopify_access_token")
      .eq("shop_domain", shopDomain)
      .single();

    if (shopError || !shopData) {
      logger.error("Shop not found", shopError as Error, {
        component: "add-image-api",
        shopDomain,
      });
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 404 }
      );
    }

    const fullShop = shopData.linked_shopify_domain || shopData.shop_domain;

    // Get access token
    let accessToken: string;
    try {
      accessToken = await getAccessToken(fullShop);
    } catch (error) {
      logger.error("Failed to get access token", error as Error, {
        component: "add-image-api",
        shop: fullShop,
      });
      return NextResponse.json(
        { success: false, error: "Failed to authenticate with Shopify" },
        { status: 401 }
      );
    }

    // Handle image URL - if it's not a base64 data URL, we need to fetch it first
    let imageData: string;
    if (imageUrl.startsWith("data:")) {
      imageData = imageUrl;
    } else {
      // Fetch the image and convert to base64
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        return NextResponse.json(
          { success: false, error: "Failed to fetch image from URL" },
          { status: 400 }
        );
      }
      const arrayBuffer = await imageResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
      imageData = `data:${contentType};base64,${buffer.toString("base64")}`;
    }

    // Use the ShopifyImageUploader to add the image to the product
    const uploader = new ShopifyImageUploader(fullShop, accessToken);

    // Ensure productId is a proper GID
    const productGID = productId.startsWith("gid://")
      ? productId
      : `gid://shopify/Product/${productId}`;

    const result = await uploader.uploadImageToProduct(productGID, imageData, altText);

    logger.info("Image added to product successfully", {
      component: "add-image-api",
      productId: productGID,
      mediaId: result.media?.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        mediaId: result.media?.id,
        imageUrl: result.media?.image?.url,
        status: result.media?.status,
      },
      message: "Image added to product successfully",
    });
  } catch (error) {
    logger.error("Error adding image to product", error as Error, {
      component: "add-image-api",
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
