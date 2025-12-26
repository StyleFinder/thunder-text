import type { NextConfig } from "next";

/**
 * Current API Version
 * Used for X-API-Version response header and documentation
 */
const API_VERSION = "1";

const nextConfig: NextConfig = {
  // ESLint is run separately in CI/CD pipeline and pre-commit hooks.
  // Ignoring during builds prevents false positives (e.g., security/detect-object-injection)
  // from blocking production deployments. TypeScript errors are still caught.
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Ensure environment variables are available
  env: {
    SHOPIFY_ACCESS_TOKEN: process.env.SHOPIFY_ACCESS_TOKEN || "",
    SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY || "",
    SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET || "",
    API_VERSION: API_VERSION,
  },
  trailingSlash: false,

  // API Versioning: Support both /api/v1/... and legacy /api/... routes
  // Rewrites allow /api/v1/* to map to existing /api/* routes
  // This enables gradual migration to versioned APIs
  async rewrites() {
    const isProduction = process.env.NODE_ENV === "production";

    const baseRewrites = [
      // Version 1 API routes - rewrite to existing routes
      // Example: /api/v1/content-center/generate -> /api/content-center/generate
      {
        source: "/api/v1/:path*",
        destination: "/api/:path*",
      },
    ];

    // SECURITY: In production, block any debug routes that might slip through
    // The build script should remove these, but this is a fallback safety net
    if (isProduction) {
      return {
        beforeFiles: [
          // Block all debug routes - return 404 via a non-existent path
          {
            source: "/api/debug/:path*",
            destination: "/api/__blocked_debug_route__",
          },
        ],
        afterFiles: baseRewrites,
        fallback: [],
      };
    }

    return baseRewrites;
  },

  // Security headers for non-embedded external Shopify app
  // ThunderText runs on its own domain (not embedded in Shopify Admin iframe)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            // SECURITY: Prevent clickjacking - this app is NOT embedded in iframes
            // See shopify.app.toml: embedded = false
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'",
          },
          {
            // Prevent MIME type sniffing
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            // Prevent clickjacking (legacy header, CSP is primary)
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            // Enable XSS filter in older browsers
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            // Control referrer information
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
      // API versioning header for all API routes
      {
        source: "/api/:path*",
        headers: [
          {
            // API Version header for client version detection
            key: "X-API-Version",
            value: API_VERSION,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
