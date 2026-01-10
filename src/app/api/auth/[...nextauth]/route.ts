import { NextRequest, NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { checkRateLimitAsync, RATE_LIMITS } from "@/lib/middleware/rate-limit";
import { logger } from "@/lib/logger";

// Validate NEXTAUTH_SECRET is set
if (!process.env.NEXTAUTH_SECRET) {
  logger.error(
    "CRITICAL: NEXTAUTH_SECRET environment variable is not set! This is required for NextAuth to function properly.",
    new Error("Missing NEXTAUTH_SECRET"),
    { component: "auth" },
  );
}

const handler = NextAuth(authOptions);

// GET requests don't need rate limiting (OAuth callbacks, CSRF token fetch, etc.)
export { handler as GET };

/**
 * POST handler with rate limiting for login attempts
 * @security H2 - Prevents brute force and credential stuffing attacks
 */
export async function POST(req: NextRequest, context: { params: Promise<{ nextauth: string[] }> }) {
  // SECURITY H2: Rate limit login attempts by IP
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                   req.headers.get("x-real-ip") ||
                   "unknown";

  // Only rate limit the credentials callback (actual login attempts)
  const params = await context.params;
  const isCredentialsCallback = params.nextauth?.includes("callback") &&
                                 params.nextauth?.includes("credentials");

  if (isCredentialsCallback) {
    const { allowed, headers: rateLimitHeaders } = await checkRateLimitAsync(
      `login:${clientIp}`,
      RATE_LIMITS.AUTH_LOGIN
    );

    if (!allowed) {
      logger.warn("[Auth] Login rate limit exceeded", {
        component: "auth",
        ip: clientIp,
      });
      return NextResponse.json(
        { error: RATE_LIMITS.AUTH_LOGIN.message },
        { status: 429, headers: rateLimitHeaders }
      );
    }
  }

  // Pass through to NextAuth handler
  return handler(req, context);
}
