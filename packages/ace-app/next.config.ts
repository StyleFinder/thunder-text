import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Transpile shared packages
  transpilePackages: ['@thunder-text/shared-backend', '@thunder-text/shared-ui'],

  // Environment variables
  env: {
    APP_NAME: 'ace',
    APP_TITLE: 'ACE',
    APP_DESCRIPTION: 'Ad Copy Engine - AI-Powered Facebook Ad Generator',
  },

  // Webpack configuration
  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      bufferutil: 'commonjs bufferutil',
    })
    return config
  },

  // Image configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.myshopify.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
      },
      {
        protocol: 'https',
        hostname: 'graph.facebook.com',
      },
    ],
  },

  // Experimental features
  experimental: {
    optimizePackageImports: ['@shopify/polaris', 'lucide-react', 'recharts'],
  },
}

export default nextConfig
