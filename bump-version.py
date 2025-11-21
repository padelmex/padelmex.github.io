#!/usr/bin/env python3
"""
Cache-busting version bump script for Padel Mexicano Tournament PWA.

This script updates all version query strings (?v=YYYYMMDDHHmmss) throughout
the codebase to bust browser caches during development, and auto-increments
the service worker cache version.

Usage:
    python3 bump-version.py
    or
    ./bump-version.py
"""

import re
from datetime import datetime
from pathlib import Path


def generate_version():
    """Generate a version string in YYYYMMDDHHmmss format."""
    return datetime.now().strftime("%Y%m%d%H%M%S")


def increment_cache_version(content):
    """
    Increment the cache version number in service worker.

    Extracts version number from CACHE_NAME (e.g., 'padel-mexicano-v4')
    and increments it (e.g., to 'padel-mexicano-v5').

    Args:
        content: Service worker file content

    Returns:
        Tuple of (updated content, old version, new version)
    """
    # Pattern to match CACHE_NAME = 'padel-mexicano-vN'
    pattern = r"(const CACHE_NAME = ['\"]padel-mexicano-v)(\d+)(['\"];)"

    match = re.search(pattern, content)
    if not match:
        return content, None, None

    old_version_num = int(match.group(2))
    new_version_num = old_version_num + 1

    old_version = f"v{old_version_num}"
    new_version = f"v{new_version_num}"

    # Replace the version number
    new_content = re.sub(pattern, rf"\g<1>{new_version_num}\g<3>", content)

    return new_content, old_version, new_version


def update_version_in_file(file_path, old_version, new_version):
    """
    Update version strings in a file.

    For sw.js, updates the VERSION constant.
    For other files, updates ?v= query strings.

    Args:
        file_path: Path to the file to update
        old_version: Current version string (or None to find it)
        new_version: New version string to replace with

    Returns:
        Tuple of (number of replacements made, old version found)
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        count = 0

        # Special handling for sw.js - update VERSION constant
        if file_path.name == 'sw.js':
            # Pattern to match: const VERSION = '20251121105904';
            version_const_pattern = r"(const VERSION = ['\"])(\d{14})(['\"];)"
            match = re.search(version_const_pattern, content)

            if match:
                if old_version is None:
                    old_version = match.group(2)
                new_content = re.sub(version_const_pattern, rf"\g<1>{new_version}\g<3>", content)
                count = 1
            else:
                # Fallback to ?v= pattern if VERSION const not found
                pattern = r'\?v=(\d{14})'
                if old_version is None:
                    match = re.search(pattern, content)
                    if match:
                        old_version = match.group(1)
                new_content, count = re.subn(pattern, f'?v={new_version}', content)
        else:
            # For other files, replace ?v= query strings
            pattern = r'\?v=(\d{14})'

            if old_version is None:
                match = re.search(pattern, content)
                if match:
                    old_version = match.group(1)

            new_content, count = re.subn(pattern, f'?v={new_version}', content)

        if count > 0:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)

        return count, old_version

    except FileNotFoundError:
        print(f"Warning: File not found: {file_path}")
        return 0, None
    except Exception as e:
        print(f"Error updating {file_path}: {e}")
        return 0, None


def main():
    # Get script directory
    script_dir = Path(__file__).parent

    # Files to update with version query strings
    files_to_update = [
        script_dir / "index.html",
        script_dir / "sw.js",
    ]

    # Generate new timestamp version
    new_version = generate_version()

    # Track changes
    old_version = None
    total_changes = 0
    files_changed = []
    cache_version_info = None

    # Update each file's version query strings
    for file_path in files_to_update:
        count, found_version = update_version_in_file(file_path, old_version, new_version)

        if count > 0:
            total_changes += count
            files_changed.append(f"{file_path.name} ({count} change{'s' if count > 1 else ''})")

            # Use the first version found as the "old" version for display
            if old_version is None and found_version:
                old_version = found_version

    # Increment cache version in service worker
    sw_path = script_dir / "sw.js"
    try:
        with open(sw_path, 'r', encoding='utf-8') as f:
            sw_content = f.read()

        new_sw_content, old_cache_ver, new_cache_ver = increment_cache_version(sw_content)

        if old_cache_ver and new_cache_ver:
            with open(sw_path, 'w', encoding='utf-8') as f:
                f.write(new_sw_content)
            cache_version_info = f"{old_cache_ver} → {new_cache_ver}"

    except Exception as e:
        print(f"Warning: Could not increment cache version: {e}")

    # Report results
    print("\n" + "=" * 60)
    if total_changes > 0:
        print(f"✓ Updated timestamp version: {old_version} → {new_version}")
        print(f"✓ Files updated: {', '.join(files_changed)}")
        print(f"✓ Total version string changes: {total_changes}")
    else:
        print("⚠ No version strings found to update.")
        print("  Ensure files contain ?v= followed by 14-digit timestamps.")

    if cache_version_info:
        print(f"✓ Service worker cache version: {cache_version_info}")
    else:
        print("⚠ Cache version not incremented")

    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
