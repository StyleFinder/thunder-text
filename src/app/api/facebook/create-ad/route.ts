/**
 * POST /api/facebook/create-ad
 *
 * Create a Facebook ad from an ad_library entry
 * Takes an ad that was saved to the library and posts it to Facebook
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { FacebookAPIError } from "@/lib/services/facebook-api";
import { decryptToken } from "@/lib/services/encryption";
import { logger } from "@/lib/logger";
import { lookupShopWithFallback } from "@/lib/shop-lookup";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const FACEBOOK_API_VERSION = "v21.0";
const FACEBOOK_GRAPH_URL = `https://graph.facebook.com/${FACEBOOK_API_VERSION}`;

/**
 * Get access token and page ID for shop
 */
async function getAccessTokenAndPageId(shopId: string): Promise<{
  accessToken: string;
  pageId: string | null;
}> {
  const { data: integration, error } = await supabaseAdmin
    .from("integrations")
    .select(
      "encrypted_access_token, additional_metadata, id, provider, is_active",
    )
    .eq("shop_id", shopId)
    .eq("provider", "facebook")
    .eq("is_active", true)
    .single();

  if (error || !integration) {
    logger.error(
      "Facebook integration not found for shop",
      error || new Error("Integration not found"),
      {
        component: "facebook-create-ad",
        operation: "getAccessTokenAndPageId",
        shopId,
      },
    );
    throw new FacebookAPIError(
      "Facebook account not connected",
      404,
      "NOT_CONNECTED",
    );
  }

  const accessToken = await decryptToken(integration.encrypted_access_token);

  // Get facebook_page_id from additional_metadata
  const metadata = integration.additional_metadata as Record<
    string,
    unknown
  > | null;
  const pageId = (metadata?.facebook_page_id as string | undefined) || null;

  logger.info("Retrieved integration metadata", {
    component: "facebook-create-ad",
    operation: "getAccessTokenAndPageId",
    shopId,
    hasPageId: !!pageId,
    metadataKeys: metadata ? Object.keys(metadata) : [],
  });

  return {
    accessToken,
    pageId,
  };
}

/**
 * Upload image to Facebook Ad Account by URL
 */
async function uploadAdImage(
  accessToken: string,
  adAccountId: string,
  imageUrl: string,
): Promise<{ hash: string }> {
  logger.info("Starting image upload to Facebook", {
    component: "facebook-create-ad",
    operation: "uploadAdImage",
    adAccountId,
    imageUrl: imageUrl.substring(0, 100),
  });

  // Validate ad account ID format
  if (!adAccountId || !adAccountId.startsWith("act_")) {
    logger.error("Invalid ad account ID format", undefined, {
      component: "facebook-create-ad",
      operation: "uploadAdImage",
      adAccountId,
      expected: "act_XXXXXXXXX format",
    });
    throw new FacebookAPIError(
      `[STEP 1: Image Upload] Invalid ad account ID format: ${adAccountId}. Expected act_XXXXXXXXX format.`,
      400,
      "INVALID_AD_ACCOUNT_ID",
    );
  }

  // Fetch image from URL
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new FacebookAPIError(
      `[STEP 1: Image Upload] Failed to fetch image from ${imageUrl}`,
      imageResponse.status,
      "IMAGE_FETCH_ERROR",
    );
  }

  const imageBuffer = await imageResponse.arrayBuffer();
  const base64Image = Buffer.from(imageBuffer).toString("base64");

  // Upload using bytes parameter (base64-encoded image)
  const url = new URL(`${FACEBOOK_GRAPH_URL}/${adAccountId}/adimages`);
  url.searchParams.set("access_token", accessToken);

  const formData = new FormData();
  formData.append("bytes", base64Image);

  const response = await fetch(url.toString(), {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    logger.error(
      "Facebook API error - Image Upload",
      new Error(data.error?.message || "Image upload failed"),
      {
        component: "facebook-create-ad",
        operation: "uploadAdImage",
        status: response.status,
        errorCode: data.error?.code,
        errorType: data.error?.type,
        fullError: JSON.stringify(data.error),
        imageUrl: imageUrl.substring(0, 100),
        adAccountId,
      },
    );
    throw new FacebookAPIError(
      `[STEP 1: Image Upload] ${data.error?.message || "Failed to upload image"}`,
      response.status,
      data.error?.code,
      data.error?.type,
    );
  }

  logger.info("Image uploaded successfully", {
    component: "facebook-create-ad",
    operation: "uploadAdImage",
    imageHash: data.images?.bytes?.hash,
  });

  return { hash: data.images?.bytes?.hash };
}

