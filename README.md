# Paddle Mexican Tournament

A Progressive Web App for organizing and managing Mexican paddle tournaments.

## Features

Coming soon...

## Getting Started

The app doesn't require any build steps. Just open the index.html file in your browser.

```bash
open index.html
```

## Development

### Running a Local Server

For development with ES modules, use Python's built-in HTTP server:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000 in your browser.

### Cache Busting

The app uses version query strings (`?v=YYYYMMDDHHmmss`) to bust browser caches. When you make changes to CSS or JS files, run the version bump script to update all version strings:

```bash
python3 bump-version.py
```

This will automatically update version strings in:
- `index.html` (CSS and JS imports)
- `sw.js` (Service Worker cache)

Example output:
```
✓ Updated version: 20251119204632 → 20251120154523
✓ Files updated: index.html (2 changes), sw.js (2 changes)
✓ Total changes: 4
```

## About

All data is stored locally in your browser's storage, ensuring simplicity and privacy.

Based on the architecture of the [Last mile](https://mile.marnikitta.com) app.
