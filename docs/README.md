# Documentation

How this app runs a Padel Mexicano, and why it runs it that way.

| Document | What's in it |
|---|---|
| [mexicano-format.md](mexicano-format.md) | The format itself: scoring, the ranking ladder, how each round is drawn, the leaderboard. |
| [player-counts.md](player-counts.md) | What happens for any number of players: full courts, 1 v 2 games, rotating rest. The seating algorithm and its tables. |
| [navigation-and-state.md](navigation-and-state.md) | Screens and the back stack, what is stored where, editing a running tournament, the determinism contract. |
| [randomization.md](randomization.md) | Why *Randomize teams* is on by default: what the shuffle does, how its strength was tuned, and the measurements behind both. |
| [pairing-benchmarks.md](pairing-benchmarks.md) | What a good pairing strategy has to do, the metrics that say whether it does, and how to benchmark a change. |
| [webview-storage.md](webview-storage.md) | Why a tournament opened from Telegram or Instagram can vanish, how the app guesses that it is in a webview, and how wrong that guess can be. |
| [design-decisions.md](design-decisions.md) | One record per decision — what was chosen, why, and what was rejected. |

The engine lives in [`../src/tournament.js`](../src/tournament.js), is covered by
`make test`, and is measured by `make bench`. Code style and architecture conventions are in [`../CLAUDE.md`](../CLAUDE.md).
