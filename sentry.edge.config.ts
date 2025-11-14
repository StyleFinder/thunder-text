/**
 * Sentry Edge Runtime Configuration
 * This file configures error tracking for edge runtime functions (middleware, edge API routes)
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // Your Sentry DSN
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment
  environment: process.env.NODE_ENV || "development",

  // Sample rate for performance monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Only send errors in production
  enabled: process.env.NODE_ENV === "production",

  // Custom tags
  initialScope: {
    tags: {
      app: "thunder-text",
      runtime: "edge",
      separation_phase: "phase-0", // Track app separation progress
      migration_status: "pre-separation", // Current migration state
    },
  },
});
