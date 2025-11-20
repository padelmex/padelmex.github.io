#!/usr/bin/env python3
"""
Update version strings in static file references for cache busting.

This script searches through the codebase for patterns like:
- style.css?v=1
- app.js?v=2
- script.js?v=abc123

And replaces them all with a new version string.
"""

import os
import re
import sys
from datetime import datetime
import random
import string

# File extensions to search through
EXTENSIONS = ['.html', '.js', '.css', '.md']

# Directories to exclude
EXCLUDE_DIRS = ['.git', 'node_modules', '__pycache__', '.venv', 'venv', 'lib']

# Pattern to match version strings: ?v=<anything>
VERSION_PATTERN = re.compile(r'\?v=[^\s"\')\]>]+')

# Pattern to match service worker cache name: CACHE_NAME = 'paddle-mexican-v<number>'
SW_CACHE_PATTERN = re.compile(r"CACHE_NAME\s*=\s*['\"]paddle-mexican-v(\d+)['\"]")


def generate_version():
    """Generate a new version string based on timestamp."""
    # Use timestamp for deterministic versioning (good for debugging)
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    return timestamp

    # Alternative: Use random string
    # return ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))


def should_process_file(filepath):
    """Check if file should be processed based on extension."""
    return any(filepath.endswith(ext) for ext in EXTENSIONS)


def should_exclude_dir(dirpath):
    """Check if directory should be excluded."""
    parts = dirpath.split(os.sep)
    return any(excluded in parts for excluded in EXCLUDE_DIRS)


def update_versions_in_file(filepath, new_version, dry_run=False):
    """Update all version strings in a file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return 0

    # Find all matches
    matches = VERSION_PATTERN.findall(content)
    if not matches:
        return 0

    # Replace all version strings with new version
    new_content = VERSION_PATTERN.sub(f'?v={new_version}', content)

    if dry_run:
        print(f"  Would update {len(matches)} version(s) in: {filepath}")
        for match in set(matches):
            print(f"    {match} -> ?v={new_version}")
        return len(matches)

    # Write back to file
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"  Updated {len(matches)} version(s) in: {filepath}")
        return len(matches)
    except Exception as e:
        print(f"Error writing {filepath}: {e}")
        return 0


def update_sw_cache_version(filepath, dry_run=False):
    """Update service worker cache version."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return False

    # Find current cache version
    match = SW_CACHE_PATTERN.search(content)
    if not match:
        return False

    current_version = int(match.group(1))
    new_version = current_version + 1

    # Replace cache version
    new_content = SW_CACHE_PATTERN.sub(
        f"CACHE_NAME = 'paddle-mexican-v{new_version}'",
        content
    )

    if dry_run:
        print(f"  Would update service worker cache version in: {filepath}")
        print(f"    paddle-mexican-v{current_version} -> paddle-mexican-v{new_version}")
        return True

    # Write back to file
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"  Updated service worker cache version in: {filepath}")
        print(f"    paddle-mexican-v{current_version} -> paddle-mexican-v{new_version}")
        return True
    except Exception as e:
        print(f"Error writing {filepath}: {e}")
        return False


def update_versions(root_dir='.', dry_run=False):
    """Walk through directory tree and update all version strings."""
    new_version = generate_version()
    total_files = 0
    total_updates = 0

    print(f"{'DRY RUN: ' if dry_run else ''}Updating versions to: ?v={new_version}")
    print(f"Searching in: {os.path.abspath(root_dir)}\n")

    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Modify dirnames in-place to skip excluded directories
        dirnames[:] = [d for d in dirnames if not should_exclude_dir(os.path.join(dirpath, d))]

        for filename in filenames:
            filepath = os.path.join(dirpath, filename)

            if should_process_file(filepath):
                updates = update_versions_in_file(filepath, new_version, dry_run)
                if updates > 0:
                    total_files += 1
                    total_updates += updates

    # Update service worker cache version
    sw_path = os.path.join(root_dir, 'sw.js')
    if os.path.exists(sw_path):
        print()
        update_sw_cache_version(sw_path, dry_run)

    print(f"\n{'DRY RUN: ' if dry_run else ''}Summary:")
    print(f"  Files modified: {total_files}")
    print(f"  Total version strings updated: {total_updates}")
    print(f"  New version: ?v={new_version}")

    return total_files, total_updates


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(
        description='Update version strings in static file references for cache busting.'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be changed without actually changing files'
    )
    parser.add_argument(
        '--dir',
        default='.',
        help='Root directory to search (default: current directory)'
    )

    args = parser.parse_args()

    if not os.path.isdir(args.dir):
        print(f"Error: Directory not found: {args.dir}")
        sys.exit(1)

    update_versions(args.dir, args.dry_run)


if __name__ == '__main__':
    main()
