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
  // Fetch image from Shopify CDN
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new FacebookAPIError(
      `Failed to fetch image from ${imageUrl}`,
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
        imageUrl,
        adAccountId,
      },
    );
    throw new FacebookAPIError(
      data.error?.message || "Failed to upload image",
      response.status,
      data.error?.code,
      data.error?.type,
    );
  }

  // Response format: { images: { bytes: { hash: "abc123" } } }
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

  const creativeData = {
    name: title,
    object_story_spec: {
      page_id: pageId, // Required: Facebook page to post from
      link_data: {
        image_hash: imageHash, // Use image hash instead of image_url
        link: productUrl, // Link to Shopify product page
        message: body,
        name: title,
      },
    },
  };

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
      "Facebook API error - Ad Creative",
      new Error(data.error?.message || "Ad creative creation failed"),
      {
        component: "facebook-ad-drafts-submit",
        operation: "createAdCreative",
        status: response.status,
        errorCode: data.error?.code,
        errorType: data.error?.type,
        adAccountId,
        pageId,
        title,
        imageHash,
      },
    );
    throw new FacebookAPIError(
      data.error?.message || "Failed to create ad creative",
      response.status,
      data.error?.code,
      data.error?.type,
    );
  }

  return data;
}

/**
 * Get campaign details to determine objective
 */
async function getCampaignObjective(
  accessToken: string,
  campaignId: string,
): Promise<string> {
  const url = new URL(`${FACEBOOK_GRAPH_URL}/${campaignId}`);
  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("fields", "objective");

  const response = await fetch(url.toString());
  const data = await response.json();

  return data.objective || "OUTCOME_TRAFFIC";
}

/**
 * Get or create ad set for campaign
 * Fetches existing ad sets from campaign and uses the first active one
 * If no ad sets exist, creates one with proper billing_event and optimization_goal
 */
async function getOrCreateAdSet(
  accessToken: string,
  adAccountId: string,
  campaignId: string,
  adName: string,
): Promise<string> {
  // First, fetch existing ad sets from the campaign
  const campaignAdSetsUrl = new URL(
    `${FACEBOOK_GRAPH_URL}/${campaignId}/adsets`,
  );
  campaignAdSetsUrl.searchParams.set("access_token", accessToken);
  campaignAdSetsUrl.searchParams.set(
    "fields",
    "id,name,status,effective_status",
  );
  campaignAdSetsUrl.searchParams.set("limit", "25");

  const fetchResponse = await fetch(campaignAdSetsUrl.toString());
  const fetchResult = await fetchResponse.json();

  if (fetchResponse.ok && fetchResult.data && fetchResult.data.length > 0) {
    // Use the first ad set (preferably active)
    const activeAdSet =
      fetchResult.data.find(
        (as: { status: string; effective_status: string; id: string }) =>
          as.status === "ACTIVE" || as.effective_status === "ACTIVE",
      ) || fetchResult.data[0];

    return activeAdSet.id;
  }

  // If no ad sets exist, create one with required fields
  // First get the campaign objective to determine appropriate settings
  const objective = await getCampaignObjective(accessToken, campaignId);

  const adSetUrl = new URL(`${FACEBOOK_GRAPH_URL}/${adAccountId}/adsets`);
  adSetUrl.searchParams.set("access_token", accessToken);

  // Set billing_event and optimization_goal based on campaign objective
  // These are REQUIRED by Facebook's API and do NOT inherit from campaign
  let billingEvent = "IMPRESSIONS";
  let optimizationGoal = "LINK_CLICKS";

  // Map campaign objectives to appropriate ad set settings
  // See: https://developers.facebook.com/docs/marketing-api/reference/ad-campaign-group
  if (
    objective === "OUTCOME_TRAFFIC" ||
    objective === "LINK_CLICKS" ||
    objective === "TRAFFIC"
  ) {
    billingEvent = "IMPRESSIONS";
    optimizationGoal = "LINK_CLICKS";
  } else if (
    objective === "OUTCOME_ENGAGEMENT" ||
    objective === "POST_ENGAGEMENT" ||
    objective === "ENGAGEMENT"
  ) {
    billingEvent = "IMPRESSIONS";
    optimizationGoal = "POST_ENGAGEMENT";
  } else if (
    objective === "OUTCOME_AWARENESS" ||
    objective === "BRAND_AWARENESS" ||
    objective === "REACH"
  ) {
    billingEvent = "IMPRESSIONS";
    optimizationGoal = "REACH";
  } else if (
    objective === "OUTCOME_SALES" ||
    objective === "CONVERSIONS" ||
    objective === "PRODUCT_CATALOG_SALES"
  ) {
    // For conversion campaigns, use link clicks as a fallback
    // Full conversion optimization requires pixel setup
    billingEvent = "IMPRESSIONS";
    optimizationGoal = "LINK_CLICKS";
  } else if (objective === "OUTCOME_LEADS" || objective === "LEAD_GENERATION") {
    billingEvent = "IMPRESSIONS";
    optimizationGoal = "LEAD_GENERATION";
  } else {
    // Default fallback for any other objective
    billingEvent = "IMPRESSIONS";
    optimizationGoal = "LINK_CLICKS";
  }

  const adSetData = {
    name: `Ad Set for ${adName}`,
    campaign_id: campaignId,
    status: "PAUSED", // Start paused so user can review
    billing_event: billingEvent,
    optimization_goal: optimizationGoal,
    targeting: {
      geo_locations: {
        countries: ["US"], // Default targeting - user can adjust in Ads Manager
      },
    },
    // Use lowest bid cap to let Facebook optimize
    bid_strategy: "LOWEST_COST_WITHOUT_CAP",
  };

  logger.info("Creating ad set with settings", {
    component: "facebook-ad-drafts-submit",
    operation: "getOrCreateAdSet",
    objective,
    billingEvent,
    optimizationGoal,
    campaignId,
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
        objective,
        adSetData: JSON.stringify(adSetData),
      },
    );
    throw new FacebookAPIError(
      adSetResult.error?.message || "Failed to create ad set",
      adSetResponse.status,
      adSetResult.error?.code,
      adSetResult.error?.type,
    );
  }

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
      "Facebook API error - Ad Creation",
      new Error(adResult.error?.message || "Ad creation failed"),
      {
        component: "facebook-ad-drafts-submit",
        operation: "createAd",
        status: adResponse.status,
        errorCode: adResult.error?.code,
        errorType: adResult.error?.type,
        adAccountId,
        adSetId,
        creativeId,
        adName,
      },
    );
    throw new FacebookAPIError(
      adResult.error?.message || "Failed to create ad",
      adResponse.status,
      adResult.error?.code,
      adResult.error?.type,
    );
  }

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

    // Update status to submitting
    await supabaseAdmin
      .from("facebook_ad_drafts")
      .update({ status: "submitting" })
      .eq("id", draft_id);

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
