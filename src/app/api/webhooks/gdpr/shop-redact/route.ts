import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

/**
 * GDPR Webhook: shop/redact
 *
 * Handles merchant data deletion requests under GDPR.
 * Called when:
 * - Merchant uninstalls the app
 * - Merchant requests data deletion
 * - Shopify requires deletion (48 hours after uninstall)
 *
 * Required by Shopify for app approval.
 */

// Webhook verification helper
function verifyShopifyWebhook(body: string, hmacHeader: string): boolean {
  const secret = process.env.SHOPIFY_API_SECRET
  if (!secret) {
    console.error('❌ SHOPIFY_API_SECRET not configured')
    return false
  }

  const hash = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64')

  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(hmacHeader)
  )
}

export async function POST(request: NextRequest) {
  console.log('🗑️  GDPR webhook received: shop/redact')

  try {
    // Get raw body for HMAC verification
    const rawBody = await request.text()
    const hmacHeader = request.headers.get('x-shopify-hmac-sha256')

    // Verify webhook authenticity
    if (!hmacHeader || !verifyShopifyWebhook(rawBody, hmacHeader)) {
      console.error('❌ Invalid webhook signature')
      return NextResponse.json(
        { error: 'Unauthorized - Invalid webhook signature' },
        { status: 401 }
      )
    }

    // Parse webhook payload
    const payload = JSON.parse(rawBody)
    const { shop_domain, shop_id } = payload

    if (!shop_domain) {
      console.error('❌ Missing shop_domain in webhook payload')
      return NextResponse.json(
        { error: 'Missing shop_domain in payload' },
        { status: 400 }
      )
    }

    console.log(`🗑️  Processing deletion for shop: ${shop_domain}`)

    // Initialize Supabase with service role (bypass RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Begin deletion process
    let recordsDeleted = 0
    let deletionStatus: 'completed' | 'failed' | 'no_data' = 'no_data'
    let errorMessage: string | null = null

    try {
      // 1. Check if shop exists
      const { data: shop, error: fetchError } = await supabase
        .from('shops')
        .select('id, shop_domain')
        .eq('shop_domain', shop_domain)
        .single()

      if (fetchError || !shop) {
        console.log(`⚠️  Shop ${shop_domain} not found in database - already deleted or never existed`)
        deletionStatus = 'no_data'
      } else {
        console.log(`✅ Found shop: ${shop.id}`)

        // 2. Delete shop record (CASCADE will delete all related data)
        const { error: deleteError, count } = await supabase
          .from('shops')
          .delete()
          .eq('shop_domain', shop_domain)

        if (deleteError) {
          throw new Error(`Failed to delete shop: ${deleteError.message}`)
        }

        recordsDeleted = count || 1
        deletionStatus = 'completed'

        console.log(`✅ Deleted shop ${shop_domain}`)
        console.log(`   CASCADE deleted all related records`)
        console.log(`   Tables affected: business_profiles, content_samples, generated_content, etc.`)
      }

      // 3. Log the deletion for GDPR compliance audit
      const { error: logError } = await supabase
        .from('gdpr_deletion_log')
        .insert({
          webhook_type: 'shop/redact',
          shop_domain,
          shop_id,
          deletion_status: deletionStatus,
          records_deleted: recordsDeleted,
          webhook_payload: payload,
          deleted_at: new Date().toISOString()
        })

      if (logError) {
        console.error(`⚠️  Failed to log deletion: ${logError.message}`)
        // Don't fail the webhook, but log the error
      }

      console.log(`✅ GDPR deletion completed for ${shop_domain}`)
      console.log(`   Status: ${deletionStatus}`)
      console.log(`   Records deleted: ${recordsDeleted}`)

      return NextResponse.json({
        success: true,
        message: `Shop data deleted successfully`,
        shop_domain,
        records_deleted: recordsDeleted,
        status: deletionStatus
      })

    } catch (deletionError) {
      errorMessage = deletionError instanceof Error ? deletionError.message : 'Unknown error'
      deletionStatus = 'failed'

      console.error('❌ Deletion failed:', errorMessage)

      // Log the failed deletion
      await supabase
        .from('gdpr_deletion_log')
        .insert({
          webhook_type: 'shop/redact',
          shop_domain,
          shop_id,
          deletion_status: 'failed',
          error_message: errorMessage,
          webhook_payload: payload,
          deleted_at: new Date().toISOString()
        })
        .catch(err => console.error('Failed to log error:', err))

      throw deletionError
    }

  } catch (error) {
    console.error('❌ shop/redact webhook error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process deletion request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    endpoint: 'shop/redact',
    status: 'active',
    description: 'GDPR webhook for shop data deletion'
  })
}