/**
 * Create ad creative on Facebook
 */
async function createAdCreative(
  accessToken: string,
  adAccountId: string,
  title: string,
  body: string,
  imageHash: string,
  productUrl: string,
  pageId: string,
): Promise<{ id: string }> {
  const url = new URL(`${FACEBOOK_GRAPH_URL}/${adAccountId}/adcreatives`);
  url.searchParams.set("access_token", accessToken);

  const objectStorySpec: Record<string, unknown> = {
    page_id: pageId,
    link_data: {
      image_hash: imageHash,
      link: productUrl,
      message: body,
      name: title,
    },
  };

  const creativeData = {
    name: title,
    object_story_spec: objectStorySpec,
  };

  logger.info("=== STEP 2: Creating Ad Creative ===", {
    component: "facebook-create-ad",
    operation: "createAdCreative",
    adAccountId,
    pageId,
    title,
    titleLength: title.length,
    bodyLength: body.length,
    imageHash,
    productUrl,
  });

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(creativeData),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    logger.error(
      "=== STEP 2 FAILED: Facebook API Error - Ad Creative ===",
      new Error(data.error?.message || "Ad creative creation failed"),
      {
        component: "facebook-create-ad",
        operation: "createAdCreative-ERROR",
        httpStatus: response.status,
        errorCode: data.error?.code,
        errorType: data.error?.type,
        fullErrorObject: JSON.stringify(data.error, null, 2),
        adAccountId,
        pageId,
        title,
        bodyLength: body.length,
      },
    );
    throw new FacebookAPIError(
      `[STEP 2: Creative Creation] ${data.error?.message || "Failed to create ad creative"}`,
      response.status,
      data.error?.code,
      data.error?.type,
    );
  }

  logger.info("=== STEP 2 SUCCESS: Ad Creative Created ===", {
    component: "facebook-create-ad",
    operation: "createAdCreative-SUCCESS",
    creativeId: data.id,
  });

  return data;
}

/**
 * Get or create ad set for campaign
 */
async function getOrCreateAdSet(
  accessToken: string,
  adAccountId: string,
  campaignId: string,
  adName: string,
): Promise<string> {
  logger.info("Creating Facebook-only ad set for campaign", {
    component: "facebook-create-ad",
    operation: "getOrCreateAdSet",
    campaignId,
    adAccountId,
  });

  const adSetUrl = new URL(`${FACEBOOK_GRAPH_URL}/${adAccountId}/adsets`);
  adSetUrl.searchParams.set("access_token", accessToken);

  const adSetData = {
    name: `Ad Set for ${adName}`,
    campaign_id: campaignId,
    status: "PAUSED",
    billing_event: "IMPRESSIONS",
    optimization_goal: "LINK_CLICKS",
    bid_strategy: "LOWEST_COST_WITHOUT_CAP",
    daily_budget: 500, // $5.00 USD minimum
    targeting: {
      geo_locations: {
        countries: ["US"],
      },
      publisher_platforms: ["facebook"],
      facebook_positions: [
        "feed",
        "marketplace",
        "video_feeds",
        "right_hand_column",
      ],
    },
  };

  const adSetResponse = await fetch(adSetUrl.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(adSetData),
  });

  const adSetResult = await adSetResponse.json();

  if (!adSetResponse.ok || adSetResult.error) {
    logger.error(
      "Failed to create ad set",
      new Error(adSetResult.error?.message || "Ad set creation failed"),
      {
        component: "facebook-create-ad",
        operation: "getOrCreateAdSet",
        status: adSetResponse.status,
        errorCode: adSetResult.error?.code,
        fullError: JSON.stringify(adSetResult.error),
        campaignId,
        adAccountId,
      },
    );
    throw new FacebookAPIError(
      `[STEP 3: Ad Set Creation] ${adSetResult.error?.message || "Failed to create ad set"}`,
      adSetResponse.status,
      adSetResult.error?.code,
      adSetResult.error?.type,
    );
  }

  logger.info("Ad set created successfully", {
    component: "facebook-create-ad",
    operation: "getOrCreateAdSet",
    adSetId: adSetResult.id,
  });

  return adSetResult.id;
}

