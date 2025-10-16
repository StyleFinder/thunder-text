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
  console.log('🔍 [SUBMIT DEBUG] Querying integration for shop_id:', shopId)

  const { data: integration, error } = await supabaseAdmin
    .from('integrations')
    .select('encrypted_access_token, additional_metadata, id, provider, is_active')
    .eq('shop_id', shopId)
    .eq('provider', 'facebook')
    .eq('is_active', true)
    .single()

  console.log('📊 [SUBMIT DEBUG] Query result:', {
    found: !!integration,
    error: error?.message,
    errorCode: error?.code,
    integrationId: integration?.id,
    hasToken: !!integration?.encrypted_access_token,
    tokenLength: integration?.encrypted_access_token?.length
  })

  if (error || !integration) {
    console.error('❌ [SUBMIT DEBUG] Integration not found - throwing error')
    throw new FacebookAPIError('Facebook account not connected', 404, 'NOT_CONNECTED')
  }

  const accessToken = await decryptToken(integration.encrypted_access_token)
  console.log('✅ [SUBMIT DEBUG] Token decrypted successfully')

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

  console.log('🖼️ Facebook API uploadAdImage response:', {
    status: response.status,
    ok: response.ok,
    data
  })

  if (!response.ok || data.error) {
    console.error('❌ Facebook API uploadAdImage error:', data.error)
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

  console.log('📸 Facebook API createAdCreative response:', {
    status: response.status,
    ok: response.ok,
    data
  })

  if (!response.ok || data.error) {
    console.error('❌ Facebook API createAdCreative error:', data.error)
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
 * Create ad in campaign
 */
async function createAd(
  accessToken: string,
  adAccountId: string,
  campaignId: string,
  creativeId: string,
  adName: string
): Promise<{ id: string }> {
  // First, we need to get or create an ad set
  // For simplicity, we'll create a basic ad set
  const adSetUrl = new URL(`${FACEBOOK_GRAPH_URL}/${adAccountId}/adsets`)
  adSetUrl.searchParams.set('access_token', accessToken)

  const adSetData = {
    name: `Ad Set for ${adName}`,
    campaign_id: campaignId,
    daily_budget: 1000, // $10.00 in cents - user can adjust in Ads Manager
    billing_event: 'IMPRESSIONS',
    optimization_goal: 'REACH',
    status: 'PAUSED', // Start paused so user can review
    targeting: {
      geo_locations: {
        countries: ['US'] // Default targeting - user can adjust
      }
    }
    // Note: bid_amount removed - Facebook will optimize automatically using LOWEST_COST_WITHOUT_CAP strategy
  }

  console.log('📊 [ADSET DEBUG] Creating adSet with data:', JSON.stringify(adSetData, null, 2))
  console.log('📊 [ADSET DEBUG] URL:', adSetUrl.toString().replace(/access_token=[^&]+/, 'access_token=REDACTED'))

  const adSetResponse = await fetch(adSetUrl.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(adSetData)
  })

  const adSetResult = await adSetResponse.json()

  console.log('📊 [ADSET DEBUG] AdSet creation response:', {
    status: adSetResponse.status,
    ok: adSetResponse.ok,
    result: adSetResult,
    hasError: !!adSetResult.error
  })

  if (!adSetResponse.ok || adSetResult.error) {
    console.error('❌ [ADSET DEBUG] AdSet creation failed:', {
      error: adSetResult.error,
      errorMessage: adSetResult.error?.error_user_msg,
      errorSubcode: adSetResult.error?.error_subcode,
      errorUserTitle: adSetResult.error?.error_user_title,
      errorData: adSetResult.error?.error_data,
      fullError: JSON.stringify(adSetResult.error, null, 2)
    })
    throw new FacebookAPIError(
      adSetResult.error?.message || 'Failed to create ad set',
      adSetResponse.status,
      adSetResult.error?.code,
      adSetResult.error?.type
    )
  }

  console.log('✅ [ADSET DEBUG] AdSet created successfully:', adSetResult.id)

  // Now create the ad
  const adUrl = new URL(`${FACEBOOK_GRAPH_URL}/${adAccountId}/ads`)
  adUrl.searchParams.set('access_token', accessToken)

  const adData = {
    name: adName,
    adset_id: adSetResult.id,
    creative: { creative_id: creativeId },
    status: 'PAUSED' // Start paused so user can review
  }

  console.log('📢 [AD DEBUG] Creating ad with data:', JSON.stringify(adData, null, 2))
  console.log('📢 [AD DEBUG] URL:', adUrl.toString().replace(/access_token=[^&]+/, 'access_token=REDACTED'))

  const adResponse = await fetch(adUrl.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(adData)
  })

  const adResult = await adResponse.json()

  console.log('📢 [AD DEBUG] Ad creation response:', {
    status: adResponse.status,
    ok: adResponse.ok,
    result: adResult,
    hasError: !!adResult.error
  })

  if (!adResponse.ok || adResult.error) {
    console.error('❌ [AD DEBUG] Ad creation failed:', {
      error: adResult.error,
      errorMessage: adResult.error?.error_user_msg,
      errorSubcode: adResult.error?.error_subcode,
      errorUserTitle: adResult.error?.error_user_title,
      errorData: adResult.error?.error_data,
      fullError: JSON.stringify(adResult.error, null, 2)
    })
    throw new FacebookAPIError(
      adResult.error?.message || 'Failed to create ad',
      adResponse.status,
      adResult.error?.code,
      adResult.error?.type
    )
  }

  console.log('✅ [AD DEBUG] Ad created successfully:', adResult.id)

  return {
    id: adResult.id,
    adset_id: adSetResult.id
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { shop, draft_id } = body

    console.log('🚀 [SUBMIT DEBUG] Ad submission started:', { shop, draft_id })

    if (!shop || !draft_id) {
      return NextResponse.json(
        { success: false, error: 'Shop and draft_id are required' },
        { status: 400 }
      )
    }

    // Get shop_id
    console.log('🔍 [SUBMIT DEBUG] Looking up shop:', shop)
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('id, shop_domain')
      .eq('shop_domain', shop)
      .single()

    console.log('📊 [SUBMIT DEBUG] Shop lookup result:', {
      found: !!shopData,
      shopId: shopData?.id,
      shopDomain: shopData?.shop_domain,
      error: shopError?.message
    })

    if (shopError || !shopData) {
      console.error('❌ [SUBMIT DEBUG] Shop not found')
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

      console.log('📦 Creating ad with:', {
        pageId,
        productUrl,
        imageUrl
      })

      // Upload image to Facebook first
      console.log('🖼️ Uploading image to Facebook...')
      const { hash: imageHash } = await uploadAdImage(
        accessToken,
        draft.facebook_ad_account_id,
        imageUrl
      )
      console.log('✅ Image uploaded with hash:', imageHash)

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
