import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    // Check if custom_sizing table exists by querying it
    const { data, error } = await supabaseAdmin
      .from('custom_sizing')
      .select('*')
      .limit(1)

    return NextResponse.json({
      success: !error,
      table_exists: !error,
      error_message: error?.message || null,
      error_code: error?.code || null,
      sample_data: data || null,
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET',
      has_service_key: !!process.env.SUPABASE_SERVICE_KEY
    })
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
      stack: err.stack
    })
  }
}
