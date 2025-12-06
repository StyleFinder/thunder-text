/**
 * Webhook handler for shop/redact events
 * GDPR/Privacy Compliance: Triggered 48 hours after app uninstall
 * Requires deletion of ALL shop data from our systems
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

interface ShopRedactPayload {
  shop_id: number;
  shop_domain: string;
}

export async function POST(request: NextRequest) {
  try {
    // Validate webhook signature
    const validation = await validateWebhook(request);

    if (!validation.valid) {
      logger.error(`[GDPR] shop/redact validation failed: ${validation.error}`, undefined, {
        component: 'gdpr-shop-redact'
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract webhook metadata
    const metadata = extractWebhookMetadata(request.headers);

    // Validate webhook topic
    if (!validateWebhookTopic(metadata.topic, ['shop/redact'])) {
      return NextResponse.json({ error: 'Invalid webhook topic' }, { status: 400 });
    }

    // Parse webhook body
    const payload: ShopRedactPayload = JSON.parse(validation.body!);
    const shopDomain = payload.shop_domain || metadata.shopDomain;

    logger.info('[GDPR] Shop redact request received - initiating full data deletion', {
      component: 'gdpr-shop-redact',
      shopDomain,
      shopifyShopId: payload.shop_id
    });

    if (!shopDomain) {
      logger.error('[GDPR] Shop redact failed: No shop domain provided', undefined, {
        component: 'gdpr-shop-redact'
      });
      return NextResponse.json({ success: false, error: 'No shop domain' }, { status: 200 });
    }

    // Get shop ID from our database
    const { data: shop, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('id')
      .eq('shop_domain', shopDomain)
      .single();

    if (shopError || !shop) {
      logger.warn('[GDPR] Shop not found for redaction - may already be deleted', {
        component: 'gdpr-shop-redact',
        shopDomain
      });
      // Return success - shop may have already been deleted
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const shopId = shop.id;
    const deletionResults: Record<string, { success: boolean; error?: string }> = {};

    // Delete all shop-related data in order (respecting foreign key constraints)

    // 1. Delete generated content (ad_generations, content library items)
    try {
      const { error } = await supabaseAdmin
        .from('ad_generations')
        .delete()
        .eq('shop_id', shopId);
      deletionResults['ad_generations'] = { success: !error, error: error?.message };
    } catch (e) {
      deletionResults['ad_generations'] = { success: false, error: (e as Error).message };
    }

    // 2. Delete content library items
    try {
      const { error } = await supabaseAdmin
        .from('content_library')
        .delete()
        .eq('shop_id', shopId);
      deletionResults['content_library'] = { success: !error, error: error?.message };
    } catch (e) {
      deletionResults['content_library'] = { success: false, error: (e as Error).message };
    }

    // 3. Delete brand voice/business profile data
    try {
      const { error } = await supabaseAdmin
        .from('business_profiles')
        .delete()
        .eq('shop_id', shopId);
      deletionResults['business_profiles'] = { success: !error, error: error?.message };
    } catch (e) {
      deletionResults['business_profiles'] = { success: false, error: (e as Error).message };
    }

    // 4. Delete custom prompts
    try {
      const { error } = await supabaseAdmin
        .from('shop_prompts')
        .delete()
        .eq('shop_id', shopId);
      deletionResults['shop_prompts'] = { success: !error, error: error?.message };
    } catch (e) {
      deletionResults['shop_prompts'] = { success: false, error: (e as Error).message };
    }

    // 5. Delete subscriptions
    try {
      const { error } = await supabaseAdmin
        .from('subscriptions')
        .delete()
        .eq('shop_id', shopId);
      deletionResults['subscriptions'] = { success: !error, error: error?.message };
    } catch (e) {
      deletionResults['subscriptions'] = { success: false, error: (e as Error).message };
    }

    // 6. Delete integrations (Facebook, etc.)
    try {
      const { error } = await supabaseAdmin
        .from('integrations')
        .delete()
        .eq('shop_id', shopId);
      deletionResults['integrations'] = { success: !error, error: error?.message };
    } catch (e) {
      deletionResults['integrations'] = { success: false, error: (e as Error).message };
    }

    // 7. Delete usage tracking
    try {
      const { error } = await supabaseAdmin
        .from('usage_tracking')
        .delete()
        .eq('shop_id', shopId);
      deletionResults['usage_tracking'] = { success: !error, error: error?.message };
    } catch (e) {
      deletionResults['usage_tracking'] = { success: false, error: (e as Error).message };
    }

    // 8. Delete onboarding progress
    try {
      const { error } = await supabaseAdmin
        .from('onboarding_progress')
        .delete()
        .eq('shop_id', shopId);
      deletionResults['onboarding_progress'] = { success: !error, error: error?.message };
    } catch (e) {
      deletionResults['onboarding_progress'] = { success: false, error: (e as Error).message };
    }

    // 9. Finally, delete the shop record itself
    try {
      const { error } = await supabaseAdmin
        .from('shops')
        .delete()
        .eq('id', shopId);
      deletionResults['shops'] = { success: !error, error: error?.message };
    } catch (e) {
      deletionResults['shops'] = { success: false, error: (e as Error).message };
    }

    // Check if all deletions succeeded
    const allSucceeded = Object.values(deletionResults).every(r => r.success);
    const failedTables = Object.entries(deletionResults)
      .filter(([, r]) => !r.success)
      .map(([table]) => table);

    if (!allSucceeded) {
      logger.error('[GDPR] Shop redact partially failed', undefined, {
        component: 'gdpr-shop-redact',
        shopDomain,
        failedTables,
        deletionResults
      });
    } else {
      logger.info('[GDPR] Shop redact completed successfully - all data deleted', {
        component: 'gdpr-shop-redact',
        shopDomain,
        tablesCleared: Object.keys(deletionResults)
      });
    }

    // Log the compliance request for audit trail
    // Note: We log this BEFORE deleting the shop, or use a separate audit table
    try {
      await supabaseAdmin
        .from('webhook_logs')
        .insert({
          topic: 'shop/redact',
          shop_domain: shopDomain,
          webhook_id: metadata.webhookId,
          api_version: metadata.apiVersion,
          processed_at: new Date().toISOString(),
          status: allSucceeded ? 'success' : 'partial_success',
          payload: JSON.stringify({
            type: 'gdpr_shop_redact',
            shopify_shop_id: payload.shop_id,
            deletion_results: deletionResults,
            all_data_deleted: allSucceeded
          })
        });
    } catch (logError) {
      logger.error('[GDPR] Failed to log shop redact request:', logError as Error, {
        component: 'gdpr-shop-redact'
      });
    }

    // Return success - Shopify expects 200 response
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    logger.error('[GDPR] Shop redact processing error:', error as Error, {
      component: 'gdpr-shop-redact'
    });

    // Log failed webhook
    try {
      const metadata = extractWebhookMetadata(request.headers);
      await supabaseAdmin
        .from('webhook_logs')
        .insert({
          topic: 'shop/redact',
          shop_domain: metadata.shopDomain,
          webhook_id: metadata.webhookId,
          api_version: metadata.apiVersion,
          processed_at: new Date().toISOString(),
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
    } catch (logError) {
      logger.error('[GDPR] Failed to log webhook error:', logError as Error, {
        component: 'gdpr-shop-redact'
      });
    }

    // Always return 200 to prevent Shopify from retrying
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
