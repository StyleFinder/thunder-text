import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    // Check multiple things about the database connection

    // 1. Check if shops table exists and has data
    const { data: shopsData, error: shopsError } = await supabaseAdmin
      .from('shops')
      .select('id, shop_domain')
      .limit(5)

    // 2. Check if custom_sizing table exists
    const { data: sizingData, error: sizingError } = await supabaseAdmin
      .from('custom_sizing')
      .select('*')
      .limit(5)

    return NextResponse.json({
      success: !sizingError,

      // Custom sizing check
      custom_sizing: {
        exists: !sizingError,
        error_message: sizingError?.message || null,
        error_code: sizingError?.code || null,
        row_count: sizingData?.length || 0,
        sample_data: sizingData || null
      },

      // Shops table check (to verify database connection)
      shops: {
        exists: !shopsError,
        row_count: shopsData?.length || 0,
        shop_domains: shopsData?.map(s => s.shop_domain) || []
      },

      // Environment info
      environment: {
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET',
        supabase_url_from_env: process.env.SUPABASE_URL || 'NOT SET',
        has_service_key: !!process.env.SUPABASE_SERVICE_KEY,
        has_service_role_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        node_env: process.env.NODE_ENV || 'unknown'
      }
    })
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
      stack: err.stack
    }, { status: 500 })
  }
}
