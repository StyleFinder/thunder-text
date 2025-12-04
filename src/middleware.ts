import { NextRequest, NextResponse } from "next/server";

/**
 * CORS Configuration for ThunderText (Non-Embedded External Shopify App)
 *
 * Architecture: ThunderText runs on its own domain (app.zunosai.com / thunder-text.onrender.com)
 * and is NOT embedded within Shopify Admin. See shopify.app.toml: embedded = false
 *
 * CORS is needed for:
 * - Shopify webhook deliveries (from Shopify servers)
 * - API calls from our own frontend
 * - Development/testing environments
 */
function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;

  // Our app domains (production)
  const allowedDomains = [
    "https://thunder-text.onrender.com",
    "https://app.zunosai.com",
  ];

  if (allowedDomains.includes(origin)) {
    return true;
  }

  // Check RENDER_EXTERNAL_URL environment variable
  if (
    process.env.RENDER_EXTERNAL_URL &&
    origin === process.env.RENDER_EXTERNAL_URL
  ) {
    return true;
  }

  // Development environment only
  if (process.env.NODE_ENV === "development") {
    if (
      origin === "http://localhost:3000" ||
      origin === "http://localhost:3050" ||
      origin.startsWith("http://localhost:")
    ) {
      return true;
    }
  }

  return false;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Handle CORS for API routes
  if (pathname.startsWith("/api/")) {
    const response = NextResponse.next();
    const origin = request.headers.get("origin") || "";
    const referer = request.headers.get("referer") || "";

    // Check if this is a same-origin request (no origin header, referer is our domain)
    const isOwnDomainReferer =
      referer &&
      (referer.startsWith("https://thunder-text.onrender.com") ||
        referer.startsWith("https://app.zunosai.com") ||
        (process.env.RENDER_EXTERNAL_URL &&
          referer.startsWith(process.env.RENDER_EXTERNAL_URL)) ||
        (process.env.NODE_ENV === "development" &&
          referer.startsWith("http://localhost:")));

    // For same-origin requests, let browser handle it
    if (!origin && isOwnDomainReferer) {
      return response;
    }

    // Validate origin against whitelist for cross-origin requests
    const isAllowed = isAllowedOrigin(origin);

    if (isAllowed) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );
      response.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Requested-With, X-Shopify-Access-Token",
      );
      response.headers.set("Access-Control-Allow-Credentials", "true");
      response.headers.set("Access-Control-Max-Age", "86400");
    } else if (origin) {
      // Unauthorized cross-origin request
      console.warn("⚠️ CORS violation attempt from:", origin);
      response.headers.set("Access-Control-Allow-Origin", "null");
      response.headers.set("Access-Control-Allow-Methods", "OPTIONS");
      response.headers.set("Access-Control-Max-Age", "0");
    }
    // Note: Requests without origin header (like webhooks from Shopify servers)
    // are allowed through - they don't need CORS headers

    // Handle OPTIONS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 200, headers: response.headers });
    }

    return response;
  }

  // All other routes - standard page requests
  // Security headers are applied via next.config.ts for all routes
  return NextResponse.next();
}

export const config = {
  // Middleware only needed for API routes (CORS handling)
  // Security headers for pages are applied via next.config.ts
  matcher: ["/api/:path*"],
};
