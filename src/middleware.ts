import { NextRequest, NextResponse } from "next/server";

/**
 * Security-hardened CORS configuration
 * Whitelists only authorized Shopify domains
 */
function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;

  const allowedPatterns = [
    // Shopify admin and merchant domains
    /^https:\/\/[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/,
    /^https:\/\/admin\.shopify\.com$/,
    // Shopify development and preview environments
    /^https:\/\/[a-zA-Z0-9][a-zA-Z0-9-]*\.spin\.dev$/,
    /^https:\/\/[a-zA-Z0-9][a-zA-Z0-9-]*\.shopifypreview\.com$/,
  ];

  // Development environment only
  if (process.env.NODE_ENV === "development") {
    if (
      origin === "http://localhost:3000" ||
      origin.startsWith("http://localhost:")
    ) {
      return true;
    }
  }

  // Our app domain (Render deployment)
  if (origin === "https://thunder-text.onrender.com") {
    return true;
  }

  // Check RENDER_EXTERNAL_URL environment variable
  if (
    process.env.RENDER_EXTERNAL_URL &&
    origin === process.env.RENDER_EXTERNAL_URL
  ) {
    return true;
  }

  // Test against Shopify domain patterns
  return allowedPatterns.some((pattern) => pattern.test(origin));
}

export function middleware(request: NextRequest) {
  // Get the pathname
  const pathname = request.nextUrl.pathname;

  // Handle CORS for API routes
  if (pathname.startsWith("/api/")) {
    const response = NextResponse.next();

    // Get origin from request
    const origin = request.headers.get("origin") || "";
    const referer = request.headers.get("referer") || "";

    // Check if this is a same-origin request (no origin header, referer is our domain)
    const isOwnDomainReferer =
      referer &&
      (referer.startsWith("https://thunder-text.onrender.com") ||
        (process.env.RENDER_EXTERNAL_URL &&
          referer.startsWith(process.env.RENDER_EXTERNAL_URL)) ||
        (process.env.NODE_ENV === "development" &&
          referer.startsWith("http://localhost:")));

    // For same-origin requests, don't apply CORS (browser handles it)
    if (!origin && isOwnDomainReferer) {
      // Same-origin: Let the request proceed without CORS headers
      // Browser will handle same-origin policy automatically
      return response;
    }

    // Validate origin against whitelist for cross-origin requests
    const isAllowed = isAllowedOrigin(origin);

    // For embedded apps without origin, check referer as fallback
    const isShopifyReferer =
      referer &&
      (referer.includes(".myshopify.com") ||
        referer.includes("admin.shopify.com") ||
        referer.includes(".spin.dev") ||
        referer.includes(".shopifypreview.com"));

    // SECURITY: Only set CORS headers for whitelisted cross-origin requests
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
    } else if (!origin && isShopifyReferer) {
      // Embedded app context: no origin but valid Shopify referer
      // Extract origin from referer
      try {
        const refererUrl = new URL(referer);
        const refererOrigin = refererUrl.origin;
        if (isAllowedOrigin(refererOrigin)) {
          response.headers.set("Access-Control-Allow-Origin", refererOrigin);
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
        }
      } catch {
        // Invalid referer URL, reject
        console.warn("⚠️ Invalid referer URL:", referer);
      }
    } else {
      // Unauthorized origin - return restrictive CORS headers
      console.warn("⚠️ CORS violation attempt from:", origin || referer);
      response.headers.set("Access-Control-Allow-Origin", "null");
      response.headers.set("Access-Control-Allow-Methods", "OPTIONS");
      response.headers.set("Access-Control-Max-Age", "0");
    }

    // Handle OPTIONS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 200, headers: response.headers });
    }

    return response;
  }

  // Handle embedded app pages - include all possible routes
  if (
    pathname === "/" ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/embed") ||
    pathname.startsWith("/debug-token") ||
    pathname.startsWith("/create-pd") ||
    pathname.startsWith("/products") ||
    pathname.startsWith("/content-center") ||
    // ACE routes (integrated from ace-app)
    pathname.startsWith("/aie") ||
    pathname.startsWith("/create-ad") ||
    pathname.startsWith("/ads-library") ||
    pathname.startsWith("/ad-vault") ||
    pathname.startsWith("/facebook-ads") ||
    pathname.startsWith("/business-profile") ||
    pathname.startsWith("/brand-voice") ||
    pathname.startsWith("/best-practices")
  ) {
    const response = NextResponse.next();

    // SECURITY: Whitelist only Shopify domains for frame embedding
    // This prevents clickjacking attacks while allowing Shopify Admin embedding
    const allowedFrameAncestors = [
      "https://*.myshopify.com",
      "https://admin.shopify.com",
      "https://*.spin.dev",
      "https://*.shopifypreview.com",
      "https://thunder-text.onrender.com",
    ];

    // Add localhost for development
    if (process.env.NODE_ENV === "development") {
      allowedFrameAncestors.push("http://localhost:*");
    }

    response.headers.set(
      "Content-Security-Policy",
      `frame-ancestors ${allowedFrameAncestors.join(" ")}`,
    );

    // Explicitly remove X-Frame-Options - Vercel adds it by default
    response.headers.delete("X-Frame-Options");

    // Add additional security headers for embedding
    response.headers.set("X-Content-Type-Options", "nosniff");

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/",
    "/dashboard/:path*",
    "/settings/:path*",
    "/create/:path*",
    "/products/:path*",
    "/debug-token/:path*",
    "/embed/:path*",
    "/content-center/:path*",
    // ACE routes (integrated from ace-app)
    "/aie/:path*",
    "/create-ad/:path*",
    "/ads-library/:path*",
    "/ad-vault/:path*",
    "/facebook-ads/:path*",
    "/business-profile/:path*",
    "/brand-voice/:path*",
    "/best-practices/:path*",
  ],
};
