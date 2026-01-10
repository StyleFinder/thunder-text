import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

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
  // @security P1 - Critical security headers per API Security Checklist
  async headers() {
    // Build comprehensive CSP directives
    const cspDirectives = [
      // Default: only allow same origin
      "default-src 'self'",
      // Scripts: self + inline (required for Next.js) + eval (development only)
      // Note: 'unsafe-inline' and 'unsafe-eval' needed for Next.js hot reload in dev
      `script-src 'self' 'unsafe-inline' ${process.env.NODE_ENV === "development" ? "'unsafe-eval'" : ""} https://cdn.sentry.io https://browser.sentry-cdn.com`,
      // Styles: self + inline (required for CSS-in-JS and Tailwind)
      "style-src 'self' 'unsafe-inline'",
      // Images: self + data URIs + HTTPS (for external images)
      "img-src 'self' data: https: blob:",
      // Fonts: self only
      "font-src 'self'",
      // Connect: API endpoints, Supabase, Sentry, external APIs
      "connect-src 'self' https://*.supabase.co https://*.sentry.io https://sentry.io wss://*.supabase.co https://api.openai.com https://api.anthropic.com https://graph.facebook.com https://*.upstash.io",
      // Frame ancestors: none (not embeddable)
      "frame-ancestors 'none'",
      // Base URI: prevent base tag hijacking
      "base-uri 'self'",
      // Form action: only submit to self
      "form-action 'self'",
      // Object/embed: block plugins
      "object-src 'none'",
      // Upgrade insecure requests in production
      ...(process.env.NODE_ENV === "production"
        ? ["upgrade-insecure-requests"]
        : []),
    ];

    return [
      {
        source: "/:path*",
        headers: [
          {
            // SECURITY: Comprehensive Content Security Policy
            // Prevents XSS, clickjacking, and data injection attacks
            key: "Content-Security-Policy",
            value: cspDirectives.filter(Boolean).join("; "),
          },
          {
            // Prevent MIME type sniffing attacks
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            // Prevent clickjacking (legacy header, CSP frame-ancestors is primary)
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            // Enable XSS filter in older browsers
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            // Control referrer information to prevent data leakage
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            // Permissions Policy: disable unnecessary browser features
            // Reduces attack surface by blocking access to sensitive APIs
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(self)",
          },
          {
            // DNS prefetch control: enable for performance
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            // Strict Transport Security: enforce HTTPS (1 year + subdomains)
            // Only applied in production to avoid issues with local dev
            key: "Strict-Transport-Security",
            value:
              process.env.NODE_ENV === "production"
                ? "max-age=31536000; includeSubDomains; preload"
                : "max-age=0",
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
          {
            // Prevent caching of API responses by default
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: "zunosai",
  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Automatically annotate React components to show their full name in breadcrumbs and session replay
  reactComponentAnnotation: {
    enabled: true,
  },

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  // Hides source maps from generated client bundles
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
  },
});
