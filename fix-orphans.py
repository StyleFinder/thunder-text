#!/usr/bin/env python3
"""
Fix orphaned code blocks left by sed script that removed console.log statements.
Pattern: Lines with orphaned object properties followed by });
"""

import re
import sys
from pathlib import Path

def fix_file(filepath):
    """Fix orphaned code blocks in a single file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    i = 0
    fixed_lines = []
    fixes = 0

    while i < len(lines):
        line = lines[i]

        # Check if this looks like an orphaned property line
        # Pattern: whitespace + word: something,
        if re.match(r'^\s+\w+:', line.strip()) and line.rstrip().endswith(','):
            # Look ahead to find closing });
            j = i
            block_lines = []
            found_closing = False

            while j < len(lines) and not found_closing:
                block_lines.append(lines[j])
                if lines[j].strip() in ['});', '}']:
                    found_closing = True
                j += 1
                if j - i > 50:  # Safety limit
                    break

            # Check if previous non-empty line indicates this is orphaned
            prev_idx = i - 1
            while prev_idx >= 0 and not lines[prev_idx].strip():
                prev_idx -= 1

            if prev_idx >= 0:
                prev_line = lines[prev_idx].strip()
                # If previous line doesn't end with opening brace or contain console.log, it's orphaned
                is_valid = (prev_line.endswith('{') or
                           prev_line.endswith('({') or
                           'console.log' in prev_line or
                           prev_line.endswith(': {'))

                if found_closing and not is_valid:
                    # This is orphaned - skip the entire block
                    print(f"  Fixed orphaned block at line {i+1}: {line.strip()[:50]}...")
                    fixes += 1
                    i = j
                    continue

        # Keep this line
        fixed_lines.append(line)
        i += 1

    if fixes > 0:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(fixed_lines)
        return fixes

    return 0

def main():
    # Get all TS/TSX files with errors
    error_files = [
        'src/app/api/shopify/products/[productId]/enhance/route.ts',
        'src/app/api/shopify/products/create/route.ts',
        'src/app/api/shopify/token-exchange/route.ts',
        'src/app/api/tiktok/oauth/callback/route.ts',
        'src/lib/openai.ts',
        'src/lib/shopify-auth.ts',
        'src/lib/shopify/get-access-token.ts',
        'src/lib/shopify/get-products.ts',
        'src/lib/shopify/product-enhancement.ts',
        'src/lib/shopify/product-prepopulation.ts',
        'src/lib/shopifyImageUploader.ts',
    ]

    total_fixes = 0
    for file_path in error_files:
        full_path = Path(file_path)
        if full_path.exists():
            print(f"Checking {file_path}...")
            fixes = fix_file(full_path)
            total_fixes += fixes
        else:
            print(f"  File not found: {file_path}")

    print(f"\nTotal orphaned blocks fixed: {total_fixes}")

if __name__ == '__main__':
    main()
