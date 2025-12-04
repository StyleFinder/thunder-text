#!/bin/bash

# Comprehensive cleanup and dev server startup script
# Kills ALL node processes and background shells, then starts fresh

PORT=3050

echo "🧹 Comprehensive cleanup starting..."
echo ""

# Kill all node processes
echo "1️⃣  Killing all node processes..."
killall -9 node 2>/dev/null && echo "   ✅ Node processes killed" || echo "   ℹ️  No node processes found"

# Kill all Next.js dev processes specifically
echo "2️⃣  Killing Next.js dev processes..."
pkill -9 -f "next dev" 2>/dev/null && echo "   ✅ Next.js processes killed" || echo "   ℹ️  No Next.js processes found"

# Kill anything on port 3050
echo "3️⃣  Clearing port $PORT..."
lsof -ti:$PORT | xargs kill -9 2>/dev/null && echo "   ✅ Port cleared" || echo "   ℹ️  Port already free"

# Wait for cleanup
echo ""
echo "⏳ Waiting for cleanup to complete..."
sleep 3

# Verify port is free
echo ""
echo "🔍 Verifying port $PORT is free..."
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "   ❌ ERROR: Port $PORT is still in use!"
  echo ""
  echo "Processes still using port:"
  lsof -Pi :$PORT -sTCP:LISTEN
  echo ""
  echo "Please manually kill these processes and try again."
  exit 1
else
  echo "   ✅ Port $PORT is free"
fi

echo ""
echo "🚀 Starting dev server..."
echo ""

# Start dev server
cd /Users/bigdaddy/projects/thunder-text
exec next dev --turbopack --port $PORT
