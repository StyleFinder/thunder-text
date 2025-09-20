#!/bin/bash

# Thunder Text Development Server Startup Script
# Usage: ./start-dev.sh

echo "🚀 Starting Thunder Text Development Servers..."

# Navigate to project directory
cd "$(dirname "$0")"

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Port $1 is already in use"
        return 0
    else
        echo "✅ Port $1 is available"
        return 1
    fi
}

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "shopify app dev" 2>/dev/null || true
sleep 2

# Start main application server
echo "📱 Starting main Thunder Text application server..."
if check_port 3050; then
    echo "Killing processes on port 3050..."
    pkill -f "node.*3050" 2>/dev/null || true
    sleep 2
fi

npm run dev &
MAIN_PID=$!

# Wait for main server to start
echo "⏳ Waiting for main server to start..."
for i in {1..30}; do
    if curl -s http://localhost:3050 >/dev/null 2>&1; then
        echo "✅ Main server started successfully on http://localhost:3050"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Main server failed to start after 30 seconds"
        exit 1
    fi
    sleep 1
done

# Start Shopify extension development server
echo "🛍️  Starting Shopify extension development server..."
shopify app dev &
SHOPIFY_PID=$!

echo ""
echo "🎉 Development servers started!"
echo "📱 Main app: http://localhost:3050/?shop=zunosai-staging-test-store&authenticated=true"
echo "🛍️  Extensions: Check Shopify admin → Product → More actions → Thunder Text AI"
echo ""
echo "💡 To stop servers:"
echo "   Press Ctrl+C or run: pkill -f 'npm run dev' && pkill -f 'shopify app dev'"
echo ""
echo "📊 Process IDs:"
echo "   Main server: $MAIN_PID"
echo "   Shopify dev: $SHOPIFY_PID"

# Keep script running to show logs
wait