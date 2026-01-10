/* eslint-disable security/detect-object-injection -- Dynamic object access with validated keys is safe here */
/**
 * API Key Security & Validation
 *
 * Provides secure API key management including:
 * - Key generation and hashing
 * - Key validation against database
 * - Usage tracking and monitoring
 * - Rate limiting support
 */

import { createHash, randomBytes } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/**
 * API Key Scopes
 */
export type ApiKeyScope = "read" | "write" | "delete" | "admin";

/**
 * API Key validation result
 */
export interface ApiKeyValidationResult {
  valid: boolean;
  keyId?: string;
  shopId?: string;
  scopes?: ApiKeyScope[];
  error?: string;
  rateLimitExceeded?: boolean;
}

/**
 * API Key creation result
 */
export interface ApiKeyCreationResult {
  success: boolean;
  keyId?: string;
  apiKey?: string; // Only returned once at creation
  keyPrefix?: string;
  error?: string;
}

/**
 * Generate a new API key
 * Format: tt_live_xxxxxxxxxxxxxxxxxxxx (32 random chars)
 */
export function generateApiKey(): string {
  const prefix = "tt_live_";
  const randomPart = randomBytes(24).toString("base64url");
  return `${prefix}${randomPart}`;
}

/**
 * Hash an API key for secure storage
 * Uses SHA-256 for fast validation
 */
export function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

/**
 * Get the prefix of an API key for identification
 */
export function getKeyPrefix(apiKey: string): string {
  return apiKey.substring(0, 12); // tt_live_xxxx
}

/**
 * Create a new API key for a shop
 */
export async function createApiKey(
  shopId: string,
  name: string,
  scopes: ApiKeyScope[] = ["read"],
  options?: {
    rateLimitPerMinute?: number;
    rateLimitPerDay?: number;
    expiresAt?: Date;
  },
): Promise<ApiKeyCreationResult> {
  try {
    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);
    const keyPrefix = getKeyPrefix(apiKey);

    const { data, error } = await supabaseAdmin
      .from("api_keys")
      .insert({
        shop_id: shopId,
        name,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        scopes,
        rate_limit_per_minute: options?.rateLimitPerMinute || 60,
        rate_limit_per_day: options?.rateLimitPerDay || 10000,
        expires_at: options?.expiresAt?.toISOString() || null,
      })
      .select("id")
      .single();

    if (error) {
      logger.error(
        "[API Keys] Failed to create API key:",
        error as unknown as Error,
        {
          component: "api-keys",
          shopId,
        },
      );
      return { success: false, error: "Failed to create API key" };
    }

    logger.info("[API Keys] API key created", {
      component: "api-keys",
      shopId,
      keyId: data.id,
      keyPrefix,
    });

    // Return the raw API key only once - it cannot be retrieved again
    return {
      success: true,
      keyId: data.id,
      apiKey,
      keyPrefix,
    };
  } catch (error) {
    logger.error("[API Keys] Error creating API key:", error as Error, {
      component: "api-keys",
    });
    return { success: false, error: "Internal error" };
  }
}

/**
 * Validate an API key and return associated data
 */
export async function validateApiKey(
  apiKey: string,
): Promise<ApiKeyValidationResult> {
  try {
    if (!apiKey || !apiKey.startsWith("tt_live_")) {
      return { valid: false, error: "Invalid API key format" };
    }

    const keyHash = hashApiKey(apiKey);

    // Look up the key
    const { data: keyData, error } = await supabaseAdmin
      .from("api_keys")
      .select(
        "id, shop_id, scopes, is_active, expires_at, rate_limit_per_minute, rate_limit_per_day, usage_count",
      )
      .eq("key_hash", keyHash)
      .single();

    if (error || !keyData) {
      logger.warn("[API Keys] Invalid API key attempted", {
        component: "api-keys",
        keyPrefix: getKeyPrefix(apiKey),
      });
      return { valid: false, error: "Invalid API key" };
    }

    // Check if key is active
    if (!keyData.is_active) {
      return { valid: false, error: "API key has been revoked" };
    }

    // Check expiration
    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return { valid: false, error: "API key has expired" };
    }

    // Check rate limits (basic check - could be enhanced with Redis)
    // For now, just increment usage count
    await supabaseAdmin
      .from("api_keys")
      .update({
        last_used_at: new Date().toISOString(),
        usage_count: (keyData.usage_count || 0) + 1,
      })
      .eq("id", keyData.id);

    return {
      valid: true,
      keyId: keyData.id,
      shopId: keyData.shop_id,
      scopes: keyData.scopes as ApiKeyScope[],
    };
  } catch (error) {
    logger.error("[API Keys] Error validating API key:", error as Error, {
      component: "api-keys",
    });
    return { valid: false, error: "Validation error" };
  }
}

