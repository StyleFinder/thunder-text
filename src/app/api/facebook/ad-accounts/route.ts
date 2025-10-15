/**
 * GET /api/facebook/ad-accounts
 *
 * Retrieves all ad accounts for the connected Facebook user
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAdAccounts, FacebookAPIError } from '@/lib/services/facebook-api'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get('shop')

    if (!shop) {
      return NextResponse.json(
        { success: false, error: 'Shop parameter is required' },
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

    // Get ad accounts from Facebook API
    const adAccounts = await getAdAccounts(shopData.id)

    return NextResponse.json({
      success: true,
      data: adAccounts.map(account => ({
        id: account.id,
        account_id: account.account_id,
        name: account.name,
        status: account.account_status,
        currency: account.currency,
        timezone: account.timezone_name
      }))
    })

  } catch (error) {
    console.error('Error in GET /api/facebook/ad-accounts:', error)

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
        error: 'Failed to fetch ad accounts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
