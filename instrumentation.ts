/**
 * Next.js Instrumentation File
 * This file is used to initialize Sentry on the server side
 * DISABLED: Sentry not installed - uncomment when @sentry/nextjs is added
 */

export async function register() {
  // Sentry disabled - install @sentry/nextjs to enable
  // if (process.env.NEXT_RUNTIME === 'nodejs') {
  //   // Server-side initialization
  //   await import('./sentry.server.config')
  // }

  // if (process.env.NEXT_RUNTIME === 'edge') {
  //   // Edge runtime initialization
  //   await import('./sentry.edge.config')
  // }
}
