/**
 * POST /api/facebook/ad-drafts/submit
 *
 * Submit an ad draft to Facebook Marketing API
 * Creates an ad creative and associates it with the selected campaign
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { FacebookAPIError } from '@/lib/services/facebook-api'
import { decryptToken } from '@/lib/services/encryption'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

const FACEBOOK_API_VERSION = 'v21.0'
const FACEBOOK_GRAPH_URL = `https://graph.facebook.com/${FACEBOOK_API_VERSION}`

/**
 * Get access token and page ID for shop
 */
async function getAccessTokenAndPageId(shopId: string): Promise<{
  accessToken: string
  pageId: string | null
}> {
  const { data: integration, error } = await supabaseAdmin
    .from('integrations')
    .select('encrypted_access_token, additional_metadata, id, provider, is_active')
    .eq('shop_id', shopId)
    .eq('provider', 'facebook')
    .eq('is_active', true)
    .single()

  if (error || !integration) {
    console.error('Facebook integration not found for shop:', shopId, error?.message)
    throw new FacebookAPIError('Facebook account not connected', 404, 'NOT_CONNECTED')
  }

  const accessToken = await decryptToken(integration.encrypted_access_token)

  // Get facebook_page_id from additional_metadata
  const metadata = integration.additional_metadata as any
  const pageId = metadata?.facebook_page_id || null

  return {
    accessToken,
    pageId
  }
}

/**
 * Upload image to Facebook Ad Account by URL
 * Since copy_from doesn't work for external URLs, we'll use bytes upload
 */
async function uploadAdImage(
  accessToken: string,
  adAccountId: string,
  imageUrl: string
): Promise<{ hash: string }> {
  // Fetch image from Shopify CDN
  const imageResponse = await fetch(imageUrl)
  if (!imageResponse.ok) {
    throw new FacebookAPIError(
      `Failed to fetch image from ${imageUrl}`,
      imageResponse.status,
      'IMAGE_FETCH_ERROR'
    )
  }

  const imageBuffer = await imageResponse.arrayBuffer()
  const base64Image = Buffer.from(imageBuffer).toString('base64')

  // Upload using bytes parameter (base64-encoded image)
  const url = new URL(`${FACEBOOK_GRAPH_URL}/${adAccountId}/adimages`)
  url.searchParams.set('access_token', accessToken)

  const formData = new FormData()
  formData.append('bytes', base64Image)

  const response = await fetch(url.toString(), {
    method: 'POST',
    body: formData
  })

  const data = await response.json()

  if (!response.ok || data.error) {
    console.error('Failed to upload image to Facebook:', data.error)
    throw new FacebookAPIError(
      data.error?.message || 'Failed to upload image',
      response.status,
      data.error?.code,
      data.error?.type
    )
  }

  // Response format: { images: { bytes: { hash: "abc123" } } }
  return { hash: data.images?.bytes?.hash }
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
  pageId: string
): Promise<{ id: string }> {
  const url = new URL(`${FACEBOOK_GRAPH_URL}/${adAccountId}/adcreatives`)
  url.searchParams.set('access_token', accessToken)

  const creativeData: any = {
    name: title,
    object_story_spec: {
      page_id: pageId, // Required: Facebook page to post from
      link_data: {
        image_hash: imageHash, // Use image hash instead of image_url
        link: productUrl, // Link to Shopify product page
        message: body,
        name: title
      }
    }
  }

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(creativeData)
  })

  const data = await response.json()

  if (!response.ok || data.error) {
    console.error('Failed to create Facebook ad creative:', data.error)
    throw new FacebookAPIError(
      data.error?.message || 'Failed to create ad creative',
      response.status,
      data.error?.code,
      data.error?.type
    )
  }

  return data
}

/**
 * Get or create ad set for campaign
 * Fetches existing ad sets from campaign and uses the first active one
 * This ensures we inherit campaign's bid strategy and optimization settings
 */
async function getOrCreateAdSet(
  accessToken: string,
  adAccountId: string,
  campaignId: string,
  adName: string
): Promise<string> {
  // First, fetch existing ad sets from the campaign
  const campaignAdSetsUrl = new URL(`${FACEBOOK_GRAPH_URL}/${campaignId}/adsets`)
  campaignAdSetsUrl.searchParams.set('access_token', accessToken)
  campaignAdSetsUrl.searchParams.set('fields', 'id,name,status,effective_status')
  campaignAdSetsUrl.searchParams.set('limit', '25')

  const fetchResponse = await fetch(campaignAdSetsUrl.toString())
  const fetchResult = await fetchResponse.json()

  if (fetchResponse.ok && fetchResult.data && fetchResult.data.length > 0) {
    // Use the first ad set (preferably active)
    const activeAdSet = fetchResult.data.find((as: any) =>
      as.status === 'ACTIVE' || as.effective_status === 'ACTIVE'
    ) || fetchResult.data[0]

    return activeAdSet.id
  }

  // If no ad sets exist, create a minimal one that inherits campaign settings

  const adSetUrl = new URL(`${FACEBOOK_GRAPH_URL}/${adAccountId}/adsets`)
  adSetUrl.searchParams.set('access_token', accessToken)

  // Minimal ad set - only required fields, no bid strategy overrides
  const adSetData = {
    name: `Ad Set for ${adName}`,
    campaign_id: campaignId,
    status: 'PAUSED', // Start paused so user can review
    targeting: {
      geo_locations: {
        countries: ['US'] // Minimal default targeting
      }
    }
    // NO bid_amount, billing_event, optimization_goal - these are inherited from campaign
  }

  const adSetResponse = await fetch(adSetUrl.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(adSetData)
  })

  const adSetResult = await adSetResponse.json()

  if (!adSetResponse.ok || adSetResult.error) {
    console.error('Failed to create ad set:', adSetResult.error)
    throw new FacebookAPIError(
      adSetResult.error?.message || 'Failed to create ad set',
      adSetResponse.status,
      adSetResult.error?.code,
      adSetResult.error?.type
    )
  }

  return adSetResult.id
}

