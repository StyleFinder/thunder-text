import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * URL Routing Architecture
 *
 * ThunderText uses UUID-based routing for shop context:
 * - /stores/{shopId}/dashboard - Shop dashboard
 * - /stores/{shopId}/settings - Shop settings
 * - /stores/{shopId}/products - Products management
 *
 * This replaces the old query-param pattern (?shop=domain.myshopify.com)
 * for cleaner URLs and better security (no domain exposure).
 */

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
 *
 * New UUID-based routes: /stores/{shopId}/...
 * Legacy routes kept for any direct access attempts
 */
const PROTECTED_ROUTES = [
  "/stores", // New UUID-based routing
  // Legacy routes - will redirect to /stores/{shopId}/...
  "/dashboard",
  "/settings",
  "/products",
  "/generate",
  "/create-pd",
  "/enhance",
  "/aie",
  "/ads-library",
  "/brand-voice",
  "/content-center",
  "/create-ad",
  "/business-profile",
  "/best-practices",
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
 * Extract shop UUID from path if present
 * Pattern: /stores/{uuid}/...
 */
function extractShopIdFromPath(pathname: string): string | null {
  const match = pathname.match(
    /^\/stores\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
  );
  return match ? match[1] : null;
}

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

    // For shop users accessing /stores routes, validate shop access
    if (pathname.startsWith("/stores/") && token.role === "shop") {
      const pathShopId = extractShopIdFromPath(pathname);

      // Shop users can only access their own shop
      // For shop users, token.id IS their shop UUID
      if (pathShopId && pathShopId !== token.id) {
        console.warn(
          `[Middleware] Shop access denied: user ${token.id} attempted to access shop ${pathShopId}`
        );
        // Redirect to their own shop's dashboard
        const redirectUrl = new URL(`/stores/${token.id}/dashboard`, request.url);
        return NextResponse.redirect(redirectUrl);
      }
    }

    // LEGACY ROUTE REDIRECT: Redirect old routes to new UUID-based routes
    // Only for shop users who have a shopId
    if (token.role === "shop" && token.id) {
      const legacyRoutes = [
        "/dashboard",
        "/settings",
        "/products",
        "/generate",
        "/create-pd",
        "/enhance",
        "/aie",
        "/ads-library",
        "/brand-voice",
        "/content-center",
        "/create-ad",
        "/business-profile",
        "/best-practices",
      ];
      for (const route of legacyRoutes) {
        if (pathname === route || pathname.startsWith(`${route}/`)) {
          // Extract the sub-path after the legacy route
          const subPath = pathname.replace(route, "") || "";
          const newPath = `/stores/${token.id}${route}${subPath}`;
          console.log(`[Middleware] Redirecting legacy route: ${pathname} -> ${newPath}`);
          return NextResponse.redirect(new URL(newPath, request.url));
        }
      }
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
      console.warn("[Middleware] CORS violation attempt from:", origin);
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
  // 3. Protected page routes (authentication) - both new and legacy
  // Security headers for pages are applied via next.config.ts
  // Note: /welcome is public (for Shopify install flow) - not included here
  matcher: [
    "/",
    "/api/:path*",
    "/stores/:path*", // New UUID-based routes
    // Legacy routes - will redirect to UUID-based routes for shop users
    "/dashboard/:path*",
    "/settings/:path*",
    "/products/:path*",
    "/generate/:path*",
    "/create-pd/:path*",
    "/enhance/:path*",
    "/aie/:path*",
    "/ads-library/:path*",
    "/brand-voice/:path*",
    "/content-center/:path*",
    "/create-ad/:path*",
    "/business-profile/:path*",
    "/best-practices/:path*",
    "/bhb/:path*",
  ],
};
