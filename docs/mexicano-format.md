# The Mexicano format

A Mexicano is a social tournament for an odd-shaped group of people and a couple of hours
of court time. Nobody has a fixed partner. You play a short game, your points go on your
own tally, and the next round is drawn from the standings — so you end up playing with and
against people of roughly your own level, and the table stays tight to the last round.

## Scoring

Every game is played to a fixed total, the **points per match** (16 and 32 are the usual
choices; any positive integer works). A game to 16 ends when the two sides have scored 16
points between them — `11-5`, `9-7`, `16-0`.

**Your score is the number of points your side scored, not whether you won.** Winning
`9-7` earns you 9. Losing `7-9` earns you 7. This is what keeps a Mexicano competitive for
everyone: a weaker player in a close game out-earns a stronger player in a blowout they
were never really part of.

The app records both sides' scores, keeps a win/loss count for interest, and ranks on
points.

## How a round is drawn

**Round 1** uses the order players were entered. Treat that as a rough seeding if you like,
or don't — it stops mattering after the first round.

**Every later round** is drawn from the current standings:

1. Rank everyone by points.
2. Decide who plays (see [player-counts.md](player-counts.md) — with more players than
   seats, some rest).
3. Walk the ranking from the top, filling one court at a time: ranks 1–4 to the first
   court, 5–8 to the second, and so on.
4. On each court of four, the pairing is **1 & 3 against 2 & 4**.

So the leaders play the leaders and the back of the field plays the back of the field, and
the `1 & 3 vs 2 & 4` split hands the court's strongest player its third-strongest, against
the second and fourth.

This is the Mexicano convention, and it is a close game — but it is not the closest one
available. On an evenly spaced court, `1 & 4 vs 2 & 3` is dead level while `1 & 3 vs 2 & 4`
leaves a gap of two ranks. Mixing the two is what *Randomize teams* does, which is why it is
on by default.

Courts of three work the same way but one player takes on the other two — see
[player-counts.md](player-counts.md).

## Randomize teams

**On by default**, and it only starts from round 2.

With it on, the app shuffles *within* each court before pairing, alternating evenly between
the two closest splits of the court — `1 & 3 vs 2 & 4` and `1 & 4 vs 2 & 3`. It never moves
anyone to a different court, so the ladder is untouched: you still play the people on your
level, you just get a different partner out of them than the strict ranking would have
given you.

It is on by default because measuring it found it makes games **more** even rather than
less, gives everyone more different partners, and costs nothing in rest or 1 v 2 fairness —
those are decided before the shuffle runs. With four players on one court it is the only
thing that stops two of the six possible partnerships never happening at all. The numbers
are in [randomization.md](randomization.md).

Turn it off if you want the strict ranking and nothing else.

Randomization is seeded (see the determinism contract in
[navigation-and-state.md](navigation-and-state.md)), so it is shuffled but not unrepeatable.

## The leaderboard

| Column | Meaning |
|---|---|
| **Points** | Total points scored across all games. This is the ranking. |
| **Games** | Games with a score recorded. Rest rounds don't count. |
| **W/L** | Wins and losses. A draw counts as neither. |

Ties break on fewest games played first — scoring the same points from less court time is
the better performance — and then alphabetically, so the order is always stable.

Players who left part-way through keep their history and stay on the table, greyed out.

## Rounds, editing and undo

Only the **latest** round accepts scores. Earlier rounds are frozen and greyed, so a
finished round can't be disturbed by a stray tap.

- **Save Round** records the round and draws the next one. It needs every score filled in,
  including zeros.
- **Edit previous round** removes the current round so you can correct the one before it.
  Re-saving draws the same round back again — the draw is deterministic.
- A score that doesn't add up to the points target is **flagged, not rejected**. Games do
  end early, and the app isn't in a position to argue with whoever was on court.
