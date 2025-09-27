/**
 * Webhook validation middleware for Shopify webhooks
 * Implements HMAC signature verification to ensure webhook authenticity
 */
import { createHmac, timingSafeEqual } from 'crypto'

export interface WebhookValidationResult {
  valid: boolean
  body?: string
  error?: string
}

/**
 * Validate a Shopify webhook request using HMAC signature
 * @param request - The incoming webhook request
 * @returns Validation result with the raw body if valid
 */
export async function validateWebhook(
  request: Request
): Promise<WebhookValidationResult> {
  try {
    // Get HMAC header from Shopify
    const hmacHeader = request.headers.get('x-shopify-hmac-sha256')
    if (!hmacHeader) {
      console.error('⚠️ Webhook validation failed: Missing HMAC header')
      return {
        valid: false,
        error: 'Missing X-Shopify-Hmac-Sha256 header'
      }
    }

    // Get webhook secret from environment
    const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('❌ Webhook secret not configured')
      return {
        valid: false,
        error: 'Webhook secret not configured'
      }
    }

    // Get raw body - IMPORTANT: Must be the raw body, not parsed
    const rawBody = await request.text()

    // Calculate expected HMAC using the webhook secret
    const hash = createHmac('sha256', webhookSecret)
      .update(rawBody, 'utf8')
      .digest('base64')

    // Prepare buffers for timing-safe comparison
    const expected = Buffer.from(hash, 'base64')
    const received = Buffer.from(hmacHeader, 'base64')

    // Check length first (fast fail, not timing sensitive)
    if (expected.length !== received.length) {
      console.error('⚠️ Webhook validation failed: HMAC length mismatch')
      return {
        valid: false,
        error: 'Invalid HMAC signature length'
      }
    }

    // Timing-safe comparison to prevent timing attacks
    const valid = timingSafeEqual(expected, received)

    if (!valid) {
      console.error('❌ Webhook validation failed: Invalid HMAC signature')
      // Don't log actual signatures in production
      if (process.env.NODE_ENV === 'development') {
        console.error('Expected HMAC:', hash)
        console.error('Received HMAC:', hmacHeader)
      }
      return {
        valid: false,
        error: 'Invalid HMAC signature'
      }
    }

    console.log('✅ Webhook validated successfully')
    return {
      valid: true,
      body: rawBody
    }

  } catch (error) {
    console.error('❌ Webhook validation error:', error)
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Validation error'
    }
  }
}

/**
 * Validate webhook topic
 * @param topic - The webhook topic from headers
 * @param allowedTopics - Array of allowed webhook topics
 */
export function validateWebhookTopic(
  topic: string | null,
  allowedTopics: string[]
): boolean {
  if (!topic) {
    console.error('⚠️ Webhook topic missing')
    return false
  }

  if (!allowedTopics.includes(topic)) {
    console.error(`⚠️ Unexpected webhook topic: ${topic}`)
    return false
  }

  return true
}

/**
 * Extract webhook metadata from headers
 */
export function extractWebhookMetadata(headers: Headers) {
  return {
    topic: headers.get('x-shopify-topic'),
    shopDomain: headers.get('x-shopify-shop-domain'),
    apiVersion: headers.get('x-shopify-api-version'),
    webhookId: headers.get('x-shopify-webhook-id'),
    triggeredAt: headers.get('x-shopify-triggered-at')
  }
}