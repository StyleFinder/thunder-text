import { NextResponse } from 'next/server'

export async function GET() {
  // Check critical environment variables for Shopify Token Exchange
  const envCheck = {
    shopifyApiKey: {
      exists: !!process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
      preview: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY
        ? process.env.NEXT_PUBLIC_SHOPIFY_API_KEY.substring(0, 10) + '...'
        : 'NOT SET',
      length: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY?.length || 0
    },
    shopifyApiSecret: {
      exists: !!process.env.SHOPIFY_API_SECRET,
      preview: process.env.SHOPIFY_API_SECRET
        ? process.env.SHOPIFY_API_SECRET.substring(0, 8) + '...'
        : 'NOT SET',
      length: process.env.SHOPIFY_API_SECRET?.length || 0,
      note: 'Required for Token Exchange'
    },
    shopifyAccessToken: {
      exists: !!process.env.SHOPIFY_ACCESS_TOKEN,
      preview: process.env.SHOPIFY_ACCESS_TOKEN
        ? process.env.SHOPIFY_ACCESS_TOKEN.substring(0, 5) + '...'
        : 'NOT SET',
      note: 'Legacy - not needed for Token Exchange'
    },
    supabaseUrl: {
      exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      value: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET'
    },
    supabaseServiceKey: {
      exists: !!process.env.SUPABASE_SERVICE_KEY,
      preview: process.env.SUPABASE_SERVICE_KEY
        ? process.env.SUPABASE_SERVICE_KEY.substring(0, 20) + '...'
        : 'NOT SET',
      length: process.env.SUPABASE_SERVICE_KEY?.length || 0
    },
    nodeEnv: process.env.NODE_ENV,
    vercel: !!process.env.VERCEL,
    vercelEnv: process.env.VERCEL_ENV,
  }

  // Check if we have the minimum required for Token Exchange
  const tokenExchangeReady =
    envCheck.shopifyApiKey.exists &&
    envCheck.shopifyApiSecret.exists &&
    envCheck.supabaseUrl.exists

  return NextResponse.json({
    status: tokenExchangeReady ? 'ready' : 'not_configured',
    tokenExchangeReady,
    environment: envCheck,
    requirements: {
      tokenExchange: {
        'NEXT_PUBLIC_SHOPIFY_API_KEY': envCheck.shopifyApiKey.exists ? '✅' : '❌',
        'SHOPIFY_API_SECRET': envCheck.shopifyApiSecret.exists ? '✅' : '❌',
        'Database (Supabase)': envCheck.supabaseUrl.exists ? '✅' : '❌',
      },
      optional: {
        'SHOPIFY_ACCESS_TOKEN': 'Not needed for Token Exchange',
        'SUPABASE_SERVICE_KEY': envCheck.supabaseServiceKey.exists ? '✅' : '⚠️ Using anon key'
      }
    },
    notes: [
      'SHOPIFY_API_SECRET is the Client Secret from Shopify Partners',
      'Token Exchange requires both API Key and Client Secret',
      'Session tokens are signed with the Client Secret',
      'Access tokens from Token Exchange are temporary (expires in ~24 hours)'
    ]
  })
}