/**
 * Check if an API key has a specific scope
 */
export function hasScope(
  scopes: ApiKeyScope[],
  requiredScope: ApiKeyScope,
): boolean {
  // Admin scope has all permissions
  if (scopes.includes("admin")) return true;
  // Write scope includes read
  if (requiredScope === "read" && scopes.includes("write")) return true;
  return scopes.includes(requiredScope);
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(
  keyId: string,
  shopId: string,
  reason?: string,
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from("api_keys")
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        revoked_reason: reason || "Revoked by user",
      })
      .eq("id", keyId)
      .eq("shop_id", shopId);

    if (error) {
      logger.error(
        "[API Keys] Failed to revoke API key:",
        error as unknown as Error,
        {
          component: "api-keys",
          keyId,
        },
      );
      return false;
    }

    logger.info("[API Keys] API key revoked", {
      component: "api-keys",
      keyId,
      shopId,
      reason,
    });

    return true;
  } catch (error) {
    logger.error("[API Keys] Error revoking API key:", error as Error, {
      component: "api-keys",
    });
    return false;
  }
}

/**
 * Log API key usage for monitoring
 */
export async function logApiKeyUsage(
  apiKeyId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTimeMs: number,
  options?: {
    ipAddress?: string;
    userAgent?: string;
    errorMessage?: string;
  },
): Promise<void> {
  try {
    await supabaseAdmin.from("api_key_usage_log").insert({
      api_key_id: apiKeyId,
      endpoint,
      method,
      status_code: statusCode,
      response_time_ms: responseTimeMs,
      ip_address: options?.ipAddress || null,
      user_agent: options?.userAgent || null,
      error_message: options?.errorMessage || null,
    });
  } catch (error) {
    // Don't fail the request if logging fails
    logger.error("[API Keys] Failed to log usage:", error as Error, {
      component: "api-keys",
      apiKeyId,
    });
  }
}

/**
 * Get API key usage statistics
 */
export async function getApiKeyUsageStats(
  keyId: string,
  shopId: string,
  days: number = 7,
): Promise<{
  totalRequests: number;
  successRate: number;
  avgResponseTime: number;
  topEndpoints: { endpoint: string; count: number }[];
} | null> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Verify ownership
    const { data: keyData } = await supabaseAdmin
      .from("api_keys")
      .select("id")
      .eq("id", keyId)
      .eq("shop_id", shopId)
      .single();

    if (!keyData) return null;

    // Get usage logs
    const { data: logs } = await supabaseAdmin
      .from("api_key_usage_log")
      .select("endpoint, status_code, response_time_ms")
      .eq("api_key_id", keyId)
      .gte("created_at", startDate.toISOString());

    if (!logs || logs.length === 0) {
      return {
        totalRequests: 0,
        successRate: 0,
        avgResponseTime: 0,
        topEndpoints: [],
      };
    }

    const totalRequests = logs.length;
    const successfulRequests = logs.filter(
      (l) => l.status_code && l.status_code < 400,
    ).length;
    const successRate = (successfulRequests / totalRequests) * 100;
    const avgResponseTime =
      logs.reduce((sum, l) => sum + (l.response_time_ms || 0), 0) /
      totalRequests;

    // Count endpoints
    const endpointCounts: Record<string, number> = {};
    logs.forEach((l) => {
      endpointCounts[l.endpoint] = (endpointCounts[l.endpoint] || 0) + 1;
    });

    const topEndpoints = Object.entries(endpointCounts)
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalRequests,
      successRate: Math.round(successRate * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime),
      topEndpoints,
    };
  } catch (error) {
    logger.error("[API Keys] Error getting usage stats:", error as Error, {
      component: "api-keys",
    });
    return null;
  }
}

