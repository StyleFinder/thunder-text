import { NextRequest, NextResponse } from 'next/server'
import { getShopToken } from '@/lib/shopify/token-manager'

// GET /api/shopify/verify-config?shop={shop}
// Diagnostic endpoint to verify Shopify configuration
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get('shop')

    if (!shop) {
      return NextResponse.json({
        success: false,
        error: 'Missing shop parameter'
      }, { status: 400 })
    }

    // Check environment variables (without exposing values)
    const config = {
      SHOPIFY_API_KEY: !!process.env.SHOPIFY_API_KEY,
      SHOPIFY_API_SECRET: !!process.env.SHOPIFY_API_SECRET,
      NEXT_PUBLIC_SHOPIFY_API_KEY: !!process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
      SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY
    }

    // Check if token exists in database
    let hasStoredToken = false
    let tokenCheckError = null

    try {
      const tokenResult = await getShopToken(shop)
      hasStoredToken = tokenResult.success && !!tokenResult.accessToken
    } catch (error) {
      tokenCheckError = error instanceof Error ? error.message : 'Unknown error'
    }

    // Determine overall status
    const missingVars = Object.entries(config)
      .filter(([_, value]) => !value)
      .map(([key]) => key)

    const criticalMissing = missingVars.filter(key =>
      ['SHOPIFY_API_KEY', 'SHOPIFY_API_SECRET'].includes(key)
    )

    const status = {
      tokenExchangeReady: config.SHOPIFY_API_KEY && config.SHOPIFY_API_SECRET,
      appBridgeReady: config.NEXT_PUBLIC_SHOPIFY_API_KEY,
      databaseReady: config.SUPABASE_URL && config.SUPABASE_ANON_KEY && config.SUPABASE_SERVICE_KEY,
      aiReady: config.OPENAI_API_KEY,
      hasStoredToken,
      canAuthenticate: hasStoredToken || (config.SHOPIFY_API_KEY && config.SHOPIFY_API_SECRET)
    }

    return NextResponse.json({
      success: true,
      shop,
      configuration: {
        ...config,
        status,
        missingVariables: missingVars,
        criticalMissing,
        tokenCheckError
      },
      recommendations: generateRecommendations(status, missingVars, hasStoredToken)
    })

  } catch (error) {
    console.error('Config verification error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to verify configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function generateRecommendations(status: {
  tokenExchangeReady: boolean
  appBridgeReady: boolean
  databaseReady: boolean
  aiReady: boolean
}, missingVars: string[], hasStoredToken: boolean): string[] {
  const recommendations = []

  if (!status.tokenExchangeReady) {
    recommendations.push('⚠️ CRITICAL: Add SHOPIFY_API_KEY and SHOPIFY_API_SECRET to Vercel environment variables')
    recommendations.push('These are required for Token Exchange authentication')
    recommendations.push('Find them in Shopify Partners Dashboard → Your App → Configuration')
  }

  if (!status.appBridgeReady) {
    recommendations.push('Add NEXT_PUBLIC_SHOPIFY_API_KEY for App Bridge functionality')
    recommendations.push('This should be the same as SHOPIFY_API_KEY but prefixed with NEXT_PUBLIC_')
  }

  if (!status.databaseReady) {
    recommendations.push('Configure Supabase environment variables for token storage')
  }

  if (!status.aiReady) {
    recommendations.push('Add OPENAI_API_KEY for AI-powered description generation')
  }

  if (!hasStoredToken && !status.tokenExchangeReady) {
    recommendations.push('⛔ App cannot authenticate without stored token OR Token Exchange credentials')
    recommendations.push('Either install the app through Shopify OR add the missing API credentials')
  }

  if (hasStoredToken && !status.tokenExchangeReady) {
    recommendations.push('✅ Can use existing stored token, but Token Exchange won\'t work for new sessions')
  }

  if (missingVars.length === 0) {
    recommendations.push('✅ All environment variables are configured')
  }

  return recommendations
}