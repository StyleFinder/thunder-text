/**
 * Rate Limiting Middleware for Content Center APIs
 *
 * Implements token bucket algorithm for rate limiting API requests.
 * Stores rate limit state in memory (for single-instance deployments)
 * or can be extended to use Redis for distributed systems.
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  maxRequests: number // Maximum requests allowed
  windowMs: number // Time window in milliseconds
  message?: string // Custom error message
}

/**
 * Rate limit store entry
 */
interface RateLimitEntry {
  count: number
  resetTime: number
}

/**
 * In-memory rate limit store
 * TODO: Replace with Redis for production/distributed deployments
 */
const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * Clean up expired entries every 5 minutes
 */
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

/**
 * Default rate limit configurations for different endpoint types
 */
export const RATE_LIMITS = {
  // Generation endpoints (expensive OpenAI calls)
  GENERATION: {
    maxRequests: 100,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Generation rate limit exceeded. Maximum 100 generations per hour.'
  },

  // Read endpoints (samples, profiles, content lists)
  READ: {
    maxRequests: 1000,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'API rate limit exceeded. Maximum 1000 requests per hour.'
  },

  // Write endpoints (create/update samples, profiles)
  WRITE: {
    maxRequests: 200,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Write rate limit exceeded. Maximum 200 requests per hour.'
  },

  // Voice profile generation (most expensive operation)
  VOICE_GENERATION: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Voice profile generation rate limit exceeded. Maximum 10 profiles per hour.'
  }
} as const

/**
 * Check if a request should be rate limited
 *
 * @param userId - User ID to track rate limits per user
 * @param config - Rate limit configuration
 * @returns Object with allowed status and rate limit headers
 */
export function checkRateLimit(
  userId: string,
  config: RateLimitConfig
): {
  allowed: boolean
  headers: Record<string, string>
  remainingRequests?: number
} {
  const key = `${userId}:${config.maxRequests}:${config.windowMs}`
  const now = Date.now()

  // Get or create entry
  let entry = rateLimitStore.get(key)

  if (!entry || entry.resetTime < now) {
    // Create new entry or reset expired entry
    entry = {
      count: 0,
      resetTime: now + config.windowMs
    }
    rateLimitStore.set(key, entry)
  }

  // Increment request count
  entry.count++

  // Calculate time until reset
  const resetTimeSeconds = Math.ceil((entry.resetTime - now) / 1000)
  const remainingRequests = Math.max(0, config.maxRequests - entry.count)

  // Build rate limit headers (following GitHub API conventions)
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': remainingRequests.toString(),
    'X-RateLimit-Reset': Math.ceil(entry.resetTime / 1000).toString(),
    'X-RateLimit-Reset-After': resetTimeSeconds.toString()
  }

  // Check if limit exceeded
  const allowed = entry.count <= config.maxRequests

  if (!allowed) {
    headers['Retry-After'] = resetTimeSeconds.toString()
  }

  return {
    allowed,
    headers,
    remainingRequests
  }
}

/**
 * Rate limit middleware wrapper for API routes
 *
 * @param config - Rate limit configuration
 * @returns Middleware function that checks rate limits
 */
export function withRateLimit(config: RateLimitConfig) {
  return async (
    request: NextRequest,
    userId: string
  ): Promise<NextResponse | null> => {
    const { allowed, headers, remainingRequests } = checkRateLimit(userId, config)

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          error: config.message || 'Rate limit exceeded',
          retryAfter: headers['Retry-After']
        },
        {
          status: 429,
          headers
        }
      )
    }

    // Log approaching rate limit (when 90% consumed)
    if (remainingRequests !== undefined && remainingRequests < config.maxRequests * 0.1) {
      logger.warn(
        'User approaching rate limit',
        {
          component: 'rate-limit',
          userId,
          remainingRequests,
          maxRequests: config.maxRequests
        }
      )
    }

    return null // No rate limit response needed, proceed with request
  }
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
  config: RateLimitConfig
): {
  limit: number
  remaining: number
  resetTime: number
  resetAfter: number
} {
  const key = `${userId}:${config.maxRequests}:${config.windowMs}`
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || entry.resetTime < now) {
    return {
      limit: config.maxRequests,
      remaining: config.maxRequests,
      resetTime: now + config.windowMs,
      resetAfter: config.windowMs / 1000
    }
  }

  return {
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetTime: entry.resetTime,
    resetAfter: Math.ceil((entry.resetTime - now) / 1000)
  }
}
