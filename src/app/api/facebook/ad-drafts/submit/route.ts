/**
 * POST /api/facebook/ad-drafts/submit
 *
 * Submit an ad draft to Facebook Marketing API
 * Creates an ad creative and associates it with the selected campaign
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
 *
 * Note: instagram_actor_id has been DEPRECATED as of Facebook Marketing API v22.0
 * We no longer fetch or validate Instagram account IDs for basic ad creation.
 * Instagram placements require the newer instagram_user_id field and additional setup.
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
        component: "facebook-ad-drafts-submit",
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
    component: "facebook-ad-drafts-submit",
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
 * Since copy_from doesn't work for external URLs, we'll use bytes upload
 */
async function uploadAdImage(
  accessToken: string,
  adAccountId: string,
  imageUrl: string,
): Promise<{ hash: string }> {
  logger.info("Starting image upload to Facebook", {
    component: "facebook-ad-drafts-submit",
    operation: "uploadAdImage",
    adAccountId,
    imageUrl: imageUrl.substring(0, 100), // Log first 100 chars of URL
  });

  // Validate ad account ID format
  if (!adAccountId || !adAccountId.startsWith("act_")) {
    logger.error("Invalid ad account ID format", undefined, {
      component: "facebook-ad-drafts-submit",
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

  // Fetch image from Shopify CDN
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
        component: "facebook-ad-drafts-submit",
        operation: "uploadAdImage",
        status: response.status,
        errorCode: data.error?.code,
        errorType: data.error?.type,
        errorSubcode: data.error?.error_subcode,
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
    component: "facebook-ad-drafts-submit",
    operation: "uploadAdImage",
    imageHash: data.images?.bytes?.hash,
  });

  // Response format: { images: { bytes: { hash: "abc123" } } }
  return { hash: data.images?.bytes?.hash };
}

/**
 * Create ad creative on Facebook
 *
 * Note: instagram_actor_id has been DEPRECATED as of API v22.0 (full deprecation Jan 2026)
 * The new field is instagram_user_id, but it's only required for Instagram-specific ad types
 * (Threads ads, Click-to-Instagram messaging ads, etc.)
 *
 * For basic link ads, only page_id and link_data are required.
 * The ad will show on Facebook placements. Instagram placement requires additional setup.
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

  // Build the creative data - instagram_actor_id is deprecated and not needed for basic link ads
  const objectStorySpec: Record<string, unknown> = {
    page_id: pageId, // Required: Facebook page to post from
    link_data: {
      image_hash: imageHash, // Use image hash instead of image_url
      link: productUrl, // Link to Shopify product page
      message: body,
      name: title,
    },
  };

  const creativeData = {
    name: title,
    object_story_spec: objectStorySpec,
  };

  // DETAILED LOGGING - Log everything being sent
  logger.info("=== STEP 2: Creating Ad Creative - FULL REQUEST DETAILS ===", {
    component: "facebook-ad-drafts-submit",
    operation: "createAdCreative",
    requestUrl: `${FACEBOOK_GRAPH_URL}/${adAccountId}/adcreatives`,
    requestBody: JSON.stringify(creativeData, null, 2),
    adAccountId,
    pageId,
    title,
    titleLength: title.length,
    body,
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

  // DETAILED LOGGING - Log full response
  logger.info("=== STEP 2: Facebook Response ===", {
    component: "facebook-ad-drafts-submit",
    operation: "createAdCreative-response",
    httpStatus: response.status,
    httpOk: response.ok,
    hasError: !!data.error,
    fullResponse: JSON.stringify(data, null, 2),
  });

  if (!response.ok || data.error) {
    logger.error(
      "=== STEP 2 FAILED: Facebook API Error - Ad Creative ===",
      new Error(data.error?.message || "Ad creative creation failed"),
      {
        component: "facebook-ad-drafts-submit",
        operation: "createAdCreative-ERROR",
        httpStatus: response.status,
        errorCode: data.error?.code,
        errorType: data.error?.type,
        errorSubcode: data.error?.error_subcode,
        errorUserTitle: data.error?.error_user_title,
        errorUserMsg: data.error?.error_user_msg,
        fullErrorObject: JSON.stringify(data.error, null, 2),
        adAccountId,
        pageId,
        title,
        titleLength: title.length,
        body,
        bodyLength: body.length,
        imageHash,
        productUrl,
        requestBody: JSON.stringify(creativeData, null, 2),
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
    component: "facebook-ad-drafts-submit",
    operation: "createAdCreative-SUCCESS",
    creativeId: data.id,
    title,
    bodyLength: body.length,
  });

  return data;
}

/**
 * Get or create ad set for campaign
 *
 * IMPORTANT: We always create a new ad set with Facebook-only placements.
 * This is because existing ad sets in the campaign may have Instagram placements enabled,
 * which would require an Instagram account (instagram_actor_id is deprecated).
 *
 * By creating our own ad set with explicit Facebook-only placements, we avoid the
 * "Your ad must be associated with an Instagram account" error.
 */
async function getOrCreateAdSet(
  accessToken: string,
  adAccountId: string,
  campaignId: string,
  adName: string,
): Promise<string> {
  logger.info("Creating Facebook-only ad set for campaign", {
    component: "facebook-ad-drafts-submit",
    operation: "getOrCreateAdSet",
    campaignId,
    adAccountId,
  });

  const adSetUrl = new URL(`${FACEBOOK_GRAPH_URL}/${adAccountId}/adsets`);
  adSetUrl.searchParams.set("access_token", accessToken);

  // Create ad set with explicit Facebook-only placements
  // This avoids the Instagram account requirement since we're not using Instagram placements
  const adSetData = {
    name: `Ad Set for ${adName}`,
    campaign_id: campaignId,
    status: "PAUSED", // Start paused so user can review
    // Required fields for ad set creation
    billing_event: "IMPRESSIONS", // Pay per impression
    optimization_goal: "LINK_CLICKS", // Optimize for link clicks (suitable for product ads)
    bid_strategy: "LOWEST_COST_WITHOUT_CAP", // Let Facebook optimize bids automatically
    daily_budget: 500, // $5.00 USD minimum daily budget (in cents)
    // IMPORTANT: Explicitly set Facebook-only placements to avoid Instagram account requirement
    targeting: {
      geo_locations: {
        countries: ["US"], // Default targeting
      },
      publisher_platforms: ["facebook"], // Facebook only, no Instagram
      facebook_positions: [
        "feed",
        "marketplace",
        "video_feeds",
        "right_hand_column",
      ], // Common Facebook placements
    },
  };

  logger.info("Creating Facebook-only ad set with full config", {
    component: "facebook-ad-drafts-submit",
    operation: "getOrCreateAdSet",
    adSetData: JSON.stringify(adSetData),
    billingEvent: "IMPRESSIONS",
    optimizationGoal: "LINK_CLICKS",
    bidStrategy: "LOWEST_COST_WITHOUT_CAP",
    dailyBudget: 500,
    publisherPlatforms: ["facebook"],
  });

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
        component: "facebook-ad-drafts-submit",
        operation: "getOrCreateAdSet",
        status: adSetResponse.status,
        errorCode: adSetResult.error?.code,
        errorType: adSetResult.error?.type,
        errorSubcode: adSetResult.error?.error_subcode,
        fullError: JSON.stringify(adSetResult.error),
        campaignId,
        adAccountId,
        requestBody: JSON.stringify(adSetData),
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
    component: "facebook-ad-drafts-submit",
    operation: "getOrCreateAdSet",
    adSetId: adSetResult.id,
  });

  return adSetResult.id;
}

