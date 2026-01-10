/**
 * Rate Limiting Middleware for Content Center APIs
 *
 * Implements sliding window algorithm for rate limiting API requests.
 * Uses Upstash Redis for distributed rate limiting in production,
 * with in-memory fallback for local development.
 *
 * @security P1 - Critical for preventing API abuse
 */

import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logger } from "@/lib/logger";

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  maxRequests: number; // Maximum requests allowed
  windowMs: number; // Time window in milliseconds
  message?: string; // Custom error message
}

/**
 * Rate limit store entry (for in-memory fallback)
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * In-memory rate limit store (fallback for local dev without Redis)
 *
 * M5 SECURITY WARNING: In-memory fallback does NOT work in multi-instance deployments.
 * Each instance maintains its own independent rate limit counters, effectively
 * multiplying the allowed rate by the number of instances.
 *
 * For production multi-instance deployments:
 * 1. Always configure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 * 2. If Redis is unavailable, consider temporarily reducing rate limits
 * 3. Monitor for rate limit bypass attempts
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

// Track whether we've logged the multi-instance warning
let multiInstanceWarningLogged = false;

/**
 * Clean up expired entries every 5 minutes (for in-memory fallback)
 */
if (typeof window === "undefined") {
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, entry] of rateLimitStore.entries()) {
        if (entry.resetTime < now) {
          rateLimitStore.delete(key);
        }
      }
    },
    5 * 60 * 1000,
  );
}

/**
 * Initialize Upstash Redis client if credentials are available
 */
let redis: Redis | null = null;
const upstashRatelimiters: Map<string, Ratelimit> = new Map();

function getRedisClient(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    try {
      redis = new Redis({ url, token });
      logger.info("Upstash Redis client initialized", {
        component: "rate-limit",
      });
      return redis;
    } catch (error) {
      logger.warn(
        "Failed to initialize Upstash Redis, using in-memory fallback",
        {
          component: "rate-limit",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      );
      return null;
    }
  }

  return null;
}

/**
 * Get or create an Upstash rate limiter for a specific configuration
 */
function getUpstashRatelimiter(config: RateLimitConfig): Ratelimit | null {
  const redisClient = getRedisClient();
  if (!redisClient) return null;

  const key = `${config.maxRequests}:${config.windowMs}`;

  if (!upstashRatelimiters.has(key)) {
    // Convert windowMs to seconds for Upstash
    const windowSeconds = Math.ceil(config.windowMs / 1000);

    upstashRatelimiters.set(
      key,
      new Ratelimit({
        redis: redisClient,
        limiter: Ratelimit.slidingWindow(
          config.maxRequests,
          `${windowSeconds} s`,
        ),
        analytics: true, // Enable analytics for monitoring
        prefix: "thunder_text_ratelimit",
      }),
    );
  }

  return upstashRatelimiters.get(key)!;
}

/**
 * Default rate limit configurations for different endpoint types
 */
export const RATE_LIMITS = {
  // Generation endpoints (expensive OpenAI calls)
  GENERATION: {
    maxRequests: 100,
    windowMs: 60 * 60 * 1000, // 1 hour
    message:
      "Generation rate limit exceeded. Maximum 100 generations per hour.",
  },

  // Read endpoints (samples, profiles, content lists)
  READ: {
    maxRequests: 1000,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: "API rate limit exceeded. Maximum 1000 requests per hour.",
  },

  // Write endpoints (create/update samples, profiles)
  WRITE: {
    maxRequests: 200,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: "Write rate limit exceeded. Maximum 200 requests per hour.",
  },

  // Voice profile generation (most expensive operation)
  VOICE_GENERATION: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
    message:
      "Voice profile generation rate limit exceeded. Maximum 10 profiles per hour.",
  },

  // ============================================================================
  // Authentication Rate Limits
  // @security H2 - Critical for preventing brute force and credential stuffing
  // ============================================================================

  // Login attempts - strict limit to prevent credential stuffing
  AUTH_LOGIN: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute window
    message: "Too many login attempts. Please try again in a minute.",
  },

  // Signup - prevent account creation spam
  AUTH_SIGNUP: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hour per IP
    message: "Too many signup attempts. Please try again later.",
  },

  // Password reset - prevent email bombing
  AUTH_PASSWORD_RESET: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: "Too many password reset requests. Please try again later.",
  },
} as const;

/**
 * Check if a request should be rate limited (async version for Redis)
 *
 * @param userId - User ID to track rate limits per user
 * @param config - Rate limit configuration
 * @returns Object with allowed status and rate limit headers
 */
