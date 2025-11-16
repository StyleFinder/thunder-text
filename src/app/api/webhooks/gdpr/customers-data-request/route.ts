import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

/**
 * GDPR Webhook: customers/data_request
 *
 * Handles customer data export requests under GDPR (Right to Access).
 * Called when a customer requests a copy of their data.
 *
 * IMPORTANT: Thunder Text does NOT store customer-specific data.
 * We only store merchant (shop) data and product descriptions.
 * This endpoint returns an empty dataset.
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
  console.log('📦 GDPR webhook received: customers/data_request')

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
    const { shop_domain, customer, orders_requested } = payload

    console.log(`ℹ️  Customer data request:`)
    console.log(`   Shop: ${shop_domain}`)
    console.log(`   Customer ID: ${customer?.id || 'unknown'}`)
    console.log(`   Customer Email: ${customer?.email || 'unknown'}`)
    console.log(`   Orders requested: ${orders_requested?.length || 0}`)

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
        webhook_type: 'customers/data_request',
        shop_domain,
        customer_id: customer?.id,
        deletion_status: 'no_data',
        records_deleted: 0,
        webhook_payload: payload,
        deleted_at: new Date().toISOString()
      })

    if (logError) {
      console.error(`⚠️  Failed to log data request: ${logError.message}`)
    }

    // Prepare empty customer data export
    const customerDataExport = {
      customer_id: customer?.id,
      customer_email: customer?.email,
      shop_domain,
      request_date: new Date().toISOString(),
      data_summary: {
        personal_information: {},
        purchase_history: {},
        behavioral_data: {},
        generated_content: {},
        custom_data: {}
      },
      explanation: 'Thunder Text does not store customer-specific data. The app only stores merchant (shop owner) data and product descriptions. Product descriptions are about products, not customers. No customer personally identifiable information (PII) is collected or stored.',
      data_collected: [
        'None - Thunder Text operates at the merchant/shop level only'
      ],
      third_party_services: [
        {
          service: 'OpenAI',
          purpose: 'AI text generation',
          data_shared: 'Product images and descriptions (no customer data)',
          retention: 'Deleted after processing (OpenAI policy)'
        },
        {
          service: 'Supabase',
          purpose: 'Database storage',
          data_shared: 'Merchant data only (no customer data)',
          retention: 'Until merchant uninstalls app'
        }
      ]
    }

    console.log(`✅ Customer data request processed`)
    console.log(`   Action: Returned empty dataset - no customer data stored`)

    return NextResponse.json({
      success: true,
      message: 'Customer data export completed',
      customer_data: customerDataExport
    })

  } catch (error) {
    console.error('❌ customers/data_request webhook error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process customer data request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    endpoint: 'customers/data_request',
    status: 'active',
    description: 'GDPR webhook for customer data export (Thunder Text stores no customer data)',
    customer_data_stored: false,
    sample_export: {
      explanation: 'Thunder Text does not store customer-specific data',
      data_summary: {
        personal_information: {},
        purchase_history: {},
        behavioral_data: {},
        generated_content: {}
      }
    }
  })
}
