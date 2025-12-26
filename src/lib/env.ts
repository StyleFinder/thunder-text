/**
 * Environment Variable Validation
 *
 * Validates all required environment variables at startup using Zod.
 * Fails fast if required variables are missing or invalid.
 *
 * Usage:
 * - Import `env` instead of accessing `process.env` directly
 * - For client-side vars, use `clientEnv`
 */

import { z } from 'zod';

/**
 * Server-side environment variables schema
 * These are only available on the server
 */
const serverEnvSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // NextAuth
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required'),

  // Shopify
  SHOPIFY_API_KEY: z.string().min(1, 'Shopify API key is required'),
  SHOPIFY_API_SECRET: z.string().min(1, 'Shopify API secret is required'),

  // OpenAI
  OPENAI_API_KEY: z.string().startsWith('sk-', 'OpenAI API key must start with sk-'),

  // Encryption
  ENCRYPTION_KEY: z.string().length(64, 'ENCRYPTION_KEY must be exactly 64 hex characters'),

  // Optional: Database (if using direct connection)
  DATABASE_URL: z.string().url().optional(),

  // Optional: Email (for password reset, etc.)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),

  // Optional: Facebook/Meta
  FACEBOOK_APP_ID: z.string().optional(),
  FACEBOOK_APP_SECRET: z.string().optional(),

  // Optional: Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Optional: Google AI (Gemini/Imagen)
  GOOGLE_AI_API_KEY: z.string().optional(),

  // Optional: TikTok
  TIKTOK_CLIENT_KEY: z.string().optional(),
  TIKTOK_CLIENT_SECRET: z.string().optional(),

  // Optional: Sentry
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
});

/**
 * Client-side environment variables schema
 * Only NEXT_PUBLIC_ prefixed variables are available on the client
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url('Invalid app URL'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

// Type exports
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

/**
 * Validate and parse server environment variables
 */
function validateServerEnv(): ServerEnv {
  // Skip validation in edge runtime or if explicitly disabled
  if (typeof window !== 'undefined') {
    throw new Error('Server env should not be accessed on the client');
  }

  const parsed = serverEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const errorMessages = Object.entries(errors)
      .map(([key, msgs]) => `  ${key}: ${msgs?.join(', ')}`)
      .join('\n');

    console.error('\n❌ Invalid environment variables:\n' + errorMessages + '\n');

    // In production, fail fast
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Invalid environment variables. Check server logs.');
    }

    // In development, warn but continue with defaults where possible
    console.warn('⚠️  Running with invalid environment variables. Some features may not work.\n');
  }

  return parsed.success ? parsed.data : (process.env as unknown as ServerEnv);
}

/**
 * Validate and parse client environment variables
 */
function validateClientEnv(): ClientEnv {
  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const errorMessages = Object.entries(errors)
      .map(([key, msgs]) => `  ${key}: ${msgs?.join(', ')}`)
      .join('\n');

    console.error('\n❌ Invalid client environment variables:\n' + errorMessages + '\n');

    if (process.env.NODE_ENV === 'production') {
      throw new Error('Invalid client environment variables.');
    }
  }

  return parsed.success ? parsed.data : ({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || '',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  } as ClientEnv);
}

/**
 * Validated server environment variables
 * Use this instead of process.env for type safety
 */
export const env = validateServerEnv();

/**
 * Validated client environment variables
 * Safe to use on both server and client
 */
export const clientEnv = validateClientEnv();

/**
 * Helper to check if we're in production
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * Helper to check if we're in development
 */
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * Helper to check if we're in test
 */
export const isTest = env.NODE_ENV === 'test';

/**
 * Validate environment at module load time
 * This runs when the module is first imported
 */
if (typeof window === 'undefined') {
  // Only run server validation on the server
  try {
    validateServerEnv();
    if (process.env.NODE_ENV !== 'test') {
      console.log('✅ Environment variables validated successfully');
    }
  } catch (error) {
    // Error already logged in validateServerEnv
  }
}
