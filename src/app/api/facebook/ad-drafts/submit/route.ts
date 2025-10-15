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
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const FACEBOOK_API_VERSION = 'v21.0'
const FACEBOOK_GRAPH_URL = `https://graph.facebook.com/${FACEBOOK_API_VERSION}`

/**
 * Get access token for shop
 */
async function getAccessToken(shopId: string): Promise<string> {
  const { data: integration, error } = await supabase
    .from('integrations')
    .select('encrypted_access_token')
    .eq('shop_id', shopId)
    .eq('provider', 'facebook')
    .eq('is_active', true)
    .single()

  if (error || !integration) {
    throw new FacebookAPIError('Facebook account not connected', 404, 'NOT_CONNECTED')
  }

  return await decryptToken(integration.encrypted_access_token)
}

/**
 * Create ad creative on Facebook
 */
async function createAdCreative(
  accessToken: string,
  adAccountId: string,
  title: string,
  body: string,
  imageUrl: string,
  pageId?: string
): Promise<{ id: string }> {
  const url = new URL(`${FACEBOOK_GRAPH_URL}/${adAccountId}/adcreatives`)
  url.searchParams.set('access_token', accessToken)

  const creativeData: any = {
    name: title,
    object_story_spec: {
      page_id: pageId || null, // Optional: Facebook page to post from
      link_data: {
        image_url: imageUrl,
        link: imageUrl, // Temporary - should be product URL
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
    bid_amount: 100, // $1.00 in cents
    status: 'PAUSED', // Start paused so user can review
    targeting: {
      geo_locations: {
        countries: ['US'] // Default targeting - user can adjust
      }
    }
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
    throw new FacebookAPIError(
      adSetResult.error?.message || 'Failed to create ad set',
      adSetResponse.status,
      adSetResult.error?.code,
      adSetResult.error?.type
    )
  }

  // Now create the ad
  const adUrl = new URL(`${FACEBOOK_GRAPH_URL}/${adAccountId}/ads`)
  adUrl.searchParams.set('access_token', accessToken)

  const adData = {
    name: adName,
    adset_id: adSetResult.id,
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
    throw new FacebookAPIError(
      adResult.error?.message || 'Failed to create ad',
      adResponse.status,
      adResult.error?.code,
      adResult.error?.type
    )
  }

  return {
    id: adResult.id,
    adset_id: adSetResult.id
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
    const { data: shopData, error: shopError } = await supabase
      .from('shops')
      .select('id')
      .eq('shop_domain', shop)
      .single()

    if (shopError || !shopData) {
      return NextResponse.json(
        { success: false, error: 'Shop not found' },
        { status: 404 }
      )
    }

    // Get ad draft
    const { data: draft, error: draftError } = await supabase
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
    await supabase
      .from('facebook_ad_drafts')
      .update({ status: 'submitting' })
      .eq('id', draft_id)

    try {
      // Get access token
      const accessToken = await getAccessToken(shopData.id)

      // Create ad creative
      const creative = await createAdCreative(
        accessToken,
        draft.facebook_ad_account_id,
        draft.ad_title,
        draft.ad_copy,
        draft.selected_image_url || draft.image_urls[0]
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
      const { data: updatedDraft, error: updateError } = await supabase
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

      await supabase
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
