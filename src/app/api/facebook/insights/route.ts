/**
 * GET /api/facebook/insights
 *
 * Retrieves campaign insights (conversion rate, ROAS, spend) for active campaigns
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCampaignInsights, FacebookAPIError } from '@/lib/services/facebook-api'
import { logger } from '@/lib/logger'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get('shop')
    const adAccountId = searchParams.get('ad_account_id')

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

    // Get campaign insights from Facebook API
    const insights = await getCampaignInsights(shopData.id, adAccountId)

    return NextResponse.json({
      success: true,
      data: insights
    })

  } catch (error) {
    logger.error('Error in GET /api/facebook/insights:', error as Error, { component: 'insights' })

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
        error: 'Failed to fetch campaign insights',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
