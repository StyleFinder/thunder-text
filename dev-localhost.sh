#!/bin/bash

# Thunder Text - Localhost Development Startup Script
# Usage: ./dev-localhost.sh

set -e

echo "🚀 Thunder Text - Localhost Development Setup"
echo "=============================================="
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ ERROR: .env.local file not found!"
    echo "   Please create .env.local with required environment variables"
    exit 1
fi

echo "✅ Found .env.local configuration"
echo ""

# Check current URLs in .env.local
SHOPIFY_APP_URL=$(grep "^SHOPIFY_APP_URL=" .env.local | cut -d '=' -f2)
NEXTAUTH_URL=$(grep "^NEXTAUTH_URL=" .env.local | cut -d '=' -f2)

echo "📋 Current Configuration:"
echo "   SHOPIFY_APP_URL: $SHOPIFY_APP_URL"
echo "   NEXTAUTH_URL: $NEXTAUTH_URL"
echo ""

# Determine if using ngrok
if [[ $SHOPIFY_APP_URL == https://*.ngrok.io* ]]; then
    echo "🌐 ngrok mode detected"
    echo "   Make sure to:"
    echo "   1. Start ngrok in another terminal: npm run dev:ngrok"
    echo "   2. Update Shopify Partner Dashboard with ngrok URL"
    echo ""

    read -p "   Press Enter when ngrok is ready..."
    echo ""
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install --legacy-peer-deps
    echo ""
fi

# Clear Next.js cache for fresh start
echo "🧹 Clearing Next.js cache..."
rm -rf .next
echo ""

# Show available URLs
echo "🌍 Development URLs:"
if [[ $SHOPIFY_APP_URL == http://localhost* ]]; then
    echo "   • http://localhost:3050?shop=zunosai-staging-test-store&authenticated=true"
    echo "   • http://localhost:3050/dashboard?shop=zunosai-staging-test-store&authenticated=true"
    echo "   • http://localhost:3050/settings?shop=zunosai-staging-test-store&authenticated=true"
    echo "   • http://localhost:3050/create?shop=zunosai-staging-test-store&authenticated=true"
else
    echo "   • ${SHOPIFY_APP_URL}?shop=zunosai-staging-test-store&authenticated=true"
    echo "   • ${SHOPIFY_APP_URL}/dashboard?shop=zunosai-staging-test-store&authenticated=true"
    echo "   • ${SHOPIFY_APP_URL}/settings?shop=zunosai-staging-test-store&authenticated=true"
fi
echo ""

echo "🚀 Starting Next.js development server on port 3050..."
echo "   Press Ctrl+C to stop"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start the development server
npm run dev
