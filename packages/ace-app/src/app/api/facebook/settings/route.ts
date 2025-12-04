/**
 * GET/POST /api/facebook/settings
 *
 * Manages Facebook notification settings for email alerts
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireApp } from '@thunder-text/shared-backend';
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface FacebookNotificationSettings {
  primary_email: string
  additional_emails: string[]
  custom_conversion_benchmark: number
  custom_roas_benchmark: number
  alert_threshold_percentage: number
  notify_on_conversion: boolean
  notify_on_roas: boolean
  is_enabled: boolean
}

/**
 * GET - Fetch notification settings for a shop
 */
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Require ACE app subscription
    const claims = await requireApp('ace')(request);
    if (claims instanceof NextResponse) return claims;


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

    // Get notification settings
    const { data: settings, error: settingsError } = await supabase
      .from('facebook_notification_settings')
      .select('*')
      .eq('shop_id', shopData.id)
      .single()

    if (settingsError) {
      // If no settings exist yet, return null (not an error)
      if (settingsError.code === 'PGRST116') {
        return NextResponse.json({
          success: true,
          data: null,
        })
      }

      throw settingsError
    }

    return NextResponse.json({
      success: true,
      data: settings,
    })
  } catch (error) {
    console.error('Error in GET /api/facebook/settings:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch settings',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST - Create or update notification settings
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { shop, ...settingsData } = body as { shop: string } & FacebookNotificationSettings

    if (!shop) {
      return NextResponse.json(
        { success: false, error: 'Shop parameter is required' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!settingsData.primary_email) {
      return NextResponse.json(
        { success: false, error: 'Primary email is required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(settingsData.primary_email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid primary email format' },
        { status: 400 }
      )
    }

    // Validate additional emails
    for (const email of settingsData.additional_emails || []) {
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { success: false, error: `Invalid email format: ${email}` },
          { status: 400 }
        )
      }
    }

    // Validate benchmarks
    if (
      settingsData.custom_conversion_benchmark <= 0 ||
      settingsData.custom_roas_benchmark <= 0
    ) {
      return NextResponse.json(
        { success: false, error: 'Benchmarks must be greater than 0' },
        { status: 400 }
      )
    }

    // Validate threshold
    if (
      settingsData.alert_threshold_percentage < 0 ||
      settingsData.alert_threshold_percentage > 100
    ) {
      return NextResponse.json(
        { success: false, error: 'Alert threshold must be between 0 and 100' },
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

    // Upsert settings (insert or update if exists)
    const { data: settings, error: upsertError } = await supabase
      .from('facebook_notification_settings')
      .upsert(
        {
          shop_id: shopData.id,
          primary_email: settingsData.primary_email,
          additional_emails: settingsData.additional_emails || [],
          custom_conversion_benchmark: settingsData.custom_conversion_benchmark,
          custom_roas_benchmark: settingsData.custom_roas_benchmark,
          alert_threshold_percentage: settingsData.alert_threshold_percentage,
          notify_on_conversion: settingsData.notify_on_conversion,
          notify_on_roas: settingsData.notify_on_roas,
          is_enabled: settingsData.is_enabled,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'shop_id',
        }
      )
      .select()
      .single()

    if (upsertError) {
      throw upsertError
    }

    return NextResponse.json({
      success: true,
      data: settings,
    })
  } catch (error) {
    console.error('Error in POST /api/facebook/settings:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save settings',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
