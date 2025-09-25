import { NextResponse } from 'next/server'

export async function GET() {
  const encodedToken = process.env.NEXT_PUBLIC_SHOPIFY_TOKEN_B64

  const debugInfo = {
    hasEncodedToken: !!encodedToken,
    encodedTokenLength: encodedToken?.length || 0,
    encodedTokenPrefix: encodedToken?.substring(0, 10) || 'not found',
    allEnvKeys: Object.keys(process.env).filter(key =>
      key.includes('SHOPIFY') || key.includes('NEXT_PUBLIC')
    ),
    nodeEnv: process.env.NODE_ENV,
  }

  // Try to decode if exists
  if (encodedToken) {
    try {
      const decoded = Buffer.from(encodedToken, 'base64').toString('utf-8')
      debugInfo['decodedLength'] = decoded.length
      debugInfo['decodedPrefix'] = decoded.substring(0, 10)
      debugInfo['decodingSuccess'] = true
    } catch (error) {
      debugInfo['decodingError'] = error.message
      debugInfo['decodingSuccess'] = false
    }
  }

  return NextResponse.json(debugInfo)
}