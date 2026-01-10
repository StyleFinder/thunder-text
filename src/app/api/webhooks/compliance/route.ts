/**
 * Unified Webhook handler for all GDPR/Privacy Compliance events
 * Routes to appropriate handler based on X-Shopify-Topic header
 *
 * Topics handled:
 * - customers/data_request: Customer requests their data
 * - customers/redact: Request to delete customer data
 * - shop/redact: Request to delete all shop data (48h after uninstall)
 *
 * Required for Shopify App Store compliance.
 * @see https://shopify.dev/docs/apps/build/privacy-law-compliance
 */
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Dynamic import to avoid loading supabase during Shopify's HMAC test
async function getSupabaseAdmin() {
  const { supabaseAdmin } = await import("@/lib/supabase");
  return supabaseAdmin;
}

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

interface ShopRedactPayload {
  shop_id: number;
  shop_domain: string;
}

export async function POST(request: NextRequest) {
  // Wrap entire handler in try-catch to ensure we never return 500 for HMAC failures
  let validation: { valid: boolean; body?: string; error?: string } = {
    valid: false,
    error: "Unknown error",
  };

  try {
    // Dynamic import webhook validation to avoid issues during build
    const { validateWebhook, extractWebhookMetadata: _extractMeta } =
      await import("@/lib/middleware/webhook-validation");

    // Validate webhook signature
    validation = await validateWebhook(request);

    if (!validation.valid) {
      // IMPORTANT: Must return 401 for invalid HMAC - this is what Shopify checks
      logger.error("Compliance webhook validation failed", undefined, {
        component: "gdpr-compliance",
        validationError: validation.error,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Re-import for metadata extraction
    const { extractWebhookMetadata } =
      await import("@/lib/middleware/webhook-validation");

    // Extract webhook metadata
    const metadata = extractWebhookMetadata(request.headers);
    const topic = metadata.topic;

    if (!topic) {
      logger.error("[GDPR] Missing webhook topic", undefined, {
        component: "gdpr-compliance",
      });
      return NextResponse.json({ error: "Missing topic" }, { status: 400 });
    }

    // Route to appropriate handler based on topic
    switch (topic) {
      case "customers/data_request":
        return handleCustomerDataRequest(validation.body!, metadata);
      case "customers/redact":
        return handleCustomerRedact(validation.body!, metadata);
      case "shop/redact":
        return handleShopRedact(validation.body!, metadata);
      default:
        logger.error(`[GDPR] Unknown compliance topic: ${topic}`, undefined, {
          component: "gdpr-compliance",
        });
        return NextResponse.json({ error: "Unknown topic" }, { status: 400 });
    }
  } catch (error) {
    logger.error("Compliance webhook processing error", error as Error, { component: "gdpr-compliance" });

    // If validation hasn't passed yet, return 401 (HMAC failure case)
    // This ensures Shopify's test for "returns 401 on invalid HMAC" passes
    if (!validation.valid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // If validation passed but processing failed, return 200 to prevent retries
    return NextResponse.json({ success: false }, { status: 200 });
  }
}

/**
 * Handle customers/data_request webhook
 * Customer requesting their stored data
 */
async function handleCustomerDataRequest(
  body: string,
  metadata: {
    topic: string | null;
    shopDomain: string | null;
    apiVersion: string | null;
    webhookId: string | null;
    triggeredAt: string | null;
  },
): Promise<NextResponse> {
  const payload: CustomerDataRequestPayload = JSON.parse(body);
  const shopDomain = payload.shop_domain || metadata.shopDomain;

  logger.info("[GDPR] Customer data request received", {
    component: "gdpr-data-request",
    shopDomain,
    customerId: payload.customer?.id,
    dataRequestId: payload.data_request?.id,
  });

  // Thunder Text does NOT store customer PII data
  // We only store:
  // - Shop domain and connection info
  // - Product descriptions (no customer data)
  // - Generated ad content (no customer data)
  // - Business profile info (merchant data, not customer)
  //
  // Therefore, we acknowledge the request but have no customer data to return.

  // Log the compliance request for audit trail
  try {
    const supabaseAdmin = await getSupabaseAdmin();
    await supabaseAdmin.from("webhook_logs").insert({
      topic: "customers/data_request",
      shop_domain: shopDomain,
      webhook_id: metadata.webhookId,
      api_version: metadata.apiVersion,
      processed_at: new Date().toISOString(),
      status: "success",
      payload: JSON.stringify({
        type: "gdpr_data_request",
        customer_id: payload.customer?.id,
        data_request_id: payload.data_request?.id,
        response: "no_customer_data_stored",
      }),
    });
  } catch (logError) {
    logger.error("[GDPR] Failed to log data request:", logError as Error, {
      component: "gdpr-data-request",
    });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

/**
 * Handle customers/redact webhook
 * Request to delete customer data
 */
async function handleCustomerRedact(
  body: string,
  metadata: {
    topic: string | null;
    shopDomain: string | null;
    apiVersion: string | null;
    webhookId: string | null;
    triggeredAt: string | null;
  },
): Promise<NextResponse> {
  const payload: CustomerRedactPayload = JSON.parse(body);
  const shopDomain = payload.shop_domain || metadata.shopDomain;

  logger.info("[GDPR] Customer redact request received", {
    component: "gdpr-customer-redact",
    shopDomain,
    customerId: payload.customer?.id,
    ordersToRedact: payload.orders_to_redact?.length || 0,
  });

  // Thunder Text does NOT store customer PII data - nothing to delete

  // Log the compliance request for audit trail
  try {
    const supabaseAdmin = await getSupabaseAdmin();
    await supabaseAdmin.from("webhook_logs").insert({
      topic: "customers/redact",
      shop_domain: shopDomain,
      webhook_id: metadata.webhookId,
      api_version: metadata.apiVersion,
      processed_at: new Date().toISOString(),
      status: "success",
      payload: JSON.stringify({
        type: "gdpr_customer_redact",
        customer_id: payload.customer?.id,
        orders_redacted: payload.orders_to_redact?.length || 0,
        response: "no_customer_data_stored",
      }),
    });
  } catch (logError) {
    logger.error("[GDPR] Failed to log redact request:", logError as Error, {
      component: "gdpr-customer-redact",
    });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

/**
 * Handle shop/redact webhook
 * Request to delete ALL shop data (48 hours after uninstall)
 */
async function handleShopRedact(
  body: string,
  metadata: {
    topic: string | null;
    shopDomain: string | null;
    apiVersion: string | null;
    webhookId: string | null;
    triggeredAt: string | null;
  },
): Promise<NextResponse> {
  const payload: ShopRedactPayload = JSON.parse(body);
  const shopDomain = payload.shop_domain || metadata.shopDomain;

  logger.info(
    "[GDPR] Shop redact request received - initiating full data deletion",
    {
      component: "gdpr-shop-redact",
      shopDomain,
      shopifyShopId: payload.shop_id,
    },
  );

  if (!shopDomain) {
    logger.error(
      "[GDPR] Shop redact failed: No shop domain provided",
      undefined,
      {
        component: "gdpr-shop-redact",
      },
    );
    return NextResponse.json(
      { success: false, error: "No shop domain" },
      { status: 200 },
    );
  }

  const supabaseAdmin = await getSupabaseAdmin();

  // Get shop ID from our database
  const { data: shop, error: shopError } = await supabaseAdmin
    .from("shops")
    .select("id")
    .eq("shop_domain", shopDomain)
    .single();

  if (shopError || !shop) {
    logger.warn(
      "[GDPR] Shop not found for redaction - may already be deleted",
      {
        component: "gdpr-shop-redact",
        shopDomain,
      },
    );
    // Return success - shop may have already been deleted
    return NextResponse.json({ success: true }, { status: 200 });
  }

  const shopId = shop.id;
  const deletionResults: Record<string, { success: boolean; error?: string }> =
    {};

  // Delete all shop-related data in order (respecting foreign key constraints)

  // 1. Delete generated content (ad_generations, content library items)
  try {
    const { error } = await supabaseAdmin
      .from("ad_generations")
      .delete()
      .eq("shop_id", shopId);
    deletionResults["ad_generations"] = {
      success: !error,
      error: error?.message,
    };
  } catch (e) {
    deletionResults["ad_generations"] = {
      success: false,
      error: (e as Error).message,
    };
  }

  // 2. Delete content library items
  try {
    const { error } = await supabaseAdmin
      .from("content_library")
      .delete()
      .eq("shop_id", shopId);
    deletionResults["content_library"] = {
      success: !error,
      error: error?.message,
    };
  } catch (e) {
    deletionResults["content_library"] = {
      success: false,
      error: (e as Error).message,
    };
  }

  // 3. Delete brand voice/business profile data
  try {
    const { error } = await supabaseAdmin
      .from("business_profiles")
      .delete()
      .eq("shop_id", shopId);
    deletionResults["business_profiles"] = {
      success: !error,
      error: error?.message,
    };
  } catch (e) {
    deletionResults["business_profiles"] = {
      success: false,
      error: (e as Error).message,
    };
  }

  // 4. Delete custom prompts
  try {
    const { error } = await supabaseAdmin
      .from("shop_prompts")
      .delete()
      .eq("shop_id", shopId);
    deletionResults["shop_prompts"] = {
      success: !error,
      error: error?.message,
    };
  } catch (e) {
    deletionResults["shop_prompts"] = {
      success: false,
      error: (e as Error).message,
    };
  }

  // 5. Delete subscriptions
  try {
    const { error } = await supabaseAdmin
      .from("subscriptions")
      .delete()
      .eq("shop_id", shopId);
    deletionResults["subscriptions"] = {
      success: !error,
      error: error?.message,
    };
  } catch (e) {
    deletionResults["subscriptions"] = {
      success: false,
      error: (e as Error).message,
    };
  }

  // 6. Delete integrations (Facebook, etc.)
  try {
    const { error } = await supabaseAdmin
      .from("integrations")
      .delete()
      .eq("shop_id", shopId);
    deletionResults["integrations"] = {
      success: !error,
      error: error?.message,
    };
  } catch (e) {
    deletionResults["integrations"] = {
      success: false,
      error: (e as Error).message,
    };
  }

  // 7. Delete usage tracking
  try {
    const { error } = await supabaseAdmin
      .from("usage_tracking")
      .delete()
      .eq("shop_id", shopId);
    deletionResults["usage_tracking"] = {
      success: !error,
      error: error?.message,
    };
  } catch (e) {
    deletionResults["usage_tracking"] = {
      success: false,
      error: (e as Error).message,
    };
  }

  // 8. Delete onboarding progress
  try {
    const { error } = await supabaseAdmin
      .from("onboarding_progress")
      .delete()
      .eq("shop_id", shopId);
    deletionResults["onboarding_progress"] = {
      success: !error,
      error: error?.message,
    };
  } catch (e) {
    deletionResults["onboarding_progress"] = {
      success: false,
      error: (e as Error).message,
    };
  }

  // 9. Finally, delete the shop record itself
  try {
    const { error } = await supabaseAdmin
      .from("shops")
      .delete()
      .eq("id", shopId);
    deletionResults["shops"] = { success: !error, error: error?.message };
  } catch (e) {
    deletionResults["shops"] = { success: false, error: (e as Error).message };
  }

  // Check if all deletions succeeded
  const allSucceeded = Object.values(deletionResults).every((r) => r.success);
  const failedTables = Object.entries(deletionResults)
    .filter(([, r]) => !r.success)
    .map(([table]) => table);

  if (!allSucceeded) {
    logger.error("[GDPR] Shop redact partially failed", undefined, {
      component: "gdpr-shop-redact",
      shopDomain,
      failedTables,
      deletionResults,
    });
  } else {
    logger.info(
      "[GDPR] Shop redact completed successfully - all data deleted",
      {
        component: "gdpr-shop-redact",
        shopDomain,
        tablesCleared: Object.keys(deletionResults),
      },
    );
  }

  // Log the compliance request for audit trail
  try {
    await supabaseAdmin.from("webhook_logs").insert({
      topic: "shop/redact",
      shop_domain: shopDomain,
      webhook_id: metadata.webhookId,
      api_version: metadata.apiVersion,
      processed_at: new Date().toISOString(),
      status: allSucceeded ? "success" : "partial_success",
      payload: JSON.stringify({
        type: "gdpr_shop_redact",
        shopify_shop_id: payload.shop_id,
        deletion_results: deletionResults,
        all_data_deleted: allSucceeded,
      }),
    });
  } catch (logError) {
    logger.error(
      "[GDPR] Failed to log shop redact request:",
      logError as Error,
      {
        component: "gdpr-shop-redact",
      },
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
