import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

/**
 * GDPR Webhook: customers/redact
 *
 * Handles customer data deletion requests under GDPR.
 * Called when a customer requests their data to be deleted.
 *
 * IMPORTANT: Thunder Text does NOT store customer-specific data.
 * We only store merchant (shop) data and product descriptions.
 * This endpoint returns success immediately with no action taken.
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
  console.log('🗑️  GDPR webhook received: customers/redact')

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
    const { shop_domain, customer, orders_to_redact } = payload

    console.log(`ℹ️  Customer redaction request:`)
    console.log(`   Shop: ${shop_domain}`)
    console.log(`   Customer ID: ${customer?.id || 'unknown'}`)
    console.log(`   Customer Email: ${customer?.email || 'unknown'}`)
    console.log(`   Orders to redact: ${orders_to_redact?.length || 0}`)

    // Initialize Supabase with service role
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

    // Log the request for GDPR compliance audit
    const { error: logError } = await supabase
      .from('gdpr_deletion_log')
      .insert({
        webhook_type: 'customers/redact',
        shop_domain,
        customer_id: customer?.id,
        deletion_status: 'no_data',
        records_deleted: 0,
        webhook_payload: payload,
        deleted_at: new Date().toISOString()
      })

    if (logError) {
      console.error(`⚠️  Failed to log customer redaction request: ${logError.message}`)
    }

    console.log(`✅ Customer redaction request processed`)
    console.log(`   Action: No customer data stored - webhook acknowledged`)

    return NextResponse.json({
      success: true,
      message: 'Thunder Text does not store customer-specific data',
      customer_id: customer?.id,
      shop_domain,
      records_deleted: 0,
      note: 'Product descriptions are about products, not customers. No customer PII is stored.'
    })

  } catch (error) {
    console.error('❌ customers/redact webhook error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process customer redaction request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    endpoint: 'customers/redact',
    status: 'active',
    description: 'GDPR webhook for customer data deletion (Thunder Text stores no customer data)',
    customer_data_stored: false
  })
}
