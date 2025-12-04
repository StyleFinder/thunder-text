#!/usr/bin/env python3
"""
Fix page layouts by replacing Tailwind container with inline styles pattern
Matches the create-pd page that displays correctly

SECURITY NOTES:
- Uses whitelisted file paths only (no user input)
- Validates paths stay within project directory
- Uses secure file permissions (0o644 for read/write by owner, read by others)
"""

import re
import os
import stat

# Pages to update (SECURITY: whitelist of allowed files)
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

# SECURITY: Secure file permissions (owner read/write, group/others read)
SECURE_FILE_PERMISSIONS = stat.S_IRUSR | stat.S_IWUSR | stat.S_IRGRP | stat.S_IROTH  # 0o644


def safe_resolve_path(base_dir: str, relative_path: str) -> str | None:
    """
    SECURITY: Safely resolve a file path and validate it stays within the base directory.
    Prevents path traversal attacks (e.g., ../../../etc/passwd)

    Args:
        base_dir: The base directory that resolved paths must stay within
        relative_path: The relative path to resolve (from whitelist only)

    Returns:
        Resolved absolute path if safe, None if path traversal detected
    """
    # Normalize and resolve both paths to absolute form
    normalized_base = os.path.normpath(os.path.abspath(base_dir))
    resolved_path = os.path.normpath(os.path.abspath(os.path.join(base_dir, relative_path)))

    # SECURITY: Verify the resolved path starts with the base directory
    # This prevents path traversal attacks
    if not resolved_path.startswith(normalized_base + os.sep) and resolved_path != normalized_base:
        print(f"SECURITY: Path traversal attempt detected: {relative_path}")
        return None

    return resolved_path


def secure_write_file(file_path: str, content: str) -> bool:
    """
    SECURITY: Write file with secure permissions.
    Uses os.open with explicit permissions instead of open().

    Args:
        file_path: Path to write to (must be validated first)
        content: Content to write

    Returns:
        True if successful, False otherwise
    """
    try:
        # SECURITY: Open file with explicit permissions (0o644)
        # This prevents world-writable files
        fd = os.open(file_path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, SECURE_FILE_PERMISSIONS)
        try:
            with os.fdopen(fd, 'w') as f:
                f.write(content)
            return True
        except Exception:
            os.close(fd)
            raise
    except Exception as e:
        print(f"Error writing file {file_path}: {e}")
        return False


def add_import(content: str) -> str:
    """Add layout constants import if not present"""
    if 'layout-constants' in content:
        return content

    # Find where to insert (after 'use client' or at top)
    lines = content.split('\n')
    insert_idx = 0

    for i, line in enumerate(lines):
        # Check for 'use client' directive (note: this is string prefix check, not URL)
        if "'use client'" in line or '"use client"' in line:
            insert_idx = i + 2  # After use client and empty line
            break
        # Check for import statements (note: this is string prefix check, not URL)
        if line.startswith('import '):
            insert_idx = i
            break

    import_line = "import { PAGE_HEADER_STYLES, PAGE_SECTION_STYLES } from '@/app/styles/layout-constants'"
    lines.insert(insert_idx, import_line)

    return '\n'.join(lines)


def replace_container_wrapper(content: str) -> str:
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

    # Get project root directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)

    updated = 0
    for page_path in PAGES:
        # SECURITY: Validate path stays within project directory
        safe_path = safe_resolve_path(project_root, page_path)
        if safe_path is None:
            print(f"⚠️  Security validation failed: {page_path}")
            continue

        if not os.path.exists(safe_path):
            print(f"⚠️  Not found: {page_path}")
            continue

        print(f"Updating: {page_path}")

        # Read file content (using standard file read - this is local file, not HTTP)
        with open(safe_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Add import
        content = add_import(content)

        # Replace container wrapper
        content = replace_container_wrapper(content)

        # SECURITY: Write with secure file permissions
        if secure_write_file(safe_path, content):
            print(f"  ✅ Updated")
            updated += 1
        else:
            print(f"  ❌ Failed to write")

    print("")
    print(f"✅ Updated {updated} pages")
    print("")
    print("⚠️  IMPORTANT: You still need to manually add style={PAGE_SECTION_STYLES}")
    print("   to individual sections (Cards, divs) in each page to match create-pd pattern")


if __name__ == '__main__':
    main()
