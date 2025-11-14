/**
 * Sentry Client-Side Configuration
 * This file configures error tracking for browser/client-side errors
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // Your Sentry DSN - add this to .env.local as NEXT_PUBLIC_SENTRY_DSN
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment
  environment: process.env.NODE_ENV || "development",

  // Sample rate for performance monitoring
  // 1.0 = 100% of transactions, 0.1 = 10%
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Only send errors in production
  enabled: process.env.NODE_ENV === "production",

  // Capture unhandled promise rejections
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Session Replay sample rate
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

  // Filter out common noise
  ignoreErrors: [
    // Browser extensions
    "top.GLOBALS",
    // Random plugins/extensions
    "originalCreateNotification",
    "canvas.contentDocument",
    "MyApp_RemoveAllHighlights",
    // Facebook flakiness
    "fb_xd_fragment",
    // Shopify App Bridge expected errors
    "APP::ERROR::INVALID_CONFIG",
  ],

  // Add release tracking (optional)
  // release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Custom tags
  initialScope: {
    tags: {
      app: "thunder-text",
      runtime: "browser",
      separation_phase: "phase-0", // Track app separation progress
      migration_status: "pre-separation", // Current migration state
    },
  },
});
