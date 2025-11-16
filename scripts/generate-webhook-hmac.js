#!/usr/bin/env node
/**
 * Helper script to generate HMAC signatures for testing GDPR webhooks
 *
 * Usage:
 *   node scripts/generate-webhook-hmac.js shop-redact
 *   node scripts/generate-webhook-hmac.js customers-redact
 *   node scripts/generate-webhook-hmac.js customers-data-request
 */

const crypto = require('crypto')
require('dotenv').config({ path: '.env.local' })

const WEBHOOK_PAYLOADS = {
  'shop-redact': {
    shop_id: 123456789,
    shop_domain: 'test-gdpr-deletion.myshopify.com'
  },
  'customers-redact': {
    shop_id: 123456789,
    shop_domain: 'test-shop.myshopify.com',
    customer: {
      id: 987654321,
      email: 'customer@example.com',
      phone: null
    },
    orders_to_redact: []
  },
  'customers-data-request': {
    shop_id: 123456789,
    shop_domain: 'test-shop.myshopify.com',
    customer: {
      id: 987654321,
      email: 'customer@example.com',
      phone: null
    },
    orders_requested: []
  }
}

const WEBHOOK_URLS = {
  'shop-redact': '/api/webhooks/gdpr/shop-redact',
  'customers-redact': '/api/webhooks/gdpr/customers-redact',
  'customers-data-request': '/api/webhooks/gdpr/customers-data-request'
}

function generateHMAC(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('base64')
}

function main() {
  const webhookType = process.argv[2]

  if (!webhookType || !WEBHOOK_PAYLOADS[webhookType]) {
    console.error('❌ Invalid webhook type')
    console.log('\nUsage:')
    console.log('  node scripts/generate-webhook-hmac.js <webhook-type>')
    console.log('\nAvailable webhook types:')
    Object.keys(WEBHOOK_PAYLOADS).forEach(type => {
      console.log(`  - ${type}`)
    })
    process.exit(1)
  }

  const secret = process.env.SHOPIFY_API_SECRET
  if (!secret) {
    console.error('❌ SHOPIFY_API_SECRET not found in environment')
    console.log('   Make sure .env.local has SHOPIFY_API_SECRET set')
    process.exit(1)
  }

  const payload = WEBHOOK_PAYLOADS[webhookType]
  const payloadString = JSON.stringify(payload, null, 2)
  const hmac = generateHMAC(JSON.stringify(payload), secret)
  const url = `http://localhost:3050${WEBHOOK_URLS[webhookType]}`

  console.log('\n' + '='.repeat(60))
  console.log(`GDPR Webhook: ${webhookType}`)
  console.log('='.repeat(60) + '\n')

  console.log('📋 Payload:')
  console.log(payloadString)
  console.log('\n🔐 HMAC Signature:')
  console.log(hmac)
  console.log('\n📡 cURL Command:')
  console.log(`
curl -X POST ${url} \\
  -H "Content-Type: application/json" \\
  -H "X-Shopify-Hmac-SHA256: ${hmac}" \\
  -d '${JSON.stringify(payload)}'
  `.trim())

  console.log('\n✅ Copy the cURL command above to test the webhook\n')
}

main()
