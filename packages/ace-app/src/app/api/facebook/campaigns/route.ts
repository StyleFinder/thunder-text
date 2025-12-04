/**
 * GET /api/facebook/campaigns
 *
 * Retrieves active campaigns for a specific ad account
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireApp } from '@thunder-text/shared-backend';
import { createClient } from '@supabase/supabase-js'
import { getCampaigns, FacebookAPIError } from '@/lib/services/facebook-api'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Require ACE app subscription
    const claims = await requireApp('ace')(request);
    if (claims instanceof NextResponse) return claims;


    const { searchParams } = new URL(request.url)
    const shop = searchParams.get('shop')
    const adAccountId = searchParams.get('ad_account_id')
    const status = searchParams.get('status') as 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED' | null
    const limit = searchParams.get('limit')

    if (!shop) {
      return NextResponse.json(
        { success: false, error: 'Shop parameter is required' },
        { status: 400 }
      )
    }

    if (!adAccountId) {
      return NextResponse.json(
        { success: false, error: 'Ad account ID parameter is required' },
        { status: 400 }
      )
    }

    // Get shop_id from shop domain
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

    // Get campaigns from Facebook API
    const campaigns = await getCampaigns(shopData.id, adAccountId, {
      status: status || 'ACTIVE',
      limit: limit ? parseInt(limit) : 100
    })

    return NextResponse.json({
      success: true,
      data: campaigns.map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        objective: campaign.objective,
        daily_budget: campaign.daily_budget,
        lifetime_budget: campaign.lifetime_budget,
        created_time: campaign.created_time,
        updated_time: campaign.updated_time
      }))
    })

  } catch (error) {
    console.error('Error in GET /api/facebook/campaigns:', error)

    if (error instanceof FacebookAPIError) {
      if (error.errorCode === 'NOT_CONNECTED') {
        return NextResponse.json(
          {
            success: false,
            error: 'Facebook account not connected',
            code: 'NOT_CONNECTED'
          },
          { status: 404 }
        )
      }

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
        error: 'Failed to fetch campaigns',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
