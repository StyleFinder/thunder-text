#!/bin/bash

# Script to fix page layouts by replacing Tailwind container with inline styles

cd /Users/bigdaddy/projects/thunder-text

echo "🔧 Fixing page layouts with inline styles pattern..."
echo ""

# List of pages to update
PAGES=(
  "src/app/help/page.tsx"
  "src/app/aie/page.tsx"
  "src/app/best-practices/page.tsx"
  "src/app/brand-voice/page.tsx"
  "src/app/content-center/page.tsx"
  "src/app/facebook-ads/page.tsx"
  "src/app/settings/page.tsx"
  "src/app/trends/page.tsx"
  "src/app/business-profile/page.tsx"
)

for file in "${PAGES[@]}"; do
  if [ -f "$file" ]; then
    echo "Updating: $file"

    # Add import at top of file (after 'use client' if it exists)
    if ! grep -q "layout-constants" "$file"; then
      if grep -q "'use client'" "$file"; then
        sed -i '' "/'use client'/a\\
import { PAGE_HEADER_STYLES, PAGE_SECTION_STYLES } from '@/app/styles/layout-constants'\\
" "$file"
      else
        sed -i '' "1i\\
import { PAGE_HEADER_STYLES, PAGE_SECTION_STYLES } from '@/app/styles/layout-constants'\\
" "$file"
      fi
    fi

    # Replace container mx-auto with fragment
    sed -i '' 's/<div className="container mx-auto">/<>/g' "$file"
    sed -i '' 's/<\/div>  \/\/ Close container/<\/> \/\/ Close fragment/g' "$file"

    echo "  ✅ Updated $file"
  else
    echo "  ⚠️  Not found: $file"
  fi
done

echo ""
echo "✅ Layout fixes applied to simple pages"
echo "⚠️  Note: enhance/UnifiedEnhancePage.tsx and aie/library/page.tsx need manual updates due to complexity"
