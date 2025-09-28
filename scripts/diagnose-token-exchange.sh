#!/bin/bash

# Thunder Text Token Exchange Diagnostic Script
# This script helps diagnose why Token Exchange is failing

echo "=========================================="
echo "Thunder Text Token Exchange Diagnostics"
echo "=========================================="
echo ""

# Check environment variables
echo "📋 STEP 1: Checking Environment Variables"
echo "------------------------------------------"

if [ -f .env.local ]; then
    source .env.local
    echo "✅ .env.local file found"
else
    echo "❌ .env.local file not found"
    exit 1
fi

echo ""
echo "API Key Configuration:"
if [ -n "$NEXT_PUBLIC_SHOPIFY_API_KEY" ]; then
    echo "  ✅ NEXT_PUBLIC_SHOPIFY_API_KEY is set"
    echo "  📏 Length: ${#NEXT_PUBLIC_SHOPIFY_API_KEY} characters"
    echo "  🔍 Value: $NEXT_PUBLIC_SHOPIFY_API_KEY"

    if [ ${#NEXT_PUBLIC_SHOPIFY_API_KEY} -eq 32 ]; then
        echo "  ✅ Valid API Key length (32 characters)"
    else
        echo "  ❌ Invalid API Key length (expected 32 characters)"
    fi
else
    echo "  ❌ NEXT_PUBLIC_SHOPIFY_API_KEY is not set"
fi

echo ""
echo "API Secret Configuration:"
if [ -n "$SHOPIFY_API_SECRET" ]; then
    echo "  ✅ SHOPIFY_API_SECRET is set"
    echo "  📏 Length: ${#SHOPIFY_API_SECRET} characters"
    echo "  🔍 Preview: ${SHOPIFY_API_SECRET:0:8}..."

    if [ ${#SHOPIFY_API_SECRET} -eq 64 ]; then
        echo "  ✅ Valid modern Client Secret length (64 characters)"
    elif [ ${#SHOPIFY_API_SECRET} -eq 32 ]; then
        echo "  ⚠️  32 characters - This could be:"
        echo "      1. A legacy format Client Secret (older apps)"
        echo "      2. Only half of the actual secret was copied"
        echo "      3. The API Key was accidentally copied instead"

        if [ "$SHOPIFY_API_SECRET" = "$NEXT_PUBLIC_SHOPIFY_API_KEY" ]; then
            echo "  ❌ CRITICAL: API Secret matches API Key! You copied the API Key twice."
        fi
    else
        echo "  ❌ Invalid Client Secret length (expected 64 or 32 characters)"
    fi
else
    echo "  ❌ SHOPIFY_API_SECRET is not set"
fi

echo ""
echo "=========================================="
echo "📋 STEP 2: Testing Debug Endpoints"
echo "------------------------------------------"

# Test environment check endpoint
echo ""
echo "Testing /api/debug/env-check:"
curl -s "http://localhost:3000/api/debug/env-check" | jq '.' 2>/dev/null || echo "❌ Failed to reach endpoint"

# Test credential verification endpoint
echo ""
echo "Testing /api/debug/verify-credentials:"
curl -s "http://localhost:3000/api/debug/verify-credentials" | jq '.' 2>/dev/null || echo "❌ Failed to reach endpoint"

echo ""
echo "=========================================="
echo "🔧 STEP 3: Recommendations"
echo "------------------------------------------"

if [ ${#SHOPIFY_API_SECRET} -eq 32 ]; then
    echo ""
    echo "⚠️  ACTION REQUIRED: Your Client Secret appears to be incomplete or wrong"
    echo ""
    echo "Please follow these steps:"
    echo "1. Log in to Shopify Partners Dashboard"
    echo "2. Go to Apps > Thunder Text > Settings"
    echo "3. Find the 'Client credentials' section"
    echo "4. Click 'Reveal' next to the Client Secret"
    echo "5. Copy the ENTIRE Client Secret (should be 64 characters)"
    echo "6. Update SHOPIFY_API_SECRET in:"
    echo "   - Local: .env.local file"
    echo "   - Production: Vercel Dashboard > Project Settings > Environment Variables"
    echo ""
    echo "The Client Secret should look like:"
    echo "64 hexadecimal characters, e.g.:"
    echo "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"
    echo ""
    echo "NOT like:"
    echo "- The API Key (32 characters)"
    echo "- A base64 string (contains +, /, or = characters)"
    echo "- The access token (starts with 'shpat_')"
fi

echo ""
echo "=========================================="
echo "📊 Summary"
echo "------------------------------------------"

ISSUES_FOUND=0

if [ ${#NEXT_PUBLIC_SHOPIFY_API_KEY} -ne 32 ]; then
    echo "❌ API Key length issue"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

if [ ${#SHOPIFY_API_SECRET} -ne 64 ] && [ ${#SHOPIFY_API_SECRET} -ne 32 ]; then
    echo "❌ Client Secret length issue"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
elif [ ${#SHOPIFY_API_SECRET} -eq 32 ]; then
    echo "⚠️  Client Secret might be incomplete or legacy format"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

if [ "$SHOPIFY_API_SECRET" = "$NEXT_PUBLIC_SHOPIFY_API_KEY" ]; then
    echo "❌ API Secret and API Key are identical"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

if [ $ISSUES_FOUND -eq 0 ]; then
    echo "✅ Credentials appear to be configured correctly"
    echo "   If Token Exchange still fails, check:"
    echo "   - App installation status in Partners Dashboard"
    echo "   - Network connectivity to Shopify"
    echo "   - Session token validity (60-second expiry)"
else
    echo ""
    echo "Found $ISSUES_FOUND issue(s) with credentials"
    echo "Please review the recommendations above"
fi

echo ""
echo "=========================================="