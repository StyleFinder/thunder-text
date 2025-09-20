#!/bin/bash

echo "🔍 DAILY DEV SERVER CHECK"
echo "========================="

echo ""
echo "1️⃣ Checking for Shopify processes..."
SHOPIFY_PROCS=$(ps aux | grep "shopify app dev" | grep -v grep | wc -l)
if [ $SHOPIFY_PROCS -gt 0 ]; then
    echo "⚠️  Found $SHOPIFY_PROCS Shopify dev server(s) running:"
    ps aux | grep "shopify app dev" | grep -v grep | awk '{print "   PID: " $2 " | Started: " $9 " | Command: " $11 " " $12 " " $13}'
    echo ""
    echo "💡 To kill these: kill <PID> or run ./kill-all-shopify.sh"
else
    echo "✅ No Shopify dev servers running"
fi

echo ""
echo "2️⃣ Checking common dev ports..."
for port in 3000 3050 5173 8000 8080; do
    if lsof -i :$port > /dev/null 2>&1; then
        echo "🔴 Port $port is BUSY:"
        lsof -i :$port | tail -n +2 | awk '{print "   " $1 " (PID: " $2 ")"}'
    else
        echo "✅ Port $port is FREE"
    fi
done

echo ""
echo "3️⃣ Node processes summary..."
NODE_COUNT=$(ps aux | grep node | grep -v grep | wc -l)
echo "📊 Total Node processes: $NODE_COUNT"

if [ $SHOPIFY_PROCS -gt 0 ]; then
    echo ""
    echo "🚨 RECOMMENDATION: Kill existing Shopify servers before starting new ones"
    echo "   Command: ./kill-all-shopify.sh"
else
    echo ""
    echo "🟢 ALL CLEAR: Safe to start new dev servers"
fi