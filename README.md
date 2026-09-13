# Padel Mexicano Tournament

A Progressive Web App for organizing and managing Padel Mexicano tournaments. The app runs entirely in the browser with no server required, storing all data locally for privacy and offline access.

## Features

- **Tournament Setup**: Configure tournaments with custom players and court names
- **Smart Pairing**: Automatic team pairing based on leaderboard rankings
- **Score Tracking**: Track scores for each game with real-time updates
- **Live Leaderboard**: View player standings with points, wins, losses, and games played
- **Any Number of Players**: Courts of three (1 vs 2) when you are short of a full four, with a fair rotation of who plays alone
- **Fair Rotation**: When there are more players than court seats, rest rounds are spread so games played stay within one of each other
- **Editable Mid-Tournament**: Add or remove players and courts without losing a single score
- **Randomization**: On by default — alternates between the two closest ways to split a court, for more even games and more varied partners. Seeded, so draws stay reproducible
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
├── docs/               # Format rules, behaviour and design decisions
└── Makefile            # Development commands
```

## How It Works

1. **Setup**: Configure players, courts, and points per match
2. **Round Generation**:
   - First round uses the order players were entered
   - Later rounds rank everyone by points and fill courts from the top, pairing `1 & 3 vs 2 & 4`
   - Randomization (on by default) alternates between `1 & 3 vs 2 & 4` and `1 & 4 vs 2 & 3` within a court, without disturbing the ladder
3. **Seating**: Courts of three (1 vs 2) are used whenever that lets everyone play; when
   there are more players than seats, the players with the most games rest
4. **Score Tracking**: Enter scores as games finish. A total that doesn't match the target is
   flagged, not rejected
5. **Leaderboard**: Players ranked by total points, then games played, then alphabetically
6. **Next Round**: Once all games have scores, advance with updated pairings

### Documentation

| Document | What's in it |
|---|---|
| [docs/mexicano-format.md](docs/mexicano-format.md) | The format: scoring, the ranking ladder, how rounds are drawn |
| [docs/player-counts.md](docs/player-counts.md) | What happens for any number of players, with full seating tables |
| [docs/navigation-and-state.md](docs/navigation-and-state.md) | Screens, stored data, editing a running tournament, determinism |
| [docs/design-decisions.md](docs/design-decisions.md) | Why each rule is the way it is, and what was rejected |

## Browser Requirements

- Modern browsers with ES module support (Chrome, Firefox, Safari, Edge)
- JavaScript must be enabled
- localStorage support required for data persistence

## About

All data is stored locally in your browser's storage, ensuring complete privacy. No data is ever sent to external servers.

For code style guidelines and architecture details, see [CLAUDE.md](CLAUDE.md).
