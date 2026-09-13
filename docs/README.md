# Documentation

How this app runs a Padel Mexicano, and why it runs it that way.

| Document | What's in it |
|---|---|
| [mexicano-format.md](mexicano-format.md) | The format itself: scoring, the ranking ladder, how each round is drawn, the leaderboard. |
| [player-counts.md](player-counts.md) | What happens for any number of players: full courts, 1 v 2 games, rotating rest. The seating algorithm and its tables. |
| [navigation-and-state.md](navigation-and-state.md) | Screens and the back stack, what is stored where, editing a running tournament, the determinism contract. |
| [design-decisions.md](design-decisions.md) | One record per decision — what was chosen, why, and what was rejected. |

The engine lives in [`../src/tournament.js`](../src/tournament.js) and is covered by
`make test`. Code style and architecture conventions are in [`../CLAUDE.md`](../CLAUDE.md).
