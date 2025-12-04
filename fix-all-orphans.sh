#!/bin/bash
# Find and remove all orphaned console.log object blocks
# Pattern: Lines starting with whitespace + property: value, followed eventually by })

find src -name "*.ts" -o -name "*.tsx" | while read file; do
  # Create backup
  cp "$file" "$file.bak"

  # Use awk to remove orphaned blocks
  awk '
  BEGIN { in_orphan = 0; orphan_start = 0 }
  {
    # Check if line looks like orphaned property (whitespace + word: value,)
    if ($0 ~ /^[[:space:]]+[a-zA-Z_][a-zA-Z0-9_]*:[[:space:]]/ && $0 ~ /,/ *$/) {
      # Check if previous line might indicate orphan
      if (prev_line !~ /\{[[:space:]]*$/ && prev_line !~ /console\.log/ && prev_line !~ /:[[:space:]]*\{[[:space:]]*$/) {
        in_orphan = 1
        orphan_start = NR
        orphan_lines[NR] = $0
        next
      }
    }

    # If in orphan block, keep collecting lines
    if (in_orphan) {
      orphan_lines[NR] = $0
      # Check for closing })
      if ($0 ~ /^[[:space:]]*\}\)/ || $0 ~ /^[[:space:]]*\}[[:space:]]*$/) {
        # End of orphan block - skip all orphan lines
        delete orphan_lines
        in_orphan = 0
        next
      }
    } else {
      print $0
    }

    prev_line = $0
  }
  ' "$file" > "$file.tmp"

  # Check if file changed
  if ! diff -q "$file" "$file.tmp" > /dev/null 2>&1; then
    mv "$file.tmp" "$file"
    echo "Fixed: $file"
  else
    rm "$file.tmp"
  fi

  rm "$file.bak"
done
