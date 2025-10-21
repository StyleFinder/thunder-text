import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // SECURITY: Enable type checking and linting in production builds
  // All TypeScript and ESLint errors must be fixed before deployment
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Ensure environment variables are available
  env: {
    SHOPIFY_ACCESS_TOKEN: process.env.SHOPIFY_ACCESS_TOKEN || '',
    SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY || '',
    SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET || '',
  },
  // Configure for embedded Shopify app
  // assetPrefix: process.env.NODE_ENV === 'production' ? 'https://thunder-text-nine.vercel.app' : undefined,
  // Enable serving static files correctly in embedded context
  trailingSlash: false,
  // Configure headers for embedded iframe context
  // Remove X-Frame-Options completely, rely only on CSP frame-ancestors
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors * 'self' https://*.myshopify.com https://admin.shopify.com https://*.spin.dev"
          }
        ],
      },
    ]
  },
};

export default nextConfig;
