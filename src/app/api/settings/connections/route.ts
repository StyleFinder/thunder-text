import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const shop = searchParams.get('shop')

    if (!shop) {
      return NextResponse.json(
        { error: 'Missing shop parameter' },
        { status: 400 }
      )
    }

    // SECURITY: Verify the request is authenticated via session cookie
    const authenticatedShop = request.cookies.get('shopify_shop')?.value

    if (!authenticatedShop) {
      // No session cookie - user is not authenticated
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // SECURITY: Verify the authenticated user owns this shop
    // This prevents information disclosure via shop enumeration
    if (authenticatedShop !== shop) {
      logger.warn('[Connections API] Shop mismatch - possible enumeration attempt', {
        component: 'connections',
        requestedShop: shop,
        // Don't log the authenticated shop to avoid info leak in logs
      })
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // First, get the shop_id and is_active from shop_domain
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('id, is_active')
      .eq('shop_domain', shop)
      .single()

    if (shopError || !shopData) {
      return NextResponse.json(
        { error: 'Shop not found', connections: [] },
        { status: 404 }
      )
    }

    // Get all integrations for this shop
    const { data: integrations, error: integrationsError } = await supabaseAdmin
      .from('integrations')
      .select('*')
      .eq('shop_id', shopData.id)
      .eq('is_active', true)

    if (integrationsError) {
      logger.error('Error fetching integrations:', integrationsError as Error, { component: 'connections' })
      return NextResponse.json(
        { error: 'Failed to fetch connections', connections: [] },
        { status: 500 }
      )
    }

    // Define all available providers
    const allProviders = ['shopify', 'meta', 'google', 'tiktok', 'pinterest', 'klaviyo', 'mailchimp', 'lightspeed', 'commentsold']

    // Map integrations to include connection status for all providers
    const connections = allProviders.map(provider => {
      if (provider === 'shopify') {
        // Shopify connection status from shops table
        return {
          provider: 'shopify',
          connected: shopData.is_active === true,
          lastConnected: null,
          metadata: {
            shop_domain: shop
          }
        }
      }

      // Map display provider name to database provider name
      // 'meta' in UI maps to 'facebook' in database
      const dbProviderName = provider === 'meta' ? 'facebook' : provider

      // Check if integration exists for this provider
      const integration = integrations?.find(i => i.provider === dbProviderName)

      return {
        provider,
        connected: integration?.is_active === true || false,
        lastConnected: integration?.updated_at || null,
        metadata: integration ? {
          provider_account_id: integration.provider_account_id,
          provider_account_name: integration.provider_account_name,
          ...integration.additional_metadata
        } : null
      }
    })

    return NextResponse.json({ success: true, connections })
  } catch (error) {
    logger.error('Error in connections API:', error as Error, { component: 'connections' })
    return NextResponse.json(
      { error: 'Internal server error', connections: [] },
      { status: 500 }
    )
  }
}
