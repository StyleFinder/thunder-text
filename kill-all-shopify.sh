#!/bin/bash

echo "🛑 KILLING ALL SHOPIFY DEV SERVERS"
echo "=================================="

# Find all Shopify dev processes
PIDS=$(ps aux | grep "shopify app dev" | grep -v grep | awk '{print $2}')

if [ -z "$PIDS" ]; then
    echo "✅ No Shopify dev servers found running"
    exit 0
fi

echo "Found Shopify processes:"
ps aux | grep "shopify app dev" | grep -v grep | awk '{print "   PID: " $2 " | Started: " $9}'

echo ""
echo "🔥 Killing processes..."
for pid in $PIDS; do
    echo "   Killing PID: $pid"
    kill $pid 2>/dev/null
    sleep 1
    
    # Force kill if still running
    if kill -0 $pid 2>/dev/null; then
        echo "   Force killing PID: $pid"
        kill -9 $pid 2>/dev/null
    fi
done

echo ""
echo "✅ All Shopify dev servers terminated"
echo "💡 You can now safely start a new dev server"