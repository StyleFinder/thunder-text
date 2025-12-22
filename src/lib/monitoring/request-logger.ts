/**
 * API Request Logger
 *
 * Logs all API requests for monitoring and analytics.
 * Per-request logs are kept for 7 days, then aggregated into daily rollups.
 */

import { supabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { MODEL_PRICING, type ModelName } from '@/lib/config/models';

export interface ApiRequestLog {
  shopId?: string;
  operationType: 'product_description' | 'ad_generation' | 'business_profile' | 'voice_profile' | 'image_analysis' | 'content_generation';
  endpoint?: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  status: 'success' | 'error' | 'timeout' | 'rate_limited';
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log an API request to the database
 */
export async function logApiRequest(log: ApiRequestLog): Promise<void> {
  try {
    // Calculate cost
    const costUsd = calculateCost(log.model, log.inputTokens, log.outputTokens);

    await supabaseAdmin.from('api_request_logs').insert({
      shop_id: log.shopId || null,
      operation_type: log.operationType,
      endpoint: log.endpoint || null,
      model: log.model,
      input_tokens: log.inputTokens,
      output_tokens: log.outputTokens,
      cost_usd: costUsd,
      latency_ms: log.latencyMs,
      status: log.status,
      error_code: log.errorCode || null,
      error_message: log.errorMessage || null,
      metadata: log.metadata || {},
    });
  } catch (error) {
    // Don't let logging failures break the app
    logger.error('Failed to log API request', error as Error, {
      component: 'request-logger',
      operationType: log.operationType,
    });
  }
}

/**
 * Calculate cost based on model pricing
 */
function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model as ModelName];

  if (!pricing) {
    // Default to gpt-4o-mini pricing if model not found
    const defaultPricing = MODEL_PRICING['gpt-4o-mini'];
    return (
      (inputTokens / 1_000_000) * defaultPricing.input +
      (outputTokens / 1_000_000) * defaultPricing.output
    );
  }

  return (
    (inputTokens / 1_000_000) * pricing.input +
    (outputTokens / 1_000_000) * pricing.output
  );
}

/**
 * Batch log multiple requests (more efficient for bulk operations)
 */
export async function logApiRequestBatch(logs: ApiRequestLog[]): Promise<void> {
  if (logs.length === 0) return;

  try {
    const records = logs.map((log) => ({
      shop_id: log.shopId || null,
      operation_type: log.operationType,
      endpoint: log.endpoint || null,
      model: log.model,
      input_tokens: log.inputTokens,
      output_tokens: log.outputTokens,
      cost_usd: calculateCost(log.model, log.inputTokens, log.outputTokens),
      latency_ms: log.latencyMs,
      status: log.status,
      error_code: log.errorCode || null,
      error_message: log.errorMessage || null,
      metadata: log.metadata || {},
    }));

    await supabaseAdmin.from('api_request_logs').insert(records);
  } catch (error) {
    logger.error('Failed to batch log API requests', error as Error, {
      component: 'request-logger',
      count: logs.length,
    });
  }
}

/**
 * Create a request logger instance for tracking a single request lifecycle
 */
export function createRequestTracker(
  operationType: ApiRequestLog['operationType'],
  shopId?: string
): RequestTracker {
  return new RequestTracker(operationType, shopId);
}

class RequestTracker {
  private startTime: number;
  private operationType: ApiRequestLog['operationType'];
  private shopId?: string;

  constructor(operationType: ApiRequestLog['operationType'], shopId?: string) {
    this.startTime = Date.now();
    this.operationType = operationType;
    this.shopId = shopId;
  }

  async complete(result: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    endpoint?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await logApiRequest({
      shopId: this.shopId,
      operationType: this.operationType,
      endpoint: result.endpoint,
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      latencyMs: Date.now() - this.startTime,
      status: 'success',
      metadata: result.metadata,
    });
  }

  async error(result: {
    model: string;
    inputTokens?: number;
    outputTokens?: number;
    errorCode?: string;
    errorMessage: string;
    endpoint?: string;
    isTimeout?: boolean;
    isRateLimited?: boolean;
  }): Promise<void> {
    let status: ApiRequestLog['status'] = 'error';
    if (result.isTimeout) status = 'timeout';
    if (result.isRateLimited) status = 'rate_limited';

    await logApiRequest({
      shopId: this.shopId,
      operationType: this.operationType,
      endpoint: result.endpoint,
      model: result.model,
      inputTokens: result.inputTokens || 0,
      outputTokens: result.outputTokens || 0,
      latencyMs: Date.now() - this.startTime,
      status,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
    });
  }

  getElapsedMs(): number {
    return Date.now() - this.startTime;
  }
}
