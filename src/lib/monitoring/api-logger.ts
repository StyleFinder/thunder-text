/* eslint-disable security/detect-object-injection -- Dynamic object access with validated keys is safe here */
/**
 * API Request Logger
 *
 * Logs API requests to the api_request_logs table for monitoring and metrics.
 * Used by all AI generation endpoints to track usage, costs, and performance.
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export type OperationType =
  | "product_description"
  | "ad_generation"
  | "image_generation"
  | "business_profile"
  | "voice_profile"
  | "image_analysis";

export type RequestStatus = "success" | "error" | "timeout" | "rate_limited";

export interface ApiRequestLogData {
  shopId: string | null;
  operationType: OperationType;
  endpoint: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  latencyMs: number;
  status: RequestStatus;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Model pricing per 1M tokens (input/output)
 * From OpenAI pricing as of Dec 2024
 */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 2.5, output: 10.0 },
  "gpt-image-1": { input: 0, output: 0 }, // Image generation uses per-image pricing
};

/**
 * Image generation pricing (per image)
 */
const IMAGE_PRICING: Record<string, Record<string, number>> = {
  "gpt-image-1": {
    standard: 0.01, // $0.01 per image
    hd: 0.02, // $0.02 per image (disabled for cost)
  },
};

/**
 * Calculate cost from token usage
 */
export function calculateTokenCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) {
    logger.warn(`Unknown model for pricing: ${model}`, {
      component: "api-logger",
    });
    return 0;
  }

  // Convert from per 1M tokens to actual cost
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;

  return inputCost + outputCost;
}

/**
 * Calculate image generation cost
 */
export function calculateImageCost(
  model: string = "gpt-image-1",
  quality: string = "standard",
): number {
  const modelPricing = IMAGE_PRICING[model];
  if (!modelPricing) {
    return 0.01; // Default to standard pricing
  }
  return modelPricing[quality] || modelPricing["standard"] || 0.01;
}

/**
 * Log an API request to the monitoring table
 */
export async function logApiRequest(data: ApiRequestLogData): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from("api_request_logs").insert({
      shop_id: data.shopId,
      operation_type: data.operationType,
      endpoint: data.endpoint,
      model: data.model,
      input_tokens: data.inputTokens || 0,
      output_tokens: data.outputTokens || 0,
      cost_usd: data.costUsd || 0,
      latency_ms: data.latencyMs,
      status: data.status,
      error_code: data.errorCode,
      error_message: data.errorMessage,
      metadata: data.metadata || {},
    });

    if (error) {
      logger.error("Failed to log API request", error as Error, {
        component: "api-logger",
        operationType: data.operationType,
      });
    }
  } catch (err) {
    // Don't throw - logging should never break the main flow
    logger.error("Error in API request logging", err as Error, {
      component: "api-logger",
    });
  }
}

/**
 * Log an error to the error_logs table
 */
export async function logApiError(data: {
  errorType: string;
  errorCode?: string;
  errorMessage: string;
  shopId?: string | null;
  endpoint?: string;
  operationType?: string;
  stackTrace?: string;
  requestData?: Record<string, unknown>;
  responseData?: Record<string, unknown>;
}): Promise<void> {
  try {
    // Create a hash for deduplication
    const errorHash = Buffer.from(`${data.errorType}:${data.errorMessage}`)
      .toString("base64")
      .substring(0, 64);

    // Try to find existing error with same hash
    const { data: existing } = await supabaseAdmin
      .from("error_logs")
      .select("id, occurrence_count")
      .eq("error_hash", errorHash)
      .gte(
        "created_at",
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      )
      .single();

    if (existing) {
      // Update existing error - increment count and update last_seen
      await supabaseAdmin
        .from("error_logs")
        .update({
          occurrence_count: existing.occurrence_count + 1,
          last_seen_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      // Insert new error
      await supabaseAdmin.from("error_logs").insert({
        error_type: data.errorType,
        error_code: data.errorCode,
        error_message: data.errorMessage,
        shop_id: data.shopId,
        endpoint: data.endpoint,
        operation_type: data.operationType,
        stack_trace: data.stackTrace,
        request_data: data.requestData || {},
        response_data: data.responseData || {},
        error_hash: errorHash,
        occurrence_count: 1,
        first_seen_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    // Don't throw - logging should never break the main flow
    logger.error("Error in API error logging", err as Error, {
      component: "api-logger",
    });
  }
}

/**
 * Helper to measure and log API request timing
 *
 * Usage:
 * ```
 * const tracker = startRequestTracker();
 * // ... do work ...
 * await tracker.log({
 *   shopId: 'xxx',
 *   operationType: 'product_description',
 *   endpoint: '/api/generate',
 *   model: 'gpt-4o-mini',
 *   inputTokens: usage.prompt_tokens,
 *   outputTokens: usage.completion_tokens,
 *   status: 'success',
 * });
 * ```
 */
export function startRequestTracker() {
  const startTime = Date.now();

  return {
    /**
     * Calculate elapsed time in ms
     */
    getElapsedMs(): number {
      return Date.now() - startTime;
    },

    /**
     * Log the request with automatically calculated latency
     */
    async log(
      data: Omit<ApiRequestLogData, "latencyMs"> & { latencyMs?: number },
    ): Promise<void> {
      const latencyMs = data.latencyMs ?? this.getElapsedMs();

      // Auto-calculate cost if not provided and tokens are available
      let costUsd = data.costUsd;
      if (
        costUsd === undefined &&
        data.inputTokens !== undefined &&
        data.outputTokens !== undefined
      ) {
        costUsd = calculateTokenCost(
          data.model,
          data.inputTokens,
          data.outputTokens,
        );
      }

      await logApiRequest({
        ...data,
        latencyMs,
        costUsd,
      });
    },

    /**
     * Log an error with the request
     */
    async logError(
      data: Omit<ApiRequestLogData, "latencyMs" | "status"> & {
        status?: RequestStatus;
        errorType?: string;
        stackTrace?: string;
      },
    ): Promise<void> {
      const latencyMs = this.getElapsedMs();

      await logApiRequest({
        ...data,
        latencyMs,
        status: data.status || "error",
      });

      // Also log to error_logs table for detailed tracking
      await logApiError({
        errorType: data.errorType || "api_error",
        errorCode: data.errorCode,
        errorMessage: data.errorMessage || "Unknown error",
        shopId: data.shopId,
        endpoint: data.endpoint,
        operationType: data.operationType,
        stackTrace: data.stackTrace,
      });
    },
  };
}
