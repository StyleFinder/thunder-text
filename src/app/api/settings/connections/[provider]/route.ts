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

/**
 * DELETE /api/settings/connections/[provider]
 *
 * Disconnects a specific integration
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const searchParams = req.nextUrl.searchParams
    const shop = searchParams.get('shop')

    if (!shop) {
      return NextResponse.json(
        { error: 'Missing shop parameter' },
        { status: 400 }
      )
    }

    // Get shop ID
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('id')
      .eq('shop_domain', shop)
      .single()

    if (shopError || !shopData) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      )
    }

    const { provider } = await params

    // Can't disconnect Shopify through this endpoint
    if (provider === 'shopify') {
      return NextResponse.json(
        { error: 'Cannot disconnect Shopify through this endpoint' },
        { status: 400 }
      )
    }

    // Map display provider name to database provider name
    // 'meta' in UI maps to 'facebook' in database
    const dbProviderName = provider === 'meta' ? 'facebook' : provider

    // Delete or deactivate the integration
    const { error: deleteError } = await supabaseAdmin
      .from('integrations')
      .update({ is_active: false })
      .eq('shop_id', shopData.id)
      .eq('provider', dbProviderName)

    if (deleteError) {
      logger.error(`Error disconnecting ${provider}:`, deleteError as Error, { component: '[provider]' })
      return NextResponse.json(
        { error: 'Failed to disconnect integration' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `${provider} disconnected successfully`
    })

  } catch (error: any) {
    logger.error(`Error disconnecting provider:`, error as Error, { component: '[provider]' })
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    )
  }
}
