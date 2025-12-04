#!/bin/bash

# Fix orphaned code from sed log removal
echo "Fixing orphaned JSON.stringify parameters..."

# Pattern 1: Orphaned }, null, 2))
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i.bak2 \
  -e '/^\s*}, null, 2))$/d' {} \;

# Pattern 2: Orphaned object properties (key: value) followed by });
# This is trickier - need to remove lines that look like orphaned properties
# We'll look for standalone properties that end with });

echo "Checking for remaining syntax errors..."
npm run type-check 2>&1 | head -20

echo "Cleanup backup files..."
find src -name "*.bak2" -delete

echo "Done. Check git diff to review changes."
