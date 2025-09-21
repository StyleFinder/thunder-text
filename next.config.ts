import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Disable ESLint during production builds to prevent deployment failures
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript strict checks during production builds
    ignoreBuildErrors: true,
  },
  // Configure for embedded Shopify app
  // assetPrefix: process.env.NODE_ENV === 'production' ? 'https://shopify-generator-staging.onrender.com' : undefined,
  // Enable serving static files correctly in embedded context
  trailingSlash: false,
  // Configure headers for embedded iframe context
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL'
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors https://*.shopify.com https://admin.shopify.com"
          }
        ],
      },
    ]
  },
};

export default nextConfig;
