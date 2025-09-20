#!/bin/bash

echo "🔄 Thunder Text - Quick Dev Restart"
echo "=================================="

# Kill existing processes
echo "⏹️  Stopping servers..."
pkill -f "shopify app dev" 2>/dev/null
pkill -f "npm.*dev" 2>/dev/null

# Quick cache clear (only essential)
echo "🧹 Clearing essential caches..."
rm -rf extensions/*/build extensions/*/dist 2>/dev/null

# Wait a moment
sleep 2

# Start Shopify dev server
echo "🚀 Starting Shopify dev server..."
shopify app dev

echo "✅ Restart complete!"
echo "🌐 Go to: https://admin.shopify.com/store/zunosai-staging-test-store/products/15178869342368"
echo "🔄 In browser: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)"