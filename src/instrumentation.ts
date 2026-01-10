import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Dynamically import the Sentry server config for Node.js runtime
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    // Dynamically import the Sentry edge config for Edge runtime
    await import("../sentry.edge.config");
  }
}

// Use the Sentry-provided handler directly for correct typing
export const onRequestError = Sentry.captureRequestError;
