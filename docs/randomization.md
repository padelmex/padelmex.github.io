# Randomization: what it does and why it is on

*Measured September 2026 against `src/tournament.js`. Reproduce every table below with
`make bench`, except the tuning sweep, which needed the source patched per row. Metric
definitions and the reasoning behind them are in [pairing-benchmarks.md](pairing-benchmarks.md).*

**Randomize teams is on by default and labelled *(Recommended)*.** This page is the
evidence for that, and for the one change made to the shuffle itself.

## The short version

Three things came out of measuring it, and the second was a surprise:

1. **It fixes a real degenerate case.** Four players on one court reach only four of the
   six possible partnerships without it. Two people never partner each other all session.
2. **It makes games *more* even, not less.** The strict ranking pairs 1 & 3 against 2 & 4,
   which is not the most balanced split of a court — 1 & 4 against 2 & 3 is. Mixing the two
   halves the average gap between sides.
3. **It costs nothing in fairness.** Rest rounds and 1 v 2 turns are handed out before the
   shuffle runs, so their guarantees are untouched.

The old shuffle also had a third move — an occasional swap across the two sides — which
turned out to be the only part that hurt. It is gone.

## What the shuffle actually does

A court of four is filled in ranking order and split as positions 0 & 2 against 1 & 3. That
means there are only three possible ways to split it:

| Split | Sides, by rank within the court | Gap between sides on an evenly spaced ladder |
|---|---|---|
| **1 & 3 v 2 & 4** | the strict Mexicano pairing | 2 |
| **1 & 4 v 2 & 3** | strongest carries weakest | **0 — a dead-even game** |
| **1 & 2 v 3 & 4** | top two against bottom two | 4 — the most lopsided |

The shuffle makes two independent coin-flips: swap the first two players, swap the last two.
Between them they pick evenly between the first two splits and **can never produce the
third**. That is the whole algorithm.

This corrects a claim the format doc used to make. `1 & 3 vs 2 & 4` is the Mexicano
convention, but it is not "as even as it can be" — on a ladder with even spacing it leaves a
gap of 2, where `1 & 4 v 2 & 3` leaves none.

## Tuning: the cross-side swap had to go

The previous version added a third move: with probability 0.3, swap one player from the
first side with one from the second. That move is the only way to reach the lopsided
`1 & 2 v 3 & 4` split.

Sweeping that probability from 0 to 1 — everything else held fixed, 250 sessions of 12
rounds per cell, skills set to an even ladder:

| Cross-swap probability | 1&3 v 2&4 | 1&4 v 2&3 | 1&2 v 3&4 | Mean gap between sides | 4p partnership coverage | 16p worst partner repeat |
|---|---|---|---|---|---|---|
| **0.00 (now)** | 50.3% | 49.7% | 0.0% | **1.007** | **100%** | **4.77** |
| 0.05 | 49.0% | 48.5% | 2.5% | 1.080 | 100% | 4.74 |
| 0.10 | 47.6% | 47.3% | 5.1% | 1.155 | 100% | 4.73 |
| 0.20 | 45.5% | 44.7% | 9.7% | 1.300 | 100% | 4.87 |
| 0.30 (old) | 43.0% | 41.9% | 15.1% | 1.464 | 100% | 4.92 |
| 0.50 | 37.7% | 37.3% | 25.0% | 1.755 | 100% | 5.09 |
| 1.00 | 25.2% | 25.6% | 49.2% | 2.473 | 98% | 6.59 |
| *(off)* | *100%* | *0%* | *0%* | *2.000* | *67%* | *4.30* |

Zero dominates. Every increase makes games less even, and past about 0.3 it makes *variety*
worse too — the thing the swap existed to improve. It was buying nothing and costing
balance, so the strength is now zero and the move is deleted rather than tuned down.

The one metric where off still wins is `16p worst partner repeat` (4.30 vs 4.77). A strict
ranking spreads partners systematically; a shuffle occasionally repeats by chance. It is a
small cost against a large gain elsewhere.

## On against off, across the board

