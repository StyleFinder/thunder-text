/**
 * Webhook handler for customers/redact events
 * GDPR/Privacy Compliance: Triggered when a customer requests data deletion
 *
 * Required for Shopify App Store compliance.
 * @see https://shopify.dev/docs/apps/build/privacy-law-compliance
 */
import { NextRequest, NextResponse } from 'next/server';
import { validateWebhook, validateWebhookTopic, extractWebhookMetadata } from '@/lib/middleware/webhook-validation';
import { supabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

interface CustomerRedactPayload {
  shop_id: number;
  shop_domain: string;
  customer: {
    id: number;
    email: string;
    phone: string;
  };
  orders_to_redact: number[];
}

export async function POST(request: NextRequest) {
  try {
    // Validate webhook signature
    const validation = await validateWebhook(request);

    if (!validation.valid) {
      logger.error(`[GDPR] customers/redact validation failed: ${validation.error}`, undefined, {
        component: 'gdpr-customer-redact'
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract webhook metadata
    const metadata = extractWebhookMetadata(request.headers);

    // Validate webhook topic
    if (!validateWebhookTopic(metadata.topic, ['customers/redact'])) {
      return NextResponse.json({ error: 'Invalid webhook topic' }, { status: 400 });
    }

    // Parse webhook body
    const payload: CustomerRedactPayload = JSON.parse(validation.body!);
    const shopDomain = payload.shop_domain || metadata.shopDomain;

    logger.info('[GDPR] Customer redact request received', {
      component: 'gdpr-customer-redact',
      shopDomain,
      customerId: payload.customer?.id,
      ordersToRedact: payload.orders_to_redact?.length || 0
    });

    // Thunder Text does NOT store customer PII data
    // We only store:
    // - Shop domain and connection info
    // - Product descriptions (no customer data)
    // - Generated ad content (no customer data)
    // - Business profile info (merchant data, not customer)
    //
    // Therefore, we acknowledge the request but have no customer data to delete.
    // If your app stores customer data, implement the deletion here.

    // Log the compliance request for audit trail
    try {
      await supabaseAdmin
        .from('webhook_logs')
        .insert({
          topic: 'customers/redact',
          shop_domain: shopDomain,
          webhook_id: metadata.webhookId,
          api_version: metadata.apiVersion,
          processed_at: new Date().toISOString(),
          status: 'success',
          payload: JSON.stringify({
            type: 'gdpr_customer_redact',
            customer_id: payload.customer?.id,
            orders_redacted: payload.orders_to_redact?.length || 0,
            response: 'no_customer_data_stored'
          })
        });
    } catch (logError) {
      logger.error('[GDPR] Failed to log redact request:', logError as Error, {
        component: 'gdpr-customer-redact'
      });
    }

    // Return success - Shopify expects 200 response
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    logger.error('[GDPR] Customer redact processing error:', error as Error, {
      component: 'gdpr-customer-redact'
    });

    // Log failed webhook
    try {
      const metadata = extractWebhookMetadata(request.headers);
      await supabaseAdmin
        .from('webhook_logs')
        .insert({
          topic: 'customers/redact',
          shop_domain: metadata.shopDomain,
          webhook_id: metadata.webhookId,
          api_version: metadata.apiVersion,
          processed_at: new Date().toISOString(),
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
    } catch (logError) {
      logger.error('[GDPR] Failed to log webhook error:', logError as Error, {
        component: 'gdpr-customer-redact'
      });
    }

    // Always return 200 to prevent Shopify from retrying
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
