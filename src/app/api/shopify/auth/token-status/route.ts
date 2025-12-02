/**
 * API endpoint to check token status and expiration
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createCorsHeaders } from '@/lib/middleware/cors'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request)

  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get('shop')

    if (!shop) {
      return NextResponse.json(
        { error: 'Shop parameter required' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Get shop token info from database
    const { data: shopData, error } = await supabaseAdmin
      .from('shops')
      .select('token_expires_at, needs_token_refresh, updated_at')
      .eq('shop_domain', shop)
      .single()

    if (error || !shopData) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Calculate if token needs refresh
    const now = new Date()
    let needsRefresh = shopData.needs_token_refresh || false
    let expiresIn = null

    if (shopData.token_expires_at) {
      const expiresAt = new Date(shopData.token_expires_at)
      const timeUntilExpiry = expiresAt.getTime() - now.getTime()
      expiresIn = Math.max(0, Math.floor(timeUntilExpiry / 1000)) // seconds

      // Need refresh if less than 5 minutes until expiry
      if (expiresIn < 300) {
        needsRefresh = true
      }
    } else {
      // If no expiration is set, assume online token (24 hours)
      // Check when it was last updated
      const updatedAt = new Date(shopData.updated_at)
      const timeSinceUpdate = now.getTime() - updatedAt.getTime()
      const hoursSinceUpdate = timeSinceUpdate / (1000 * 60 * 60)

      // Need refresh if updated more than 23 hours ago
      if (hoursSinceUpdate > 23) {
        needsRefresh = true
      }

      // Estimate expiration
      expiresIn = Math.max(0, Math.floor((24 - hoursSinceUpdate) * 60 * 60))
    }

    return NextResponse.json({
      needsRefresh,
      expiresIn, // seconds until expiration
      status: needsRefresh ? 'expiring' : 'valid'
    }, { headers: corsHeaders })

  } catch (error) {
    logger.error('❌ Token status check error:', error as Error, { component: 'token-status' })
    return NextResponse.json(
      { error: 'Failed to check token status' },
      { status: 500, headers: corsHeaders }
    )
  }
}