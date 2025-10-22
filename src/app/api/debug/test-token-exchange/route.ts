import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // This endpoint will test Token Exchange with a mock session token
  // to identify what the actual error is

  const testResults = {
    environment: {
      hasApiKey: !!process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
      apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || 'NOT SET',
      hasApiSecret: !!process.env.SHOPIFY_API_SECRET,
      apiSecretLength: process.env.SHOPIFY_API_SECRET?.length || 0,
      nodeEnv: process.env.NODE_ENV,
      vercel: !!process.env.VERCEL,
    },
    tokenExchangeUrl: 'https://zunosai-staging-test-store.myshopify.com/admin/oauth/access_token',
    expectedPayload: {
      client_id: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || 'MISSING',
      client_secret: process.env.SHOPIFY_API_SECRET ? '[REDACTED]' : 'MISSING',
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      subject_token: '[SESSION_TOKEN_WOULD_GO_HERE]',
      subject_token_type: 'urn:ietf:params:oauth:token-type:id_token',
      requested_token_type: 'urn:shopify:params:oauth:token-type:online-access-token'
    },
    possibleIssues: [] as string[],
    shopifyConnectivity: null as unknown,
  }

  // Check for common issues
  if (!process.env.NEXT_PUBLIC_SHOPIFY_API_KEY) {
    testResults.possibleIssues.push('❌ NEXT_PUBLIC_SHOPIFY_API_KEY is not set')
  }

  if (!process.env.SHOPIFY_API_SECRET) {
    testResults.possibleIssues.push('❌ SHOPIFY_API_SECRET is not set')
  }

  // Check if API key format looks correct
  const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || ''
  if (apiKey && apiKey.length !== 32) {
    testResults.possibleIssues.push(`⚠️ API Key length is ${apiKey.length}, expected 32 characters`)
  }

  // Check if secret looks correct (should be 64 chars typically)
  const secretLength = process.env.SHOPIFY_API_SECRET?.length || 0
  if (secretLength > 0 && secretLength !== 64) {
    testResults.possibleIssues.push(`⚠️ API Secret length is ${secretLength}, typically 64 characters`)
  }

  // Check if the API key matches what we see in the HTML
  if (apiKey && apiKey !== 'fa85f3902882734b800968440c27447d') {
    testResults.possibleIssues.push('⚠️ API Key in environment does not match the one in HTML meta tag')
  }

  if (testResults.possibleIssues.length === 0) {
    testResults.possibleIssues.push('✅ Environment variables appear to be configured correctly')
  }

  // Test a simple HTTP request to Shopify (without actual token exchange)
  try {
    const testUrl = 'https://zunosai-staging-test-store.myshopify.com/admin/api/2025-01/shop.json'
    const testResponse = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': 'test-token', // This will fail but we want to see the response
      }
    })

    const responseText = await testResponse.text()
    testResults.shopifyConnectivity = {
      status: testResponse.status,
      statusText: testResponse.statusText,
      responsePreview: responseText.substring(0, 200),
      interpretation: testResponse.status === 401 ? '✅ Can reach Shopify (got 401 as expected)' : '⚠️ Unexpected response'
    }
  } catch (error) {
    testResults.shopifyConnectivity = {
      error: error instanceof Error ? error.message : 'Unknown error',
      interpretation: '❌ Cannot reach Shopify API'
    }
  }

  return NextResponse.json(testResults, { status: 200 })
}