import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    // Check multiple things about the database connection

    // Check if shops table exists and has data
    const { data: shopsData, error: shopsError } = await supabaseAdmin
      .from('shops')
      .select('id, shop_domain')
      .limit(5)

    return NextResponse.json({
      success: !shopsError,

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
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined
    }, { status: 500 })
  }
}