/**
 * Create ad in campaign using existing ad set
 */
async function createAd(
  accessToken: string,
  adAccountId: string,
  campaignId: string,
  creativeId: string,
  adName: string
): Promise<{ id: string }> {
  // Get or create ad set (preferring existing ones)
  const adSetId = await getOrCreateAdSet(accessToken, adAccountId, campaignId, adName)

  // Now create the ad - only needs creative, name, and status
  const adUrl = new URL(`${FACEBOOK_GRAPH_URL}/${adAccountId}/ads`)
  adUrl.searchParams.set('access_token', accessToken)

  const adData = {
    name: adName,
    adset_id: adSetId,
    creative: { creative_id: creativeId },
    status: 'PAUSED' // Start paused so user can review
  }

  const adResponse = await fetch(adUrl.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(adData)
  })

  const adResult = await adResponse.json()

  if (!adResponse.ok || adResult.error) {
    console.error('Failed to create Facebook ad:', adResult.error)
    throw new FacebookAPIError(
      adResult.error?.message || 'Failed to create ad',
      adResponse.status,
      adResult.error?.code,
      adResult.error?.type
    )
  }

  return {
    id: adResult.id,
    adset_id: adSetId
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { shop, draft_id } = body

    if (!shop || !draft_id) {
      return NextResponse.json(
        { success: false, error: 'Shop and draft_id are required' },
        { status: 400 }
      )
    }

    // Get shop_id
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('id, shop_domain')
      .eq('shop_domain', shop)
      .single()

    if (shopError || !shopData) {
      console.error('Shop not found for ad submission:', shop)
      return NextResponse.json(
        { success: false, error: 'Shop not found' },
        { status: 404 }
      )
    }

    // Get ad draft
    const { data: draft, error: draftError } = await supabaseAdmin
      .from('facebook_ad_drafts')
      .select('*')
      .eq('id', draft_id)
      .eq('shop_id', shopData.id)
      .single()

    if (draftError || !draft) {
      return NextResponse.json(
        { success: false, error: 'Ad draft not found' },
        { status: 404 }
      )
    }

    if (draft.status === 'submitted') {
      return NextResponse.json(
        { success: false, error: 'Ad draft already submitted' },
        { status: 400 }
      )
    }

    // Update status to submitting
    await supabaseAdmin
      .from('facebook_ad_drafts')
      .update({ status: 'submitting' })
      .eq('id', draft_id)

    try {
      // Get access token and page ID
      const { accessToken, pageId } = await getAccessTokenAndPageId(shopData.id)

      if (!pageId) {
        throw new FacebookAPIError(
          'No Facebook Page connected. Please reconnect your Facebook account to link a Page.',
          400,
          'NO_PAGE_ID'
        )
      }

      // Construct product URL from shop domain and product handle
      // Product handle is stored in additional_metadata or we can fetch it
      let productUrl = `https://${shop}`

      if (draft.shopify_product_id) {
        // Get product handle from Shopify product ID
        // Format: gid://shopify/Product/123456 -> extract 123456 as handle fallback
        const productHandle = draft.additional_metadata?.product_handle ||
                            draft.shopify_product_id.split('/').pop()
        productUrl = `https://${shop}/products/${productHandle}`
      }

      const imageUrl = draft.selected_image_url || draft.image_urls[0]

      // Upload image to Facebook first
      const { hash: imageHash } = await uploadAdImage(
        accessToken,
        draft.facebook_ad_account_id,
        imageUrl
      )

      // Create ad creative with image hash
      const creative = await createAdCreative(
        accessToken,
        draft.facebook_ad_account_id,
        draft.ad_title,
        draft.ad_copy,
        imageHash,
        productUrl,
        pageId
      )

      // Create ad in campaign
      const ad = await createAd(
        accessToken,
        draft.facebook_ad_account_id,
        draft.facebook_campaign_id,
        creative.id,
        draft.ad_title
      )

      // Update draft with success
      const { data: updatedDraft, error: updateError } = await supabaseAdmin
        .from('facebook_ad_drafts')
        .update({
          status: 'submitted',
          facebook_ad_id: ad.id,
          facebook_adset_id: ad.adset_id,
          facebook_creative_id: creative.id,
          submitted_at: new Date().toISOString()
        })
        .eq('id', draft_id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating draft after submission:', updateError)
      }

      return NextResponse.json({
        success: true,
        data: {
          draft: updatedDraft,
          facebook_ad_id: ad.id,
          facebook_adset_id: ad.adset_id,
          facebook_creative_id: creative.id,
          message: 'Ad successfully created in Facebook. It has been created in PAUSED status for your review.'
        }
      })

    } catch (submitError) {
      // Update draft with error
      const errorMessage = submitError instanceof Error ? submitError.message : 'Unknown error'
      const errorCode = submitError instanceof FacebookAPIError ? submitError.errorCode : undefined

      await supabaseAdmin
        .from('facebook_ad_drafts')
        .update({
          status: 'failed',
          error_message: errorMessage,
          error_code: errorCode,
          retry_count: draft.retry_count + 1
        })
        .eq('id', draft_id)

      throw submitError
    }

  } catch (error) {
    console.error('Error in POST /api/facebook/ad-drafts/submit:', error)

    if (error instanceof FacebookAPIError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.errorCode,
          type: error.errorType
        },
        { status: error.statusCode || 500 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to submit ad to Facebook',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
