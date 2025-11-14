/**
 * Sentry Server-Side Configuration
 * This file configures error tracking for server-side/API errors
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // Your Sentry DSN - add this to .env.local as NEXT_PUBLIC_SENTRY_DSN
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment
  environment: process.env.NODE_ENV || "development",

  // Sample rate for performance monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Only send errors in production
  enabled: process.env.NODE_ENV === "production",

  // Server-side integrations
  integrations: [Sentry.httpIntegration()],

  // Filter out sensitive data
  beforeSend(event) {
    // Remove sensitive headers
    if (event.request?.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["cookie"];
      delete event.request.headers["x-shopify-access-token"];
    }

    // Remove sensitive env vars from context
    if (event.contexts?.runtime?.env) {
      const env = event.contexts.runtime.env as Record<string, unknown>;
      delete env["SHOPIFY_ACCESS_TOKEN"];
      delete env["SHOPIFY_API_SECRET"];
      delete env["OPENAI_API_KEY"];
      delete env["SUPABASE_SERVICE_KEY"];
      delete env["NEXTAUTH_SECRET"];
      delete env["ENCRYPTION_KEY"];
    }

    return event;
  },

  // Add release tracking (optional)
  // release: process.env.VERCEL_GIT_COMMIT_SHA,

  // Custom tags
  initialScope: {
    tags: {
      app: "thunder-text",
      runtime: "server",
      separation_phase: "phase-1", // Track app separation progress
      migration_status: "extracting-shared-backend", // Current migration state
    },
  },
});
