/**
 * Debug API Routes Protection
 *
 * All /api/debug/* routes are disabled in production for security.
 * In development, they require a secure debug token.
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Completely disable debug endpoints in production
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not Found', { status: 404 })
  }

  // In development, require debug token
  const debugToken = process.env.DEBUG_SECRET_TOKEN || 'dev-only-token'
  const providedToken = request.headers.get('x-debug-token')

  if (providedToken !== debugToken) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  return NextResponse.json({
    message: 'Debug API is enabled in development mode only',
    endpoints: [
      '/api/debug/env',
      '/api/debug/token-status',
      '/api/debug/products',
      // List other debug endpoints
    ]
  })
}

export async function POST(request: NextRequest) {
  return GET(request)
}

export async function PUT(request: NextRequest) {
  return GET(request)
}

export async function DELETE(request: NextRequest) {
  return GET(request)
}

export async function PATCH(request: NextRequest) {
  return GET(request)
}
