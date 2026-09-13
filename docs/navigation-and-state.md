# Screens, state and determinism

## Three screens, one back stack

The app has three screens and uses the browser's history so that Back and the phone's back
gesture do the obvious thing. Setup is always the bottom of the stack:

| Position | Screen | Reached by | Left by |
|---|---|---|---|
| 0 | **Setup** | the bottom of the stack, always | *Create* / *Save changes* |
| 1 | **Tournament** | *Create* / *Save changes* | *Edit*, or Back |
| 2 | **Leaderboard** | *Show Leaderboard* | *Close*, or Back |

Because setup is pinned at position 0, the *Edit* button is just `history.back()`, and
*Close* on the leaderboard is the same. The stack is seeded on load: even when you open the
app straight into a tournament in progress, a setup entry is put underneath it first, so
Back always has somewhere sensible to go.

`store.state.currentView` is the single source of truth for what renders;
`popstate` writes to it, and the navigation helpers on the store write to it *and* push
history. Nothing watches the URL.

## What is stored, and where

Everything is in `localStorage`. Nothing leaves the device.

### `tournament-data`

The tournament itself — `players`, `courts`, `pointsPerMatch`, `randomize`, `seed`, and
every `round` with its games and scores. Written on every score change, every saved round
and every undo. Its presence is what tells the app there is a tournament to show.

### `tournament-config`

The setup form: points per match, the player list, the court list, the randomize flag. Its
job is to keep the setup screen filled in — after a reload, and after navigating away and
back. Written when you press *Create* or *Save changes*, read once at startup.

The two overlap on purpose. `tournament-data` is the record of what was played;
`tournament-config` is what is currently typed into the form. They are only out of step
between pressing *Save changes* and the tournament screen applying it.

**Reset** clears both, and is the only thing that does.

## Editing a running tournament

*Edit* on the tournament screen goes back to setup with every field still filled. Change
what you like — players, courts, points per match, randomize — and press *Save changes*.

**Played rounds and their scores are never touched.** That is the whole rule. Specifically:

- Finished rounds keep their games, their pairings and their scores exactly as they were.
- A player you removed keeps the points they already earned, stays on the leaderboard greyed
  out, and is simply not drawn into any further round.
- A player you added starts on zero. Having played no games, they are drawn into the very
  next round.
- **The current round** is re-drawn from the new roster *if no score has been typed into it
  yet*. If any score has been entered, the round is left alone — it would be rude to throw
  away something you just typed — and the change takes effect from the round after. The
  screen says which round that is.
- Changing **points per match** affects new rounds only. Each round remembers the target it
  was drawn with, so finished rounds aren't retroactively flagged as wrong.
- The **seed** never changes. See below.

To start over from scratch, use *Reset*, which asks first.

## The determinism contract

> A round is a pure function of the seed, the roster, the courts, the randomize flag and the
> rounds already played.

Nothing else gets a vote. In practice:

- **Undo and re-save a round and you get the identical round back.** Same pairings, same
  courts, same solo player.
- **Press *Save changes* without changing anything and nothing moves.**
- **Reloading the page changes nothing**, because the seed is stored alongside the rounds.

The seed is drawn at random once, when the tournament is created, and then saved and never
recomputed. It is what makes the *Randomize teams* shuffle repeatable, and it is why editing
the roster doesn't silently reshuffle every future round. Two sessions with the same people
get different draws, which is what you want; one session always draws the same way twice,
which is also what you want.

Everything else feeding a draw is already fully ordered — the leaderboard sort breaks every
tie down to the player's name, and so does the rest rotation and the choice of who plays
alone.

Tournaments saved before the seed was stored fall back to a fixed constant, so upgrading
mid-session doesn't reshuffle a draw underneath you.
