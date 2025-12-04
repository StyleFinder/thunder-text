#!/bin/bash

echo "🧹 Comprehensive Debug Log Removal"
echo "Removing all debugging console.log statements..."

# Backup before cleanup
echo "Creating backup..."
mkdir -p backups/pre-comprehensive-cleanup
cp -r src backups/pre-comprehensive-cleanup/

# Pattern 1: Logs with component/module prefixes like [BrandVoice], [BusinessProfile], etc.
echo "Removing component-prefixed logs..."
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i.bak3 \
  -e '/console\.log.*\[.*\].*:/d' {} \;

# Pattern 2: Logs with emojis (status markers)
echo "Removing emoji status logs..."
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i.bak3 \
  -e '/console\.log.*[🔍🚀📝✅🔄🎯🎉📡📦🏁🔧🔑📥ℹ️⚠️]/d' {} \;

# Pattern 3: Logs with "Detected", "Starting", "Fetching", "Loading", "Creating", "Received"
echo "Removing action verb logs..."
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i.bak3 \
  -e '/console\.log.*\(Detected\|Starting\|Fetching\|Loading\|Creating\|Received\|Processing\|Generated\|Saving\)/d' {} \;

# Pattern 4: Logs with JSON.stringify (verbose data dumps)
echo "Removing JSON.stringify verbose logs..."
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i.bak3 \
  -e '/console\.log.*JSON\.stringify/d' {} \;

# Pattern 5: Logs with response, data, result objects being logged
echo "Removing data dump logs..."
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i.bak3 \
  -e '/console\.log.*\(response\|Response\|data\|Data\|result\|Result\).*:/d' {} \;

# Pattern 6: Test/Debug context logs
echo "Removing test/debug context logs..."
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i.bak3 \
  -e '/console\.log.*\(Test\|DEBUG\|test\|debug\)/d' {} \;

# Pattern 7: Status/workflow logs
echo "Removing workflow status logs..."
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i.bak3 \
  -e '/console\.log.*\(successful\|successfully\|completed\|initialized\|Initialized\)/d' {} \;

# Pattern 8: Parameter/variable inspection logs
echo "Removing variable inspection logs..."
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i.bak3 \
  -e '/console\.log.*[^A-Za-z]\(shop\|Shop\|params\|Params\|config\|Config\).*:/d' {} \;

echo ""
echo "Cleanup complete!"
echo "Checking for orphaned code..."

# Count remaining console.log
REMAINING=$(grep -r "console\.log" src --include="*.ts" --include="*.tsx" | wc -l)
echo "Remaining console.log statements: $REMAINING"

# Clean up backup files
echo "Cleaning backup files..."
find src -name "*.bak3" -delete

echo ""
echo "✅ Done! Review changes with: git diff"
echo "⚠️  Run: npm run type-check to check for orphaned code"