/**
 * List all API keys for a shop
 */
export async function listApiKeys(shopId: string): Promise<
  {
    id: string;
    name: string;
    keyPrefix: string;
    scopes: ApiKeyScope[];
    isActive: boolean;
    lastUsedAt: string | null;
    usageCount: number;
    createdAt: string;
    expiresAt: string | null;
  }[]
> {
  try {
    const { data, error } = await supabaseAdmin
      .from("api_keys")
      .select(
        "id, name, key_prefix, scopes, is_active, last_used_at, usage_count, created_at, expires_at",
      )
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error(
        "[API Keys] Error listing API keys:",
        error as unknown as Error,
        {
          component: "api-keys",
          shopId,
        },
      );
      return [];
    }

    return (data || []).map((key) => ({
      id: key.id,
      name: key.name,
      keyPrefix: key.key_prefix,
      scopes: key.scopes as ApiKeyScope[],
      isActive: key.is_active,
      lastUsedAt: key.last_used_at,
      usageCount: key.usage_count || 0,
      createdAt: key.created_at,
      expiresAt: key.expires_at,
    }));
  } catch (error) {
    logger.error("[API Keys] Error listing API keys:", error as Error, {
      component: "api-keys",
    });
    return [];
  }
}

// ============================================================================
// Legacy exports for backwards compatibility
// ============================================================================

/**
 * Validate required environment variables are present
 */
export function validateEnvironmentVariables(): void {
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_KEY",
    "OPENAI_API_KEY",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
        "Please check your .env.local file.",
    );
  }
}

/**
 * Log internal API usage for monitoring (OpenAI, etc.)
 * This is for internal service tracking, not customer API key tracking
 */
export function logAPIUsage(
  _service: string,
  _operation: string,
  _metadata?: Record<string, unknown>,
): void {
  // Placeholder for future analytics integration
  // In production, you might want to send this to an analytics service
}

/**
 * Get OpenAI API key securely (server-side only)
 */
export function getOpenAIKey(): string {
  if (typeof window !== "undefined") {
    throw new Error(
      "Security violation: OpenAI API key accessed from client-side code.",
    );
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY not found in environment variables.");
  }

  return key;
}

/**
 * Get Supabase service key securely (server-side only)
 */
export function getSupabaseServiceKey(): string {
  if (typeof window !== "undefined") {
    throw new Error(
      "Security violation: Supabase service key accessed from client-side code.",
    );
  }

  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_KEY not found in environment variables.");
  }

  return key;
}

/**
 * Mask sensitive data for logging
 */
export function maskSensitiveData(key: string): string {
  if (!key || key.length < 8) {
    return "****";
  }
  return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
}

/**
 * Check if API keys are properly configured
 */
export function checkAPIKeyConfiguration(): {
  valid: boolean;
  missing: string[];
  warnings: string[];
} {
  const missing: string[] = [];
  const warnings: string[] = [];

  if (!process.env.OPENAI_API_KEY) missing.push("OPENAI_API_KEY");
  if (!process.env.SUPABASE_SERVICE_KEY) missing.push("SUPABASE_SERVICE_KEY");
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL)
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (
    process.env.OPENAI_API_KEY &&
    !process.env.OPENAI_API_KEY.startsWith("sk-")
  ) {
    warnings.push('OPENAI_API_KEY should start with "sk-"');
  }

  return { valid: missing.length === 0, missing, warnings };
}

/**
 * Environment-specific API key management
 */
export const API_KEY_CONFIG = {
  development: { rateLimitMultiplier: 2, logLevel: "debug" },
  staging: { rateLimitMultiplier: 1.5, logLevel: "info" },
  production: { rateLimitMultiplier: 1, logLevel: "warn" },
} as const;

/**
 * Get current environment
 */
export function getEnvironment(): "development" | "staging" | "production" {
  const env = process.env.NODE_ENV;
  if (env === "production") {
    // Check for staging indicators (Render preview environments)
    const isStaging =
      process.env.RENDER_SERVICE_TYPE === "preview" ||
      process.env.IS_PREVIEW === "true";
    return isStaging ? "staging" : "production";
  }
  return "development";
}
