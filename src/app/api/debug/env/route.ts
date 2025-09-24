import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Only allow in development or with special header
  const isDev = process.env.NODE_ENV === 'development'
  const hasDebugHeader = request.headers.get('x-debug-token') === 'thunder-text-debug'

  if (!isDev && !hasDebugHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check various environment variables
  const envCheck = {
    NODE_ENV: process.env.NODE_ENV,
    SHOPIFY_ACCESS_TOKEN: {
      exists: !!process.env.SHOPIFY_ACCESS_TOKEN,
      length: process.env.SHOPIFY_ACCESS_TOKEN?.length || 0,
      prefix: process.env.SHOPIFY_ACCESS_TOKEN?.substring(0, 10) || 'NOT_SET',
      suffix: process.env.SHOPIFY_ACCESS_TOKEN?.substring(process.env.SHOPIFY_ACCESS_TOKEN.length - 4) || 'NOT_SET'
    },
    SHOPIFY_API_KEY: {
      exists: !!process.env.SHOPIFY_API_KEY,
      length: process.env.SHOPIFY_API_KEY?.length || 0
    },
    SHOPIFY_API_SECRET: {
      exists: !!process.env.SHOPIFY_API_SECRET,
      length: process.env.SHOPIFY_API_SECRET?.length || 0
    },
    NEXT_PUBLIC_SHOPIFY_API_KEY: {
      exists: !!process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
      value: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY // Public keys are safe to show
    },
    SHOPIFY_AUTH_BYPASS: process.env.SHOPIFY_AUTH_BYPASS,
    NEXT_PUBLIC_SHOPIFY_AUTH_BYPASS: process.env.NEXT_PUBLIC_SHOPIFY_AUTH_BYPASS,
    SUPABASE_URL: {
      exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      value: process.env.NEXT_PUBLIC_SUPABASE_URL
    },
    SUPABASE_SERVICE_KEY: {
      exists: !!process.env.SUPABASE_SERVICE_KEY,
      length: process.env.SUPABASE_SERVICE_KEY?.length || 0
    },
    // Check if any SHOPIFY related env vars exist
    shopifyEnvVars: Object.keys(process.env).filter(key => key.includes('SHOPIFY')).sort()
  }

  return NextResponse.json({
    success: true,
    message: 'Environment variables check',
    data: envCheck,
    timestamp: new Date().toISOString()
  })
}