# Paddle Mexican Tournament

A Progressive Web App for organizing and managing Mexican paddle tournaments. The app runs entirely in the browser with no server required, storing all data locally for privacy and offline access.

## Features

- **Tournament Setup**: Configure tournaments with custom players and court names
- **Smart Pairing**: Automatic team pairing based on leaderboard rankings
- **Score Tracking**: Track scores for each game with real-time updates
- **Live Leaderboard**: View player standings with points, wins, losses, and games played
- **Benching Modes**: Support for round-robin or random benching when you have more players than court capacity
- **Randomization**: Optional deterministic randomization to prevent repetitive pairings
- **Offline Support**: Works completely offline after initial load with service worker caching
- **Mobile-First**: Responsive design optimized for mobile devices
- **Local Storage**: All tournament data stays in your browser - no data sent to servers

## Getting Started

The app doesn't require any build steps or dependencies. You can run it directly in your browser.

### Quick Start (Local Development)

Since the app uses ES modules, you'll need to serve it over HTTP (not `file://`):

```bash
# Using Python's built-in HTTP server (recommended)
python3 -m http.server 8000

# Or using the Makefile
make serve
```

Then open http://localhost:8000 in your browser.

## Development

### Running Tests

Run the test suite using:

```bash
make test
# or
node tests/test-runner.js
```

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

### Configuration

Edit `src/config.js` to toggle development settings:

- `ENABLE_CACHE`: Enable/disable service worker caching (set to `false` during development)
- `SHOW_DEBUG_MENU`: Show/hide debug menu in tournament configuration

## Technology Stack

- **Framework**: Vue 3 (vendored, no npm dependencies)
- **Module System**: ES modules with importmap
- **State Management**: Vue reactive store pattern
- **Persistence**: localStorage
- **Styling**: Plain CSS with CSS variables
- **PWA**: Service Worker for offline support
- **Build**: None required - runs directly in browser

## Project Structure

```
paddle-mexican/
├── index.html          # Entry point
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker
├── src/                # Source code
│   ├── app.js          # Main app initialization
│   ├── store.js        # Centralized state management
│   ├── config.js       # Application configuration
│   ├── tournament.js   # Tournament logic
│   └── components/     # Vue components
│       ├── tournament_config.js
│       └── tournament_page.js
├── styles/             # Stylesheets
│   └── style.css       # Global styles
├── lib/                # Vendored libraries (Vue)
├── assets/             # Static assets (favicon, icons)
├── tests/              # Test files
└── Makefile            # Development commands
```

## How It Works

### Tournament Logic

1. **Setup Phase**: Configure players, courts, points per match, and benching mode
2. **Round Generation**:
   - First round uses initial player order
   - Subsequent rounds pair players based on leaderboard rankings
   - Optional randomization prevents repetitive pairings while maintaining competitive balance
3. **Score Tracking**: Enter scores for each game as they complete
4. **Leaderboard**: Players ranked by total points, then games played, then alphabetically
5. **Next Round**: Once all games complete, advance to the next round with updated pairings

### Benching Modes

- **Round-robin**: Players bench in a fixed rotation order, ensuring everyone benches equally
- **Random**: Seeded random selection for benching (deterministic for consistency)

## Browser Requirements

- Modern browsers with ES module support (Chrome, Firefox, Safari, Edge)
- JavaScript must be enabled
- localStorage support required for data persistence

## About

All data is stored locally in your browser's storage, ensuring complete privacy. No data is ever sent to external servers.

For code style guidelines and architecture details, see [CLAUDE.md](CLAUDE.md).
