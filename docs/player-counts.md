# Any number of players

A Mexicano wants four players per court. Real sessions rarely cooperate: seven people turn
up for two courts, or someone leaves after an hour. This page is the complete account of
what the app does with whatever number it is given.

There are exactly two tools, and the app reaches for them in this order:

1. **A court of three** — one player against two. Used whenever it lets everybody onto a
   court.
2. **A rest** — someone sits the round out. Used only when there is genuinely no way to
   seat everyone, which means there are more players than court seats.

## The seating rule

With `P` players and `C` courts, at most `4 × C` people can be on court. From that cap, the
app takes the **largest number it can actually seat**, and seats it on **as few courts as
possible** — which is the same thing as using **as few courts of three as possible**.

In full:

- Start at `seated = min(P, 4 × C)` and count down.
- A number is seatable if `ceil(seated / 4)` courts are available and those courts can hold
  it without dropping below three a side — `ceil(seated / 4) × 3 <= seated`.
- Courts used is `ceil(seated / 4)`; of those, `courts × 4 - seated` are courts of three and
  the rest are courts of four.
- Anyone not seated rests this round.

Fewer than three players is not a tournament, and the app says so.

### With enough courts for everyone

| Players | Courts used | Layout | Resting |
|---|---|---|---|
| 3 | 1 | 1 v 2 | – |
| 4 | 1 | 2 v 2 | – |
| 5 | 1 | 2 v 2 | **1** |
| 6 | 2 | 1 v 2, 1 v 2 | – |
| 7 | 2 | 2 v 2, 1 v 2 | – |
| 8 | 2 | 2 v 2, 2 v 2 | – |
| 9 | 3 | 1 v 2 × 3 | – |
| 10 | 3 | 2 v 2, 1 v 2, 1 v 2 | – |
| 11 | 3 | 2 v 2, 2 v 2, 1 v 2 | – |
| 12 | 3 | 2 v 2 × 3 | – |
| 13 | 4 | 2 v 2, 1 v 2 × 3 | – |
| 14 | 4 | 2 v 2, 2 v 2, 1 v 2, 1 v 2 | – |
| 15 | 4 | 2 v 2 × 3, 1 v 2 | – |
| 16 | 4 | 2 v 2 × 4 | – |

**Five is the one number that never fits.** No combination of threes and fours adds up to
five, so with five players one always rests — and the rest rotates, so over five rounds
everyone sits once.

**Nine players on three courts is three solo games.** That falls straight out of "everyone
plays": if all nine are on court across three courts, every court has three. If you would
rather have two proper doubles games and one person resting, enter two courts instead of
three.

### When courts are the constraint

Booked two courts but eleven people came? Capacity is eight, so three rest each round:

| Players | 1 court | 2 courts | 3 courts | 4 courts |
|---|---|---|---|---|
| 6 | 2 v 2, **2 rest** | 1 v 2, 1 v 2 | 1 v 2, 1 v 2 | 1 v 2, 1 v 2 |
| 7 | 2 v 2, **3 rest** | 2 v 2, 1 v 2 | 2 v 2, 1 v 2 | 2 v 2, 1 v 2 |
| 9 | 2 v 2, **5 rest** | 2 v 2 × 2, **1 rest** | 1 v 2 × 3 | 1 v 2 × 3 |
| 10 | 2 v 2, **6 rest** | 2 v 2 × 2, **2 rest** | 2 v 2, 1 v 2, 1 v 2 | 2 v 2, 1 v 2, 1 v 2 |
| 13 | 2 v 2, **9 rest** | 2 v 2 × 2, **5 rest** | 2 v 2 × 3, **1 rest** | 2 v 2, 1 v 2 × 3 |

Note that adding a court can *remove* solo games (9 players: two courts gives doubles with
one resting, three courts gives three solo games) or *create* them (6 players: one court
gives doubles with two resting, two courts gives two solo games). Spare courts beyond
`ceil(seated / 4)` simply go unused.

## Playing alone: the 1 v 2 court

One player takes on two. It is a real thing people do when the numbers don't work — tennis
calls it Canadian doubles — but there is no official Mexicano rule for it, so here is what
this app decided.

**Which courts get three.** Courts are always filled in ranking order, so you play the
people on your level. When a round mixes courts of four with courts of three, **which court
gets the four rotates with the round number** — otherwise the top of the ladder would sit on
the one doubles court every round and never take a turn playing alone.

**Who plays alone.** Of the three players on the court, it is whoever has **played alone
fewest times so far**; between players level on that, whoever did it longest ago.

Because the courts themselves are carved out of the ranking, solo turns can't be made exactly
equal — who you are on court with depends on where you are on the table. What the rotation
does guarantee in practice is that everybody takes turns and nobody ends up carrying the role:
across a session, counts land within about one of the average.

**No score compensation.** A player alone against two will usually score fewer points, and
the app does not adjust for that. Three reasons:

- The role rotates, so over a session the disadvantage is shared out rather than removed.
- A low score drops you down the ranking, and the next round the ranking hands you an
  easier court. The format already self-corrects.
- Any correction factor would be a number picked out of the air, and it would make the
  leaderboard impossible to explain to the people reading it.

If you want to even it up, do it on court: give the solo player the whole service game, or
make the pair play the ball into the back half. That is a conversation between three
players, not something the app should decide.

## Resting

When there are more players than seats, the players who rest each round are the ones who
have **played the most games so far**. Ties rotate with the round number, so the same person
doesn't keep losing the tie-break.

This keeps everyone's games-played within one of each other for the whole session, and it
handles arrivals and departures for free: somebody added in round five has played no games,
so they go straight onto court in round five.

Rest rounds cost you nothing and earn you nothing — no points, and the **Games** column
doesn't move.

## Where this lives in the code

| Thing | Where |
|---|---|
| The seating rule | `computeSeating()` in [`../src/tournament.js`](../src/tournament.js) — exported, also used by the setup screen's preview |
| Who rests | `getPlayersForNextRound()` |
| Which court gets the four | `getGroupSizes()` |
| Who plays alone | `getSoloCounts()` / `getLastSoloRounds()` / `pickSoloPlayer()` |
| Building the round | `createNextRound()` |

All of it is covered by `make test`.
