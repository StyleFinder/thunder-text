#!/bin/bash

echo "🔍 Thunder Text - Server Status Check"
echo "====================================="

# Check for Shopify dev processes
SHOPIFY_PROCESSES=$(ps aux | grep -E "shopify.*dev" | grep -v grep | wc -l)
if [ $SHOPIFY_PROCESSES -gt 0 ]; then
    echo "✅ Shopify dev server: RUNNING ($SHOPIFY_PROCESSES processes)"
    ps aux | grep -E "shopify.*dev" | grep -v grep | head -3
else
    echo "❌ Shopify dev server: NOT RUNNING"
fi

echo ""

# Check for processes on common ports
PORTS="3050 3000 5173 8000"
for PORT in $PORTS; do
    PID=$(lsof -ti:$PORT 2>/dev/null)
    if [ ! -z "$PID" ]; then
        PROCESS=$(ps -p $PID -o comm= 2>/dev/null)
        echo "🟡 Port $PORT: OCCUPIED by $PROCESS (PID: $PID)"
    else
        echo "🟢 Port $PORT: FREE"
    fi
done

echo ""
echo "💡 Server Management:"
echo "   • If you see multiple Shopify processes, run: ./restart-dev.sh"
echo "   • If ports are occupied unexpectedly, check what's using them"
echo "   • For clean start: kill conflicting processes first"