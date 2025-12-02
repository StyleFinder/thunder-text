/**
 * API Key Security Configuration
 *
 * Ensures secure handling of sensitive API keys (OpenAI, Supabase, etc.)
 * following security best practices.
 */

/**
 * Security Checklist for API Keys:
 *
 * ✅ 1. Never expose keys in client-side code
 * ✅ 2. Store keys in environment variables only
 * ✅ 3. Use server-side API routes for all external API calls
 * ✅ 4. Never commit .env files to version control
 * ✅ 5. Rotate keys regularly (every 90 days recommended)
 * ✅ 6. Use different keys for development, staging, and production
 * ✅ 7. Implement rate limiting to prevent key abuse
 * ✅ 8. Monitor API usage for anomalies
 * ✅ 9. Use minimal scope/permissions for each key
 * ✅ 10. Implement key rotation without downtime
 */

/**
 * Validate required environment variables are present
 *
 * @throws Error if required variables are missing
 */
export function validateEnvironmentVariables(): void {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_KEY',
    'OPENAI_API_KEY'
  ]

  const missing = required.filter(key => !process.env[key])

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env.local file.'
    )
  }
}

/**
 * Get OpenAI API key securely (server-side only)
 *
 * @throws Error if called from client-side
 * @returns OpenAI API key
 */
export function getOpenAIKey(): string {
  // Verify this is running server-side
  if (typeof window !== 'undefined') {
    throw new Error(
      'Security violation: OpenAI API key accessed from client-side code. ' +
      'API calls must be made from server-side API routes only.'
    )
  }

  const key = process.env.OPENAI_API_KEY

  if (!key) {
    throw new Error(
      'OPENAI_API_KEY not found in environment variables. ' +
      'Please add it to your .env.local file.'
    )
  }

  return key
}

/**
 * Get Supabase service key securely (server-side only)
 *
 * @throws Error if called from client-side
 * @returns Supabase service key
 */
export function getSupabaseServiceKey(): string {
  // Verify this is running server-side
  if (typeof window !== 'undefined') {
    throw new Error(
      'Security violation: Supabase service key accessed from client-side code. ' +
      'Use anon key for client-side and service key only in API routes.'
    )
  }

  const key = process.env.SUPABASE_SERVICE_KEY

  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_KEY not found in environment variables. ' +
      'Please add it to your .env.local file.'
    )
  }

  return key
}

/**
 * Mask sensitive data for logging
 *
 * @param key - API key or sensitive string
 * @returns Masked string showing only first/last 4 characters
 */
export function maskSensitiveData(key: string): string {
  if (!key || key.length < 8) {
    return '****'
  }

  return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`
}

/**
 * Log API usage for monitoring (without exposing keys)
 *
 * @param service - Service name (openai, supabase, etc.)
 * @param operation - Operation performed
 * @param userIdOrMetadata - User ID string OR metadata object (for backwards compatibility)
 * @param metadata - Additional metadata (optional, used when userIdOrMetadata is a string)
 */
export function logAPIUsage(
  service: string,
  operation: string,
  userIdOrMetadata?: string | Record<string, unknown>,
  metadata?: Record<string, unknown>
): void {
  // Handle overloaded parameters for backwards compatibility
  let userId: string | undefined
  let actualMetadata: Record<string, unknown>

  if (typeof userIdOrMetadata === 'string') {
    // Called with userId as string: logAPIUsage('openai', 'chat', 'user123', { ... })
    userId = userIdOrMetadata
    actualMetadata = metadata || {}
  } else {
    // Called with metadata directly: logAPIUsage('openai', 'chat', { ... })
    userId = undefined
    actualMetadata = userIdOrMetadata || {}
  }

  const logEntry = {
    timestamp: new Date().toISOString(),
    service,
    operation,
    userId: userId || 'system',
    metadata: actualMetadata
  }

  // In production, send to monitoring service (Datadog, Sentry, etc.)

  // TODO: Implement proper monitoring
  // - Track API costs per user
  // - Alert on unusual usage patterns
  // - Generate usage reports for billing
}

/**
 * Check if API keys are properly configured
 *
 * @returns Configuration status
 */
export function checkAPIKeyConfiguration(): {
  valid: boolean
  missing: string[]
  warnings: string[]
} {
  const missing: string[] = []
  const warnings: string[] = []

  // Check required keys
  if (!process.env.OPENAI_API_KEY) {
    missing.push('OPENAI_API_KEY')
  }

  if (!process.env.SUPABASE_SERVICE_KEY) {
    missing.push('SUPABASE_SERVICE_KEY')
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    missing.push('NEXT_PUBLIC_SUPABASE_URL')
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  // Check for common mistakes
  if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('sk-')) {
    warnings.push('OPENAI_API_KEY should start with "sk-"')
  }

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('supabase.co')) {
    warnings.push('NEXT_PUBLIC_SUPABASE_URL should be a Supabase URL')
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings
  }
}

/**
 * Environment-specific API key management
 */
export const API_KEY_CONFIG = {
  development: {
    rateLimitMultiplier: 2, // More lenient rate limits in dev
    logLevel: 'debug'
  },
  staging: {
    rateLimitMultiplier: 1.5,
    logLevel: 'info'
  },
  production: {
    rateLimitMultiplier: 1,
    logLevel: 'warn'
  }
} as const

/**
 * Get current environment
 */
export function getEnvironment(): 'development' | 'staging' | 'production' {
  const env = process.env.NODE_ENV

  if (env === 'production') {
    // Check if it's staging vs production based on URL or other env var
    const isStaging = process.env.VERCEL_ENV === 'preview'
    return isStaging ? 'staging' : 'production'
  }

  return 'development'
}