/**
 * Create ad in campaign
 */
async function createAd(
  accessToken: string,
  adAccountId: string,
  campaignId: string,
  creativeId: string,
  adName: string,
): Promise<{ id: string; adset_id?: string }> {
  const adSetId = await getOrCreateAdSet(
    accessToken,
    adAccountId,
    campaignId,
    adName,
  );

  const adUrl = new URL(`${FACEBOOK_GRAPH_URL}/${adAccountId}/ads`);
  adUrl.searchParams.set("access_token", accessToken);

  const adData = {
    name: adName,
    adset_id: adSetId,
    creative: { creative_id: creativeId },
    status: "PAUSED",
  };

  logger.info("=== STEP 4: Creating Ad ===", {
    component: "facebook-create-ad",
    operation: "createAd",
    adAccountId,
    adSetId,
    creativeId,
    adName,
  });

  const adResponse = await fetch(adUrl.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(adData),
  });

  const adResult = await adResponse.json();

  if (!adResponse.ok || adResult.error) {
    logger.error(
      "=== STEP 4 FAILED: Facebook API Error - Ad Creation ===",
      new Error(adResult.error?.message || "Ad creation failed"),
      {
        component: "facebook-create-ad",
        operation: "createAd-ERROR",
        httpStatus: adResponse.status,
        errorCode: adResult.error?.code,
        fullErrorObject: JSON.stringify(adResult.error, null, 2),
        adAccountId,
        adSetId,
        creativeId,
        adName,
      },
    );
    throw new FacebookAPIError(
      `[STEP 4: Ad Creation] ${adResult.error?.message || "Failed to create ad"}`,
      adResponse.status,
      adResult.error?.code,
      adResult.error?.type,
    );
  }

  logger.info("=== STEP 4 SUCCESS: Ad Created ===", {
    component: "facebook-create-ad",
    operation: "createAd-SUCCESS",
    adId: adResult.id,
    adSetId,
  });

  return {
    id: adResult.id,
    adset_id: adSetId,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shop, adId, adAccountId, campaignId } = body;

    if (!shop || !adId || !adAccountId || !campaignId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "shop, adId, adAccountId, and campaignId are required",
          },
        },
        { status: 400 },
      );
    }

    // Get shop_id (with fallback for standalone users)
    const { data: shopData, error: shopError } = await lookupShopWithFallback<{
      id: string;
      shop_domain: string;
    }>(supabaseAdmin, shop, "id, shop_domain", "facebook-create-ad");

    if (shopError || !shopData) {
      logger.error(
        "Shop not found for ad creation",
        shopError || new Error("Shop not found"),
        {
          component: "facebook-create-ad",
          operation: "POST",
          shop,
        },
      );
      return NextResponse.json(
        { success: false, error: { message: "Shop not found" } },
        { status: 404 },
      );
    }

    // Get ad from ad_library
    const { data: ad, error: adError } = await supabaseAdmin
      .from("ad_library")
      .select("*")
      .eq("id", adId)
      .eq("shop_id", shopData.id)
      .single();

    if (adError || !ad) {
      logger.error(
        "Ad not found in library",
        adError || new Error("Ad not found"),
        {
          component: "facebook-create-ad",
          operation: "POST",
          adId,
          shopId: shopData.id,
        },
      );
      return NextResponse.json(
        { success: false, error: { message: "Ad not found in library" } },
        { status: 404 },
      );
    }

    logger.info("=== FACEBOOK AD CREATION STARTED ===", {
      component: "facebook-create-ad",
      operation: "POST-start",
      adId,
      shop,
      headline: ad.headline,
      primaryTextLength: ad.primary_text?.length,
      imageUrls: ad.image_urls,
      adAccountId,
      campaignId,
    });

    // Normalize ad account ID format
    const normalizedAdAccountId = adAccountId.startsWith("act_")
      ? adAccountId
      : `act_${adAccountId}`;

    try {
      // Get access token and page ID
      const { accessToken, pageId } = await getAccessTokenAndPageId(
        shopData.id,
      );

      if (!pageId) {
        throw new FacebookAPIError(
          "No Facebook Page connected. Please reconnect your Facebook account to link a Page.",
          400,
          "NO_PAGE_ID",
        );
      }

      // Get product URL from metadata or construct from shop domain
      const productMetadata = ad.product_metadata as Record<
        string,
        unknown
      > | null;
      let productUrl = `https://${shopData.shop_domain}`;

      if (productMetadata?.handle) {
        productUrl = `https://${shopData.shop_domain}/products/${productMetadata.handle}`;
      } else if (productMetadata?.url) {
        productUrl = productMetadata.url as string;
      }

      // Get image URL (first image from the array)
      const imageUrl = ad.image_urls?.[0];
      if (!imageUrl) {
        throw new FacebookAPIError(
          "No image URL available for this ad",
          400,
          "NO_IMAGE",
        );
      }

      // Step 1: Upload image to Facebook
      const { hash: imageHash } = await uploadAdImage(
        accessToken,
        normalizedAdAccountId,
        imageUrl,
      );

      // Step 2: Create ad creative
      const creative = await createAdCreative(
        accessToken,
        normalizedAdAccountId,
        ad.headline,
        ad.primary_text,
        imageHash,
        productUrl,
        pageId,
      );

      // Steps 3 & 4: Create ad set and ad
      const fbAd = await createAd(
        accessToken,
        normalizedAdAccountId,
        campaignId,
        creative.id,
        ad.headline,
      );

      // Update ad_library with Facebook ad info
      const { error: updateError } = await supabaseAdmin
        .from("ad_library")
        .update({
          status: "active",
          published_at: new Date().toISOString(),
          // Store Facebook metadata for reference
          product_metadata: {
            ...productMetadata,
            facebook_ad_id: fbAd.id,
            facebook_adset_id: fbAd.adset_id,
            facebook_creative_id: creative.id,
            facebook_campaign_id: campaignId,
            facebook_ad_account_id: normalizedAdAccountId,
          },
        })
        .eq("id", adId);

      if (updateError) {
        logger.error(
          "Error updating ad library after Facebook submission",
          new Error(updateError.message),
          {
            component: "facebook-create-ad",
            operation: "POST-updateLibrary",
            adId,
          },
        );
      }

      logger.info("=== FACEBOOK AD CREATION COMPLETE ===", {
        component: "facebook-create-ad",
        operation: "POST-complete",
        adId,
        facebookAdId: fbAd.id,
        facebookAdsetId: fbAd.adset_id,
        facebookCreativeId: creative.id,
      });

      return NextResponse.json({
        success: true,
        data: {
          facebook_ad_id: fbAd.id,
          facebook_adset_id: fbAd.adset_id,
          facebook_creative_id: creative.id,
          message:
            "Ad successfully created in Facebook. It has been created in PAUSED status for your review.",
        },
      });
    } catch (submitError) {
      // Log the error with full context
      const _errorMessage =
        submitError instanceof Error ? submitError.message : "Unknown error";
      const errorCode =
        submitError instanceof FacebookAPIError
          ? submitError.errorCode
          : undefined;

      logger.error("Facebook ad creation failed", submitError as Error, {
        component: "facebook-create-ad",
        operation: "POST-error",
        adId,
        shop,
        errorCode,
      });

      throw submitError;
    }
  } catch (error) {
    logger.error("Error in POST /api/facebook/create-ad", error as Error, {
      component: "facebook-create-ad",
      operation: "POST",
    });

    if (error instanceof FacebookAPIError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: error.message,
            code: error.errorCode,
            type: error.errorType,
          },
        },
        { status: error.statusCode || 500 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Failed to create ad on Facebook",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      },
      { status: 500 },
    );
  }
}
