import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

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

/**
 * Protected routes that require authentication
 * Unauthenticated users will be redirected to /auth/login
 */
const PROTECTED_ROUTES = [
  "/dashboard",
  "/settings",
  "/products",
  "/generate",
  "/bhb",
];

/**
 * Public routes that don't require authentication
 */
const PUBLIC_ROUTES = [
  "/auth/login",
  "/auth/signup",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/coach/login",
  "/welcome", // Shopify install flow entry point - must be public
  "/pricing", // Plan selection page after Shopify OAuth - must be public
  "/",
];

/**
 * Check if a pathname matches any protected route
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/**
 * Check if a pathname is a public route
 * Note: Currently used for documentation/clarity, may be used for future route logic
 */
function _isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const searchParams = request.nextUrl.searchParams;

  // SHOPIFY HOSTED INSTALL FLOW DETECTION
  // When Shopify redirects after install via hosted OAuth (for non-embedded apps),
  // it sends hmac, shop, timestamp params to application_url (root /)
  // We need to redirect to /api/auth/shopify to initiate proper OAuth flow
  if (pathname === "/") {
    const shop = searchParams.get("shop");
    const hmac = searchParams.get("hmac");
    const timestamp = searchParams.get("timestamp");

    if (shop && hmac && timestamp) {
      console.log("[Middleware] Detected Shopify hosted install redirect");
      console.log("[Middleware] Shop:", shop, "Has HMAC:", !!hmac, "Has timestamp:", !!timestamp);

      // Normalize shop domain
      const normalizedShop = shop.includes(".myshopify.com") ? shop : `${shop}.myshopify.com`;

      // Redirect to OAuth initiation endpoint
      const oauthUrl = new URL("/api/auth/shopify", request.url);
      oauthUrl.searchParams.set("shop", normalizedShop);

      return NextResponse.redirect(oauthUrl);
    }
  }

  // Handle authentication for protected routes
  if (isProtectedRoute(pathname)) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      // Must match cookie config in auth-options.ts which doesn't use secure prefix
      cookieName: "next-auth.session-token",
      secureCookie: false,
    });

    // If no token, redirect to login
    if (!token) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

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
  // Middleware needed for:
  // 1. Root path (Shopify hosted install redirect detection)
  // 2. API routes (CORS handling)
  // 3. Protected page routes (authentication)
  // Security headers for pages are applied via next.config.ts
  // Note: /welcome is public (for Shopify install flow) - not included here
  matcher: [
    "/",
    "/api/:path*",
    "/dashboard/:path*",
    "/settings/:path*",
    "/products/:path*",
    "/generate/:path*",
    "/bhb/:path*",
  ],
};
