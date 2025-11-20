#!/usr/bin/env python3
"""
Cache-busting version bump script for Paddle Mexican Tournament PWA.

This script updates all version query strings (?v=YYYYMMDDHHmmss) throughout
the codebase to bust browser caches during development.

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


def update_version_in_file(file_path, old_version, new_version):
    """
    Update version strings in a file.

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

        # Pattern to match ?v= followed by 14 digits (YYYYMMDDHHmmss)
        pattern = r'\?v=(\d{14})'

        # Find the old version if not provided
        if old_version is None:
            match = re.search(pattern, content)
            if match:
                old_version = match.group(1)

        # Replace all occurrences
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

    # Files to update
    files_to_update = [
        script_dir / "index.html",
        script_dir / "sw.js",
    ]

    # Generate new version
    new_version = generate_version()

    # Track changes
    old_version = None
    total_changes = 0
    files_changed = []

    # Update each file
    for file_path in files_to_update:
        count, found_version = update_version_in_file(file_path, old_version, new_version)

        if count > 0:
            total_changes += count
            files_changed.append(f"{file_path.name} ({count} change{'s' if count > 1 else ''})")

            # Use the first version found as the "old" version for display
            if old_version is None and found_version:
                old_version = found_version

    # Report results
    if total_changes > 0:
        print(f"✓ Updated version: {old_version} → {new_version}")
        print(f"✓ Files updated: {', '.join(files_changed)}")
        print(f"✓ Total changes: {total_changes}")
    else:
        print("No version strings found to update.")
        print("Ensure files contain ?v= followed by 14-digit timestamps.")


if __name__ == "__main__":
    main()
