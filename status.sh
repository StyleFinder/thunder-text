#!/bin/bash

# Quick server status check for Claude
# Returns: 0 = safe to start servers, 1 = conflicts detected

SHOPIFY_PROCESSES=$(ps aux | grep -E "shopify.*dev" | grep -v grep | wc -l)

if [ $SHOPIFY_PROCESSES -gt 0 ]; then
    echo "⚠️ CONFLICT: Shopify dev server already running ($SHOPIFY_PROCESSES processes)"
    echo "   → User terminal detected - DO NOT start additional servers"
    exit 1
fi

# Check critical ports
OCCUPIED_PORTS=""
for PORT in 3050 3000 5173; do
    if lsof -ti:$PORT >/dev/null 2>&1; then
        OCCUPIED_PORTS="$OCCUPIED_PORTS $PORT"
    fi
done

if [ ! -z "$OCCUPIED_PORTS" ]; then
    echo "⚠️ PORTS OCCUPIED:$OCCUPIED_PORTS"
    echo "   → Check what's using these ports before starting servers"
    exit 1
fi

echo "✅ SAFE: No server conflicts detected"
echo "   → OK to start development servers"
exit 0