import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 10% sampling in production to reduce costs, 100% in development for debugging
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: true,

  // Enable Sentry logging feature
  _experiments: {
    enableLogs: true,
  },

  // Filter out sensitive data
  beforeSend(event) {
    // Remove PII and sensitive data
    if (event.request?.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.cookie;
    }

    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
        if (breadcrumb.data) {
          delete breadcrumb.data.accessToken;
          delete breadcrumb.data.access_token;
          delete breadcrumb.data.password;
          delete breadcrumb.data.session_token;
        }
        return breadcrumb;
      });
    }

    return event;
  },
});