12 rounds, 300 sessions per cell, skills on an even ladder — straight from `make bench`:

| Config | Partnership coverage | Worst partner repeat | Worst game repeat | Gap between sides | Mean score margin |
|---|---|---|---|---|---|
| 4p / 1 court | 67% → **100%** | 7.82 → **5.98** | 7.73 → **4.10** | 2.699 → **1.530** | 4.54 → **3.55** |
| 5p / 1 court | 88% → **94%** | 4.79 → **4.55** | 2.22 → **1.91** | 2.616 → **1.959** | 4.05 → **3.44** |
| 6p / 2 courts | 75% → **77%** | 4.18 → **3.97** | 3.12 → **2.99** | — *(all 1 v 2)* | 4.85 → 4.89 |
| 7p / 2 courts | 77% → **78%** | 4.69 → **4.50** | 2.14 → **2.00** | 2.544 → **2.353** | 4.11 → **4.08** |
| 8p / 2 courts | 71% → **76%** | 6.19 → **5.12** | 3.38 → **2.38** | 3.021 → **2.692** | 3.75 → **3.52** |
| 10p / 3 courts | 58% → **60%** | 4.44 → **4.25** | 2.03 → **2.01** | 3.173 → 3.225 | 4.27 → 4.37 |
| 12p / 3 courts | 55% → **58%** | 5.54 → **4.93** | 2.82 → **2.18** | 3.911 → **3.795** | 3.66 → **3.58** |
| 16p / 4 courts | 48% → **49%** | 5.15 → **4.61** | 2.38 → **2.00** | 5.201 → **4.993** | 3.71 → **3.63** |

Randomize wins or ties nearly every cell. The gain is dramatic for four players, useful
for eight to sixteen, and close to a wash for ten on three courts — that config is mostly
1 v 2 games, which the shuffle barely touches.

## It does not touch bench or solo fairness

This is the part worth being careful about, because it is the easy thing to get wrong.

**Seating is decided before the shuffle runs.** Who rests comes from games played; who plays
alone comes from solo counts and how long ago. The shuffle only reorders players *inside* a
court that has already been chosen. It cannot bias either.

`make bench` checks the worst spread over 12 draws for eleven configurations at seven
session lengths — 77 cells per mode, from 2 rounds to 20:

| Metric | Bound | Result |
|---|---|---|
| Rest rounds | ≤ 1, always | **held in every cell, both modes** |
| Games played | ≤ 1, always | **held in every cell, both modes** |
| 1 v 2 turns | ≤ 3 | held in every cell, worst seen 2 |

**Bench spread is identical between the two modes in all 77 cells.** Solo spread differs in
four: two where randomize is better, two where it is worse, all by one turn.

Those four are *indirect*. The shuffle changes who scores what, which moves the standings,
which changes who is available for a court of three. It is a different draw, not a less fair
rule — the rule that picks the solo player never sees the shuffle. Across a wider sweep of
250 seeds per cell the two modes' worst cases are the same.

**These bounds hold from the second round, not just on average over a long session.** Both
are asserted over the full grid in `tests/matchmaking.test.js`.

## What it does not fix

Randomize is a within-court shuffle. It does not touch:

- **Who is on which court.** The ladder is untouched, by design — you still play people at
  your level.
- **The rest bias in the standings.** Ranking on total points still rewards whoever got the
  extra game, worth about half a match. See the `LIMIT:` tests in
  `tests/matchmaking.test.js`.
- **The 1 v 2 scoring penalty.** Still uncompensated, by decision 3 in
  [design-decisions.md](design-decisions.md).

## Why on by default

A default should be what most sessions want, and the measurements say every session wants
this one: more even games, more varied partners, no fairness cost, and the only escape from
the four-player degenerate case. Determinism is unaffected — the shuffle is seeded, so undo
and re-save still reproduce a round exactly.

It stays a checkbox because an organiser running a seeded ladder may want the strict
ranking and nothing else. A saved config from before the flip keeps whatever it had; a saved
config with no opinion on the field takes the new default.
