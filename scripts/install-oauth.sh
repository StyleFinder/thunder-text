#!/bin/bash

# OAuth Installation Script for Thunder Text
# This script helps you install the app via OAuth
#
# SECURITY NOTE: API credentials should NEVER be stored in this script.
# Use environment variables or a secrets manager instead.

echo "Thunder Text OAuth Installation"
echo "=================================="
echo ""

SHOP="zunosai-staging-test-store"
APP_URL="https://thunder-text-nine.vercel.app"

echo "Prerequisites:"
echo "1. Update Vercel environment variables:"
echo "   SHOPIFY_API_KEY=<your-api-key-from-shopify-partners>"
echo "   SHOPIFY_API_SECRET=<your-api-secret-from-shopify-partners>"
echo "   SHOPIFY_APP_URL=$APP_URL"
echo ""
echo "2. Make sure you've redeployed after updating variables"
echo ""
echo "Press Enter to continue..."
read

echo "Starting OAuth flow for shop: $SHOP"
echo ""

# Build the OAuth URL
OAUTH_URL="$APP_URL/api/auth?shop=$SHOP"

echo "OAuth URL: $OAUTH_URL"
echo ""
echo "Opening browser to complete OAuth installation..."
echo ""

# Open the OAuth URL in the default browser
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open "$OAUTH_URL"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    xdg-open "$OAUTH_URL"
else
    echo "Please open this URL in your browser:"
    echo "$OAUTH_URL"
fi

echo ""
echo "After approving the app in Shopify:"
echo "   1. You'll be redirected to the app"
echo "   2. Token will be stored in Supabase"
echo "   3. You can delete the custom app from Shopify admin"
echo ""
echo "To test if OAuth worked:"
echo "   curl $APP_URL/api/debug/token-status?shop=$SHOP"
echo ""
echo "Once OAuth is complete, you can:"
echo "   - Remove SHOPIFY_ACCESS_TOKEN from Vercel"
echo "   - Remove NEXT_PUBLIC_SHOPIFY_TOKEN_B64 from Vercel"
echo "   - Delete the custom app from Shopify admin"
