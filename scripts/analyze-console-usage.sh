#!/bin/bash
# Analyze console.* usage across the codebase
# Usage: ./scripts/analyze-console-usage.sh

echo "=== Console Usage Analysis ==="
echo ""

echo "📊 Console Statement Breakdown:"
echo "-------------------------------"
echo "console.log:"
grep -r "console\.log" src/ --include="*.ts" --include="*.tsx" | wc -l | xargs echo "  "
echo "console.error:"
grep -r "console\.error" src/ --include="*.ts" --include="*.tsx" | wc -l | xargs echo "  "
echo "console.warn:"
grep -r "console\.warn" src/ --include="*.ts" --include="*.tsx" | wc -l | xargs echo "  "
echo "console.debug:"
grep -r "console\.debug" src/ --include="*.ts" --include="*.tsx" | wc -l | xargs echo "  "
echo ""

echo "📁 Top 10 Files with Console Statements:"
echo "----------------------------------------"
grep -r "console\." src/ --include="*.ts" --include="*.tsx" -l | \
  xargs -I {} sh -c 'echo "$(grep -c "console\." {}) {}"' | \
  sort -rn | head -10
echo ""

echo "🔍 Console Usage by Directory:"
echo "------------------------------"
for dir in src/lib src/app/api src/app src/components; do
  if [ -d "$dir" ]; then
    count=$(grep -r "console\." "$dir" --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)
    echo "  $dir: $count"
  fi
done
echo ""

echo "⚠️  Files that should use logger instead:"
echo "-----------------------------------------"
grep -r "console\.error\|console\.warn" src/lib --include="*.ts" -l | head -10
