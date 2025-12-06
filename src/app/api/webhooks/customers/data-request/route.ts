/**
 * Webhook handler for customers/data_request events
 * GDPR/Privacy Compliance: Triggered when a customer requests their data
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

interface CustomerDataRequestPayload {
  shop_id: number;
  shop_domain: string;
  orders_requested: number[];
  customer: {
    id: number;
    email: string;
    phone: string;
  };
  data_request: {
    id: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Validate webhook signature
    const validation = await validateWebhook(request);

    if (!validation.valid) {
      logger.error(`[GDPR] customers/data_request validation failed: ${validation.error}`, undefined, {
        component: 'gdpr-data-request'
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract webhook metadata
    const metadata = extractWebhookMetadata(request.headers);

    // Validate webhook topic
    if (!validateWebhookTopic(metadata.topic, ['customers/data_request'])) {
      return NextResponse.json({ error: 'Invalid webhook topic' }, { status: 400 });
    }

    // Parse webhook body
    const payload: CustomerDataRequestPayload = JSON.parse(validation.body!);
    const shopDomain = payload.shop_domain || metadata.shopDomain;

    logger.info('[GDPR] Customer data request received', {
      component: 'gdpr-data-request',
      shopDomain,
      customerId: payload.customer?.id,
      customerEmail: payload.customer?.email ? '***@***' : undefined, // Don't log full email
      dataRequestId: payload.data_request?.id
    });

    // Thunder Text does NOT store customer PII data
    // We only store:
    // - Shop domain and connection info
    // - Product descriptions (no customer data)
    // - Generated ad content (no customer data)
    // - Business profile info (merchant data, not customer)
    //
    // Therefore, we acknowledge the request but have no customer data to return.
    // If your app stores customer data, implement the data export here.

    // Log the compliance request for audit trail
    try {
      await supabaseAdmin
        .from('webhook_logs')
        .insert({
          topic: 'customers/data_request',
          shop_domain: shopDomain,
          webhook_id: metadata.webhookId,
          api_version: metadata.apiVersion,
          processed_at: new Date().toISOString(),
          status: 'success',
          payload: JSON.stringify({
            type: 'gdpr_data_request',
            customer_id: payload.customer?.id,
            data_request_id: payload.data_request?.id,
            response: 'no_customer_data_stored'
          })
        });
    } catch (logError) {
      logger.error('[GDPR] Failed to log data request:', logError as Error, {
        component: 'gdpr-data-request'
      });
    }

    // Return success - Shopify expects 200 response
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    logger.error('[GDPR] Customer data request processing error:', error as Error, {
      component: 'gdpr-data-request'
    });

    // Log failed webhook
    try {
      const metadata = extractWebhookMetadata(request.headers);
      await supabaseAdmin
        .from('webhook_logs')
        .insert({
          topic: 'customers/data_request',
          shop_domain: metadata.shopDomain,
          webhook_id: metadata.webhookId,
          api_version: metadata.apiVersion,
          processed_at: new Date().toISOString(),
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
    } catch (logError) {
      logger.error('[GDPR] Failed to log webhook error:', logError as Error, {
        component: 'gdpr-data-request'
      });
    }

    // Always return 200 to prevent Shopify from retrying
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
