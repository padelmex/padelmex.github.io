# Benchmarking a pairing strategy

How to tell whether a change to the draw made it better or worse, and what "better" means
here. Run `make bench`; this page says how to read what it prints.

`make test` and `make bench` answer different questions. A test asserts a bound and fails
when it breaks. The benchmark measures *quality*, which has no pass mark — it prints a
scorecard for a person to judge. Both matter, and neither replaces the other.

## What a good pairing strategy has to do

A Mexicano draw is juggling four goals that pull against each other. Ranked by how much
they matter, because they genuinely conflict and something has to give:

**1. Everyone plays the same amount.** Non-negotiable, and the one thing players count for
themselves. If seats are short, rest rounds are shared out to within one across the field,
at every point in the session — not just by the end, because sessions stop early.

**2. Nobody carries a bad role.** Playing alone against two is harder and scores worse. It
has to rotate. It cannot be perfectly equal — courts are carved out of the standings, so who
is even eligible depends on where people are on the table — but nobody should end up doing
it three times while somebody else never does.

**3. Games should be close.** This is the point of the format. A blowout is boring for all
four players, and in a Mexicano it also distorts the table, because your score is the points
you scored. The draw controls this through who is on each side.

**4. You should not keep playing the same game.** Same court, same partner, same opponents,
round after round is what makes a long session drag. This is the softest goal — it is the
first thing to trade away for any of the three above.

The tension worth naming: **3 and 4 pull against each other.** The most even split of a
court is a specific pairing, so always choosing it means always the same pairing. Variety
means sometimes choosing a worse one. The measurements in
[randomization.md](randomization.md) found this trade is not as sharp as it looks — there
are *two* near-even splits, and alternating between them buys variety for free.

## The metrics

### Fairness — these are bounds, not scores

| Metric | What it is | Bound |
|---|---|---|
| **Bench spread** | Most rest rounds any player got, minus the fewest | **≤ 1**, always |
| **Games spread** | Same for games scheduled | **≤ 1**, always |
| **Solo spread** | Most 1 v 2 turns minus fewest | **≤ 3** |

Bench and games can always be dealt to within one, so anything above that is a bug, not a
trade-off. Solo cannot — three is the empirical worst across the grid, not a principle.

Check these at **every session length**, not just a long one. A rule that only evens out
after fifteen rounds is no use to a group that plays six. `make bench` runs 2, 3, 4, 5, 6,
10 and 20 rounds for exactly this reason.

### Balance — lower is better

| Metric | What it is |
|---|---|
| **Gap between sides** | Sum of one side's skill minus the other's, averaged over courts of four |
| **Mean score margin** | Average `\|score1 − score2\|` |

Gap is the honest one. Players are given an evenly spaced ladder — skill `N, N-1, … 1` — so
a gap of 1 reads directly as "these two sides are one rank apart", with no scoring model in
the way. It measures the *draw*, which is the thing under test.

Score margin depends on a made-up scoring model (see below), so treat it as corroboration,
never as the headline. If gap and margin disagree, believe gap.

### Variety — higher coverage, lower repeats

| Metric | What it is |
|---|---|
| **Partnership coverage** | Distinct pairs who partnered, over all pairs possible |
| **Worst partner repeat** | Times the most-repeated pair partnered |
| **Worst game repeat** | Times the most-repeated exact game was replayed |

Coverage falls naturally as the field grows — sixteen players over twelve rounds cannot
reach 120 pairs, so ~48% is a ceiling, not a failure. **Compare configs against themselves
across a change, never against each other.**

Worst-repeat is what players actually notice. "I have partnered you four times tonight" is
a complaint; "we covered 58% of possible pairings" is not a sentence anyone says.

## The scoring model, and how far to trust it

Fairness and balance metrics are structural — they read the draw and need no notion of who
wins. But the standings drive the next round, so a benchmark has to play the games somehow.

`tests/benchmark.js` splits points in proportion to team strength, with uniform noise, and
discounts a lone player to 72% for covering the whole court. Every number in it is invented.

So: **prefer metrics that do not depend on it.** Gap between sides, coverage, repeats and all
three fairness spreads are computed from the draw itself. Mean score margin is the only
metric that leans on the model, and it is reported last for that reason.

When a result *does* hinge on the model, say so and check whether it survives changing the
assumptions. The rest-bias finding in `tests/matchmaking.test.js` is stated as a
deterministic test with every game an 8–8 draw, precisely so no model is involved.

## Method

- **Average over many draws, never one.** A single seed proves nothing. The benchmark uses
  300 sessions per cell for quality metrics.
- **Worst case for bounds, mean for quality.** A fairness bound that holds on average is not
  a bound. Take the max across draws.
- **Hold everything else fixed.** One knob at a time, same seeds, same configs.
- **Sweep the whole grid.** Four players on one court behaves nothing like sixteen on four.
  The degenerate cases live at the edges, and 4p/1c is a common real session, not an edge
  case to wave away.
- **Compare a change against the current code, not against an ideal.** The question is
  always "is this better than what we ship".

## Changing the draw

1. `make test` — the bounds still hold.
2. `make bench` before your change, and after. Keep both.
3. Read the fairness table first. A regression there is disqualifying, whatever the quality
   numbers say.
4. Read the quality table. Expect trade-offs; a change that improves everything is rare
   enough to be worth double-checking for a measurement bug.
5. If the trade is real, write down what you bought and what you paid, and add a record to
   [design-decisions.md](design-decisions.md).
6. Paste the scorecard into the pull request.

## Known open problems

Two things the draw does not currently get right. Both have `LIMIT:` tests in
`tests/matchmaking.test.js` that will fail loudly when they are fixed.

**Total-points ranking rewards the extra game.** When rests mean one player has played a
game more, they carry roughly half a match of unearned points — measured at 2.5–3 standard
deviations of genuine performance spread, enough to decide who wins. Ranking on points per
game removes it entirely; that is a format decision, not a bug fix.

**The 1 v 2 penalty never washes out.** [design-decisions.md](design-decisions.md) §3 argues
the format self-corrects, because a low score hands you an easier court next round. That
does not close: the table is a *cumulative* total, so points given up playing alone are
never won back. Rotating the role shares the cost out; it does not remove it.
