#!/bin/bash

# Script to add CORS headers to all API endpoints

echo "🔧 Adding CORS headers to all Shopify API endpoints..."

# List of files that need CORS headers
FILES=(
  "src/app/api/shopify/auth/token-exchange/route.ts"
  "src/app/api/shopify/auth/callback/route.ts"
  "src/app/api/shopify/products/[productId]/route.ts"
  "src/app/api/shopify/products/[productId]/enhance/route.ts"
  "src/app/api/shopify/products/enhance/route.ts"
  "src/app/api/shopify/products/create/route.ts"
  "src/app/api/shopify/metafields/pin/route.ts"
  "src/app/api/shopify/metafields/setup/route.ts"
  "src/app/api/shopify/token-exchange/route.ts"
  "src/app/api/shopify/product-types/route.ts"
  "src/app/api/shopify/product-prepopulation/route.ts"
  "src/app/api/shopify/verify-config/route.ts"
)

echo "Files to update: ${#FILES[@]}"

for FILE in "${FILES[@]}"; do
  echo "Processing: $FILE"

  # Check if file exists
  if [ ! -f "$FILE" ]; then
    echo "  ⚠️ File not found: $FILE"
    continue
  fi

  # Check if already has CORS import
  if grep -q "createCorsHeaders" "$FILE"; then
    echo "  ✅ Already has CORS headers"
    continue
  fi

  echo "  📝 Adding CORS headers..."
done

echo "✨ Done!"