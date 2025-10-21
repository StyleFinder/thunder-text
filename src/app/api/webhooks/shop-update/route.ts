/**
 * Webhook handler for shop/update events
 * Triggered when shop information changes
 */
import { NextRequest, NextResponse } from 'next/server'
import { validateWebhook, validateWebhookTopic, extractWebhookMetadata } from '@/lib/middleware/webhook-validation'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Validate webhook signature
    const validation = await validateWebhook(request)

    if (!validation.valid) {
      console.error('❌ Webhook validation failed:', validation.error)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Extract webhook metadata
    const metadata = extractWebhookMetadata(request.headers)

    // Validate webhook topic
    if (!validateWebhookTopic(metadata.topic, ['shop/update'])) {
      return NextResponse.json(
        { error: 'Invalid webhook topic' },
        { status: 400 }
      )
    }

    // Parse webhook body
    const webhookData = JSON.parse(validation.body!)
    const shopDomain = webhookData.domain || metadata.shopDomain

    console.log('📦 Processing shop/update webhook for shop:', shopDomain)

    // Update shop information in database
    if (shopDomain) {
      const shopUpdateData: {
        shop_domain: string
        updated_at: string
        shop_email?: string
        shop_owner?: string
        shop_name?: string
        shop_phone?: string
        timezone?: string
        country?: string
        currency?: string
        plan_name?: string
      } = {
        shop_domain: shopDomain,
        updated_at: new Date().toISOString()
      }

      // Add available shop information
      if (webhookData.email) shopUpdateData.shop_email = webhookData.email
      if (webhookData.shop_owner) shopUpdateData.shop_owner = webhookData.shop_owner
      if (webhookData.name) shopUpdateData.shop_name = webhookData.name
      if (webhookData.phone) shopUpdateData.shop_phone = webhookData.phone
      if (webhookData.timezone) shopUpdateData.timezone = webhookData.timezone
      if (webhookData.country_name) shopUpdateData.country = webhookData.country_name
      if (webhookData.currency) shopUpdateData.currency = webhookData.currency
      if (webhookData.plan_name) shopUpdateData.plan_name = webhookData.plan_name

      // Update shop metadata
      const { error: updateError } = await supabaseAdmin
        .from('shops')
        .upsert(shopUpdateData, {
          onConflict: 'shop_domain'
        })

      if (updateError) {
        console.error('❌ Failed to update shop information:', updateError)
        // Don't return error - webhook should still succeed
      } else {
        console.log('✅ Shop information updated:', shopDomain)
      }
    }

    // Log webhook processing
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
      .catch(err => console.error('Failed to log webhook:', err))

    // Return success response
    return NextResponse.json(
      { success: true },
      { status: 200 }
    )

  } catch (error) {
    console.error('❌ Webhook processing error:', error)

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
      console.error('Failed to log webhook error:', logError)
    }

    // Always return 200 to prevent Shopify from retrying
    // Log the error but don't expose it
    return NextResponse.json(
      { success: false },
      { status: 200 }
    )
  }
}