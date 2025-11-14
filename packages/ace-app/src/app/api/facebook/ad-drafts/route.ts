/**
 * Facebook Ad Drafts API
 *
 * POST /api/facebook/ad-drafts - Create a new ad draft
 * GET /api/facebook/ad-drafts - List ad drafts for a shop
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireApp } from '@thunder-text/shared-backend';
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * GET - List ad drafts for a shop
 */
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Require ACE app subscription
    const claims = await requireApp('ace')(request);
    if (claims instanceof NextResponse) return claims;


    const { searchParams } = new URL(request.url)
    const shop = searchParams.get('shop')
    const status = searchParams.get('status') // Optional filter by status

    if (!shop) {
      return NextResponse.json(
        { success: false, error: 'Shop parameter is required' },
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

    // Build query
    let query = supabase
      .from('facebook_ad_drafts')
      .select('*')
      .eq('shop_id', shopData.id)
      .order('created_at', { ascending: false })

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status)
    }

    const { data: drafts, error: draftsError } = await query

    if (draftsError) {
      console.error('Error fetching ad drafts:', draftsError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch ad drafts' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: drafts || []
    })

  } catch (error) {
    console.error('Error in GET /api/facebook/ad-drafts:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch ad drafts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * POST - Create a new ad draft
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      shop,
      product_description_id,
      shopify_product_id,
      ad_title,
      ad_copy,
      image_urls,
      selected_image_url,
      facebook_campaign_id,
      facebook_campaign_name,
      facebook_ad_account_id
    } = body

    // Validation
    if (!shop) {
      return NextResponse.json(
        { success: false, error: 'Shop parameter is required' },
        { status: 400 }
      )
    }

    if (!ad_title || !ad_copy) {
      return NextResponse.json(
        { success: false, error: 'Ad title and copy are required' },
        { status: 400 }
      )
    }

    if (ad_title.length > 125) {
      return NextResponse.json(
        { success: false, error: 'Ad title must be 125 characters or less' },
        { status: 400 }
      )
    }

    if (ad_copy.length > 125) {
      return NextResponse.json(
        { success: false, error: 'Ad copy must be 125 characters or less' },
        { status: 400 }
      )
    }

    if (!image_urls || !Array.isArray(image_urls) || image_urls.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one image URL is required' },
        { status: 400 }
      )
    }

    if (image_urls.length > 10) {
      return NextResponse.json(
        { success: false, error: 'Maximum 10 images allowed' },
        { status: 400 }
      )
    }

    if (!facebook_campaign_id || !facebook_campaign_name) {
      return NextResponse.json(
        { success: false, error: 'Facebook campaign selection is required' },
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

    // Create ad draft
    const { data: draft, error: draftError } = await supabase
      .from('facebook_ad_drafts')
      .insert({
        shop_id: shopData.id,
        product_description_id: product_description_id || null,
        shopify_product_id: shopify_product_id || null,
        ad_title,
        ad_copy,
        image_urls,
        selected_image_url: selected_image_url || image_urls[0],
        facebook_campaign_id,
        facebook_campaign_name,
        facebook_ad_account_id: facebook_ad_account_id || null,
        status: 'draft'
      })
      .select()
      .single()

    if (draftError) {
      console.error('Error creating ad draft:', draftError)
      return NextResponse.json(
        { success: false, error: 'Failed to create ad draft' },
        { status: 500 }
      )
    }

    // If product_description_id provided, increment facebook_ads_created counter
    if (product_description_id) {
      await supabase.rpc('increment_facebook_ads_count', {
        description_id: product_description_id
      })
    }

    return NextResponse.json({
      success: true,
      data: draft
    })

  } catch (error) {
    console.error('Error in POST /api/facebook/ad-drafts:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create ad draft',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
