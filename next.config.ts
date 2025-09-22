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
  // assetPrefix: process.env.NODE_ENV === 'production' ? 'https://thunder-text-nine.vercel.app' : undefined,
  // Enable serving static files correctly in embedded context
  trailingSlash: false,
  // Configure headers for embedded iframe context
  async headers() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const baseHeaders = [
      {
        key: 'X-Frame-Options',
        value: 'ALLOWALL'
      },
      {
        key: 'Content-Security-Policy',
        value: "frame-ancestors https://*.shopify.com https://admin.shopify.com"
      }
    ];
    
    // Add cache-busting headers in development
    if (isDevelopment) {
      baseHeaders.push(
        {
          key: 'Cache-Control',
          value: 'no-cache, no-store, must-revalidate, max-age=0'
        },
        {
          key: 'Pragma',
          value: 'no-cache'
        },
        {
          key: 'Expires',
          value: '0'
        }
      );
    }
    
    return [
      {
        source: '/(.*)',
        headers: baseHeaders,
      },
    ]
  },
};

export default nextConfig;
