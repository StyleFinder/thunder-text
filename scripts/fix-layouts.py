#!/usr/bin/env python3
"""
Fix page layouts by replacing Tailwind container with inline styles pattern
Matches the create-pd page that displays correctly
"""

import re
import os

# Pages to update
PAGES = [
    'src/app/enhance/UnifiedEnhancePage.tsx',
    'src/app/help/page.tsx',
    'src/app/aie/page.tsx',
    'src/app/best-practices/page.tsx',
    'src/app/brand-voice/page.tsx',
    'src/app/content-center/page.tsx',
    'src/app/facebook-ads/page.tsx',
    'src/app/settings/page.tsx',
    'src/app/trends/page.tsx',
    'src/app/business-profile/page.tsx',
    'src/app/aie/library/page.tsx',
    'src/app/brand-voice/edit/page.tsx',
    'src/app/brand-voice/profile/page.tsx',
]

def add_import(content):
    """Add layout constants import if not present"""
    if 'layout-constants' in content:
        return content

    # Find where to insert (after 'use client' or at top)
    lines = content.split('\n')
    insert_idx = 0

    for i, line in enumerate(lines):
        if "'use client'" in line or '"use client"' in line:
            insert_idx = i + 2  # After use client and empty line
            break
        if line.startswith('import '):
            insert_idx = i
            break

    import_line = "import { PAGE_HEADER_STYLES, PAGE_SECTION_STYLES } from '@/app/styles/layout-constants'"
    lines.insert(insert_idx, import_line)

    return'\n'.join(lines)

def replace_container_wrapper(content):
    """Replace <div className="container mx-auto"> with <>"""
    # Replace opening container div
    content = re.sub(
        r'<div className="container mx-auto">',
        '<>',
        content
    )

    # Replace closing divs that were wrapping the entire page
    # This is trickier - we need to find the matching closing div
    # For now, just replace common patterns
    content = re.sub(
        r'(\s+)</div>\s*\n\s*\)\s*\n}',
        r'\1</>\n  )\n}',
        content
    )

    return content

def main():
    print("🔧 Fixing page layouts with inline styles pattern...")
    print("")

    updated = 0
    for page_path in PAGES:
        if not os.path.exists(page_path):
            print(f"⚠️  Not found: {page_path}")
            continue

        print(f"Updating: {page_path}")

        with open(page_path, 'r') as f:
            content = f.read()

        # Add import
        content = add_import(content)

        # Replace container wrapper
        content = replace_container_wrapper(content)

        with open(page_path, 'w') as f:
            f.write(content)

        print(f"  ✅ Updated")
        updated += 1

    print("")
    print(f"✅ Updated {updated} pages")
    print("")
    print("⚠️  IMPORTANT: You still need to manually add style={PAGE_SECTION_STYLES}")
    print("   to individual sections (Cards, divs) in each page to match create-pd pattern")

if __name__ == '__main__':
    main()
