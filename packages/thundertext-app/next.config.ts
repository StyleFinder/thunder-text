import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Transpile shared packages
  transpilePackages: ['@thunder-text/shared-backend', '@thunder-text/shared-ui'],

  // Environment variables
  env: {
    APP_NAME: 'thundertext',
    APP_TITLE: 'ThunderText',
    APP_DESCRIPTION: 'AI-Powered Product Description Generator',
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
    ],
  },

  // Experimental features
  experimental: {
    optimizePackageImports: ['@shopify/polaris', 'lucide-react'],
  },
}

export default nextConfig
