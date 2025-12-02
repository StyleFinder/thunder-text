import { NextRequest, NextResponse } from 'next/server'
import { guardDebugRoute } from '../_middleware-guard'

export async function GET(request: NextRequest) {
  const guardResponse = guardDebugRoute('/api/debug/app-bridge-test');
  if (guardResponse) return guardResponse;
  const diagnostics = {
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      hasApiKey: !!process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
      hasApiSecret: !!process.env.SHOPIFY_API_SECRET,
      apiKeyPrefix: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY?.substring(0, 8),
      apiKeyLength: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY?.length,
      apiSecretLength: process.env.SHOPIFY_API_SECRET?.length,
    },
    headers: {
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
      host: request.headers.get('host'),
    },
    url: {
      full: request.url,
      searchParams: Object.fromEntries(request.nextUrl.searchParams),
    }
  }


  // SECURITY: Rely on middleware.ts for CORS instead of wildcard
  return NextResponse.json(diagnostics)
}