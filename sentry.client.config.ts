import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 10% sampling in production to reduce costs, 100% in development for debugging
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Replay configuration
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Filter out sensitive data
  beforeSend(event) {
    // Remove PII from breadcrumbs and contexts
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
        if (breadcrumb.data) {
          // Remove access tokens, passwords, etc.
          delete breadcrumb.data.accessToken;
          delete breadcrumb.data.access_token;
          delete breadcrumb.data.password;
        }
        return breadcrumb;
      });
    }
    return event;
  },

  // Scrub PII from transaction names (URLs)
  beforeSendTransaction(transaction) {
    if (transaction.transaction) {
      // Replace dynamic route segments with placeholders
      transaction.transaction = transaction.transaction
        .replace(/\/stores\/[^/]+/, "/stores/[shopId]")
        .replace(/\/products\/[^/]+/, "/products/[productId]")
        .replace(/\/sessions\/[^/]+/, "/sessions/[sessionId]")
        .replace(/email=[^&]+/, "email=[REDACTED]")
        .replace(/token=[^&]+/, "token=[REDACTED]");
    }
    return transaction;
  },
});