/**
 * Create ad in campaign using existing ad set
 */
async function createAd(
  accessToken: string,
  adAccountId: string,
  campaignId: string,
  creativeId: string,
  adName: string,
): Promise<{ id: string; adset_id?: string }> {
  // Get or create ad set (preferring existing ones)
  const adSetId = await getOrCreateAdSet(
    accessToken,
    adAccountId,
    campaignId,
    adName,
  );

  // Now create the ad - only needs creative, name, and status
  const adUrl = new URL(`${FACEBOOK_GRAPH_URL}/${adAccountId}/ads`);
  adUrl.searchParams.set("access_token", accessToken);

  const adData = {
    name: adName,
    adset_id: adSetId,
    creative: { creative_id: creativeId },
    status: "PAUSED", // Start paused so user can review
  };

  // DETAILED LOGGING - Log everything being sent to Facebook
  logger.info("=== STEP 4: Creating Ad - FULL REQUEST DETAILS ===", {
    component: "facebook-ad-drafts-submit",
    operation: "createAd",
    requestUrl: `${FACEBOOK_GRAPH_URL}/${adAccountId}/ads`,
    requestBody: JSON.stringify(adData, null, 2),
    adAccountId,
    adSetId,
    creativeId,
    adName,
    adNameLength: adName.length,
  });

  const adResponse = await fetch(adUrl.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(adData),
  });

  const adResult = await adResponse.json();

  // DETAILED LOGGING - Log full Facebook response
  logger.info("=== STEP 4: Facebook Response ===", {
    component: "facebook-ad-drafts-submit",
    operation: "createAd-response",
    httpStatus: adResponse.status,
    httpOk: adResponse.ok,
    hasError: !!adResult.error,
    fullResponse: JSON.stringify(adResult, null, 2),
  });

  if (!adResponse.ok || adResult.error) {
    // Extract ALL error info from Facebook response
    const errorDetails = {
      message: adResult.error?.message,
      code: adResult.error?.code,
      type: adResult.error?.type,
      subcode: adResult.error?.error_subcode,
      userTitle: adResult.error?.error_user_title,
      userMsg: adResult.error?.error_user_msg,
      blameFieldSpecs: adResult.error?.error_data?.blame_field_specs,
      isTransient: adResult.error?.is_transient,
      fbtraceId: adResult.error?.fbtrace_id,
    };

    logger.error(
      "=== STEP 4 FAILED: Facebook API Error - Ad Creation ===",
      new Error(adResult.error?.message || "Ad creation failed"),
      {
        component: "facebook-ad-drafts-submit",
        operation: "createAd-ERROR",
        httpStatus: adResponse.status,
        errorCode: errorDetails.code,
        errorSubcode: errorDetails.subcode,
        errorType: errorDetails.type,
        errorMessage: errorDetails.message,
        errorUserTitle: errorDetails.userTitle,
        errorUserMsg: errorDetails.userMsg,
        errorBlameFields: JSON.stringify(errorDetails.blameFieldSpecs),
        errorIsTransient: errorDetails.isTransient,
        fbtraceId: errorDetails.fbtraceId,
        fullErrorObject: JSON.stringify(adResult.error, null, 2),
        // Request context
        adAccountId,
        adSetId,
        creativeId,
        adName,
        adNameLength: adName.length,
        requestBody: JSON.stringify(adData, null, 2),
      },
    );

    // Include more details in the thrown error
    const errorMessage = [
      `[STEP 4: Ad Creation]`,
      errorDetails.message || "Failed to create ad",
      `(code: ${errorDetails.code || "none"}`,
      `subcode: ${errorDetails.subcode || "none"}`,
      `type: ${errorDetails.type || "none"})`,
      errorDetails.userMsg ? `\nUser Message: ${errorDetails.userMsg}` : "",
      errorDetails.blameFieldSpecs
        ? `\nBlame Fields: ${JSON.stringify(errorDetails.blameFieldSpecs)}`
        : "",
    ]
      .filter(Boolean)
      .join(" ");

    throw new FacebookAPIError(
      errorMessage,
      adResponse.status,
      adResult.error?.code,
      adResult.error?.type,
    );
  }

  logger.info("Ad created successfully", {
    component: "facebook-ad-drafts-submit",
    operation: "createAd",
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
    const { shop, draft_id } = body;

    if (!shop || !draft_id) {
      return NextResponse.json(
        { success: false, error: "Shop and draft_id are required" },
        { status: 400 },
      );
    }

    // Get shop_id (with fallback for standalone users)
    const { data: shopData, error: shopError } = await lookupShopWithFallback<{
      id: string;
      shop_domain: string;
    }>(supabaseAdmin, shop, "id, shop_domain", "ad-drafts-submit");

    if (shopError || !shopData) {
      logger.error(
        "Shop not found for ad submission",
        shopError || new Error("Shop not found"),
        {
          component: "facebook-ad-drafts-submit",
          operation: "POST",
          shop,
        },
      );
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 404 },
      );
    }

    // Get ad draft
    const { data: draft, error: draftError } = await supabaseAdmin
      .from("facebook_ad_drafts")
      .select("*")
      .eq("id", draft_id)
      .eq("shop_id", shopData.id)
      .single();

    if (draftError || !draft) {
      return NextResponse.json(
        { success: false, error: "Ad draft not found" },
        { status: 404 },
      );
    }

    if (draft.status === "submitted") {
      return NextResponse.json(
        { success: false, error: "Ad draft already submitted" },
        { status: 400 },
      );
    }

    if (!draft.facebook_ad_account_id) {
      return NextResponse.json(
        { success: false, error: "Ad draft is missing Facebook ad account ID" },
        { status: 400 },
      );
    }

    if (!draft.facebook_campaign_id) {
      return NextResponse.json(
        { success: false, error: "Ad draft is missing Facebook campaign ID" },
        { status: 400 },
      );
    }

    // DETAILED LOGGING - Log the draft data being submitted
    logger.info("=== AD SUBMISSION STARTED - FULL DRAFT DATA ===", {
      component: "facebook-ad-drafts-submit",
      operation: "POST-start",
      draftId: draft_id,
      shop,
      draft: {
        id: draft.id,
        ad_title: draft.ad_title,
        ad_title_length: draft.ad_title?.length,
        ad_copy: draft.ad_copy,
        ad_copy_length: draft.ad_copy?.length,
        facebook_ad_account_id: draft.facebook_ad_account_id,
        facebook_campaign_id: draft.facebook_campaign_id,
        facebook_campaign_name: draft.facebook_campaign_name,
        shopify_product_id: draft.shopify_product_id,
        image_urls: draft.image_urls,
        selected_image_url: draft.selected_image_url,
        additional_metadata: JSON.stringify(draft.additional_metadata),
      },
    });

    // Update status to submitting
    await supabaseAdmin
      .from("facebook_ad_drafts")
      .update({ status: "submitting" })
      .eq("id", draft_id);

    try {
      // Get access token and page ID
      // Note: instagram_actor_id is deprecated, we no longer use it for basic ad creation
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

      // Construct product URL from shop domain and product handle
      // Product handle is stored in additional_metadata or we can fetch it
      let productUrl = `https://${shop}`;

      if (draft.shopify_product_id) {
        // Get product handle from Shopify product ID
        // Format: gid://shopify/Product/123456 -> extract 123456 as handle fallback
        const metadata = draft.additional_metadata as Record<
          string,
          unknown
        > | null;
        const productHandle =
          (metadata?.product_handle as string | undefined) ||
          draft.shopify_product_id.split("/").pop();
        productUrl = `https://${shop}/products/${productHandle}`;
      }

      const imageUrl = draft.selected_image_url || draft.image_urls[0];

      // Upload image to Facebook first
      const { hash: imageHash } = await uploadAdImage(
        accessToken,
        draft.facebook_ad_account_id,
        imageUrl,
      );

      // Create ad creative with image hash
      // Note: instagram_actor_id is deprecated, ads will show on Facebook placements
      const creative = await createAdCreative(
        accessToken,
        draft.facebook_ad_account_id,
        draft.ad_title,
        draft.ad_copy,
        imageHash,
        productUrl,
        pageId,
      );

      // Create ad in campaign
      const ad = (await createAd(
        accessToken,
        draft.facebook_ad_account_id,
        draft.facebook_campaign_id,
        creative.id,
        draft.ad_title,
      )) as { id: string; adset_id?: string };

      // Update draft with success
      const { data: updatedDraft, error: updateError } = await supabaseAdmin
        .from("facebook_ad_drafts")
        .update({
          status: "submitted",
          facebook_ad_id: ad.id,
          facebook_adset_id: ad.adset_id || null,
          facebook_creative_id: creative.id,
          submitted_at: new Date().toISOString(),
        })
        .eq("id", draft_id)
        .select()
        .single();

      if (updateError) {
        logger.error(
          "Error updating draft after submission",
          new Error(updateError.message),
          {
            component: "facebook-ad-drafts-submit",
            operation: "POST-updateDraft",
            draftId: draft_id,
            shop,
          },
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          draft: updatedDraft,
          facebook_ad_id: ad.id,
          facebook_adset_id: ad.adset_id,
          facebook_creative_id: creative.id,
          message:
            "Ad successfully created in Facebook. It has been created in PAUSED status for your review.",
        },
      });
    } catch (submitError) {
      // Update draft with error
      const errorMessage =
        submitError instanceof Error ? submitError.message : "Unknown error";
      const errorCode =
        submitError instanceof FacebookAPIError
          ? submitError.errorCode
          : undefined;

      await supabaseAdmin
        .from("facebook_ad_drafts")
        .update({
          status: "failed",
          error_message: errorMessage,
          error_code: errorCode,
          retry_count: draft.retry_count + 1,
        })
        .eq("id", draft_id);

      throw submitError;
    }
  } catch (error) {
    logger.error(
      "Error in POST /api/facebook/ad-drafts/submit",
      error as Error,
      {
        component: "facebook-ad-drafts-submit",
        operation: "POST",
      },
    );

    if (error instanceof FacebookAPIError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.errorCode,
          type: error.errorType,
          // Include full details for debugging
          debug: {
            errorCode: error.errorCode,
            errorType: error.errorType,
            statusCode: error.statusCode,
            message: error.message,
          },
        },
        { status: error.statusCode || 500 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to submit ad to Facebook",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
