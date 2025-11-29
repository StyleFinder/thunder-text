import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
      console.error('Error fetching integrations:', integrationsError)
      return NextResponse.json(
        { error: 'Failed to fetch connections', connections: [] },
        { status: 500 }
      )
    }

    // Transform integrations to connections format
    const connections = (integrations || []).map(integration => ({
      provider: integration.provider,
      connected: integration.is_active === true,
      status: integration.is_active ? 'active' : 'inactive',
      metadata: {
        shop_domain: shop,
        provider_account_id: integration.provider_account_id,
        provider_account_name: integration.provider_account_name,
        ...integration.additional_metadata
      }
    }))

    // Add Shopify connection status (tracked in shops table, not integrations)
    connections.push({
      provider: 'shopify',
      connected: shopData.is_active === true,
      status: shopData.is_active ? 'active' : 'inactive',
      metadata: {
        shop_domain: shop
      }
    })

    return NextResponse.json({ connections })
  } catch (error) {
    console.error('Error in connections API:', error)
    return NextResponse.json(
      { error: 'Internal server error', connections: [] },
      { status: 500 }
    )
  }
}
