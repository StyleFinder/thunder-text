import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

/**
 * Test endpoint to verify Sentry connection
 * DELETE THIS FILE after verification is complete
 *
 * GET /api/test-sentry - Sends test log and error to Sentry
 */
export async function GET() {
  // Test 1: Send a test log
  Sentry.logger.info("User triggered test log", { log_source: "sentry" });

  // Test 2: Capture a test message
  Sentry.captureMessage("Sentry connection test from Thunder Text", "info");

  // Test 3: Create a test error (captured but not thrown)
  const testError = new Error("Test error from Thunder Text - Safe to ignore");
  Sentry.captureException(testError);

  return NextResponse.json({
    success: true,
    message: "Sentry test events sent! Check your Sentry dashboard.",
    timestamp: new Date().toISOString(),
    tests: [
      "logger.info - Check Logs in Sentry",
      "captureMessage - Check Issues in Sentry",
      "captureException - Check Issues in Sentry",
    ],
  });
}
