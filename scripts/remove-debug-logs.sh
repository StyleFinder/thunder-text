#!/bin/bash

# Backup files first
echo "Creating backup directory..."
mkdir -p backups/pre-log-cleanup
cp -r src backups/pre-log-cleanup/

# Count logs before
echo "Console logs before cleanup:"
grep -r "console\." src --include="*.ts" --include="*.tsx" | wc -l

# Remove DEBUG logs
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i.bak \
  -e '/console\.log.*DEBUG/d' \
  -e '/console\.log.*🔍/d' {} \;

# Remove Step logs  
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i.bak \
  -e '/console\.log.*Step [0-9]/d' \
  -e '/console\.log.*📤 Step/d' \
  -e '/console\.log.*✅ Step/d' {} \;

# Remove success emoji logs
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i.bak \
  -e '/console\.log.*✅.*successfully/d' \
  -e '/console\.log.*✅.*complete/d' \
  -e '/console\.log.*🔄/d' \
  -e '/console\.log.*📝/d' \
  -e '/console\.log.*🎯/d' \
  -e '/console\.log.*🎉/d' \
  -e '/console\.log.*🧵/d' {} \;

# Remove JSON.stringify logs (verbose data dumps)
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i.bak \
  -e '/console\.log.*JSON\.stringify/d' {} \;

# Clean up .bak files
find src -name "*.bak" -delete

# Count logs after
echo "Console logs after cleanup:"
grep -r "console\." src --include="*.ts" --include="*.tsx" | wc -l

echo "Backup saved to backups/pre-log-cleanup/"
echo "Review changes with: git diff src/"
