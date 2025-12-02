/**
 * Webhook handler for app/uninstalled events
 * Triggered when a merchant uninstalls the app
 */
import { NextRequest, NextResponse } from 'next/server'
import { validateWebhook, validateWebhookTopic, extractWebhookMetadata } from '@/lib/middleware/webhook-validation'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // Validate webhook signature
    const validation = await validateWebhook(request)

    if (!validation.valid) {
      logger.error('❌ Webhook validation failed:', validation.error, undefined, { component: 'app-uninstalled' })
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Extract webhook metadata
    const metadata = extractWebhookMetadata(request.headers)

    // Validate webhook topic
    if (!validateWebhookTopic(metadata.topic, ['app/uninstalled'])) {
      return NextResponse.json(
        { error: 'Invalid webhook topic' },
        { status: 400 }
      )
    }

    // Parse webhook body
    const webhookData = JSON.parse(validation.body!)
    const shopDomain = webhookData.shop_domain || metadata.shopDomain


    // Update shop status in database
    if (shopDomain) {
      // Mark shop as inactive
      const { error: updateError } = await supabaseAdmin
        .from('shops')
        .update({
          is_active: false,
          uninstalled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('shop_domain', shopDomain)

      if (updateError) {
        logger.error('❌ Failed to update shop status:', updateError as Error, { component: 'app-uninstalled' })
        // Don't return error - webhook should still succeed
      } else {
      }

      // Clean up any active sessions or tokens
      // This is important for security - revoke access when app is uninstalled
      const { error: tokenError } = await supabaseAdmin
        .from('shops')
        .update({
          access_token: null,
          scope: null
        })
        .eq('shop_domain', shopDomain)

      if (tokenError) {
        logger.error('⚠️ Failed to clear shop tokens:', tokenError as Error, { component: 'app-uninstalled' })
      }
    }

    // Log webhook processing
    try {
      await supabaseAdmin
        .from('webhook_logs')
        .insert({
          topic: metadata.topic,
          shop_domain: shopDomain,
          webhook_id: metadata.webhookId,
          api_version: metadata.apiVersion,
          processed_at: new Date().toISOString(),
          status: 'success'
        })
    } catch (err) {
      logger.error('Failed to log webhook:', err as Error, { component: 'app-uninstalled' })
    }

    // Return success response
    return NextResponse.json(
      { success: true },
      { status: 200 }
    )

  } catch (error) {
    logger.error('❌ Webhook processing error:', error as Error, { component: 'app-uninstalled' })

    // Log failed webhook
    try {
      const metadata = extractWebhookMetadata(request.headers)
      await supabaseAdmin
        .from('webhook_logs')
        .insert({
          topic: metadata.topic,
          shop_domain: metadata.shopDomain,
          webhook_id: metadata.webhookId,
          api_version: metadata.apiVersion,
          processed_at: new Date().toISOString(),
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
    } catch (logError) {
      logger.error('Failed to log webhook error:', logError as Error, { component: 'app-uninstalled' })
    }

    // Always return 200 to prevent Shopify from retrying
    // Log the error but don't expose it
    return NextResponse.json(
      { success: false },
      { status: 200 }
    )
  }
}