export async function checkRateLimitAsync(
  userId: string,
  config: RateLimitConfig,
): Promise<{
  allowed: boolean;
  headers: Record<string, string>;
  remainingRequests?: number;
}> {
  const ratelimiter = getUpstashRatelimiter(config);

  if (ratelimiter) {
    // Use Upstash Redis for distributed rate limiting
    try {
      const identifier = `${userId}:${config.maxRequests}:${config.windowMs}`;
      const result = await ratelimiter.limit(identifier);

      const headers: Record<string, string> = {
        "X-RateLimit-Limit": result.limit.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": Math.ceil(result.reset / 1000).toString(),
        "X-RateLimit-Reset-After": Math.ceil(
          (result.reset - Date.now()) / 1000,
        ).toString(),
        "X-RateLimit-Provider": "upstash-redis",
      };

      if (!result.success) {
        headers["Retry-After"] = Math.ceil(
          (result.reset - Date.now()) / 1000,
        ).toString();
      }

      return {
        allowed: result.success,
        headers,
        remainingRequests: result.remaining,
      };
    } catch (error) {
      logger.error(
        "Upstash rate limit check failed, falling back to in-memory",
        {
          component: "rate-limit",
          error: error instanceof Error ? error.message : "Unknown error",
          userId,
        },
      );
      // Fall through to in-memory implementation
    }
  }

  // In-memory fallback
  return checkRateLimitInMemory(userId, config);
}

/**
 * In-memory rate limit check (fallback)
 *
 * M5 SECURITY: This fallback is per-instance only. In multi-instance deployments,
 * rate limits are not shared across instances. Use Redis in production.
 */
function checkRateLimitInMemory(
  userId: string,
  config: RateLimitConfig,
): {
  allowed: boolean;
  headers: Record<string, string>;
  remainingRequests?: number;
} {
  // M5: Log warning once about in-memory fallback in production
  if (process.env.NODE_ENV === "production" && !multiInstanceWarningLogged) {
    logger.warn("Rate limiting using in-memory fallback - NOT distributed", {
      component: "rate-limit",
      warning: "Rate limits are per-instance only. Configure Redis for production.",
    });
    multiInstanceWarningLogged = true;
  }

  const key = `${userId}:${config.maxRequests}:${config.windowMs}`;
  const now = Date.now();

  // Get or create entry
  let entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime < now) {
    // Create new entry or reset expired entry
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);
  }

  // Increment request count
  entry.count++;

  // Calculate time until reset
  const resetTimeSeconds = Math.ceil((entry.resetTime - now) / 1000);
  const remainingRequests = Math.max(0, config.maxRequests - entry.count);

  // Build rate limit headers (following GitHub API conventions)
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": config.maxRequests.toString(),
    "X-RateLimit-Remaining": remainingRequests.toString(),
    "X-RateLimit-Reset": Math.ceil(entry.resetTime / 1000).toString(),
    "X-RateLimit-Reset-After": resetTimeSeconds.toString(),
    "X-RateLimit-Provider": "in-memory",
  };

  // Check if limit exceeded
  const allowed = entry.count <= config.maxRequests;

  if (!allowed) {
    headers["Retry-After"] = resetTimeSeconds.toString();
  }

  return {
    allowed,
    headers,
    remainingRequests,
  };
}

/**
 * Synchronous check (legacy, uses in-memory only)
 * @deprecated Use checkRateLimitAsync for production
 */
export function checkRateLimit(
  userId: string,
  config: RateLimitConfig,
): {
  allowed: boolean;
  headers: Record<string, string>;
  remainingRequests?: number;
} {
  return checkRateLimitInMemory(userId, config);
}

/**
 * Rate limit middleware wrapper for API routes (async, uses Redis when available)
 *
 * @param config - Rate limit configuration
 * @returns Middleware function that checks rate limits
 */
export function withRateLimit(config: RateLimitConfig) {
  return async (
    _request: NextRequest,
    userId: string,
  ): Promise<NextResponse | null> => {
    const { allowed, headers, remainingRequests } = await checkRateLimitAsync(
      userId,
      config,
    );

    if (!allowed) {
      logger.warn("Rate limit exceeded", {
        component: "rate-limit",
        userId,
        limit: config.maxRequests,
        provider: headers["X-RateLimit-Provider"],
      });

      return NextResponse.json(
        {
          success: false,
          error: config.message || "Rate limit exceeded",
          retryAfter: headers["Retry-After"],
        },
        {
          status: 429,
          headers,
        },
      );
    }

    // Log approaching rate limit (when 90% consumed)
    if (
      remainingRequests !== undefined &&
      remainingRequests < config.maxRequests * 0.1
    ) {
      logger.warn("User approaching rate limit", {
        component: "rate-limit",
        userId,
        remainingRequests,
        maxRequests: config.maxRequests,
        provider: headers["X-RateLimit-Provider"],
      });
    }

    return null; // No rate limit response needed, proceed with request
  };
}

/**
 * Get rate limit status for a user
 * Useful for displaying rate limit info to users
 *
 * @param userId - User ID
 * @param config - Rate limit configuration
 * @returns Rate limit status
 */
export function getRateLimitStatus(
  userId: string,
  config: RateLimitConfig,
): {
  limit: number;
  remaining: number;
  resetTime: number;
  resetAfter: number;
} {
  const key = `${userId}:${config.maxRequests}:${config.windowMs}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime < now) {
    return {
      limit: config.maxRequests,
      remaining: config.maxRequests,
      resetTime: now + config.windowMs,
      resetAfter: config.windowMs / 1000,
    };
  }

  return {
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetTime: entry.resetTime,
    resetAfter: Math.ceil((entry.resetTime - now) / 1000),
  };
}
