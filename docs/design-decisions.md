# Design decisions

One record per decision, so a future change knows what it is overturning. Each says what was
chosen, why, what was rejected, and what it costs.

---

## 1. A court of three beats sending people to the bench

**Decision.** Whenever putting three players on a court lets everybody play, do that.
Six players and two courts is two 1 v 2 games, not one doubles game with two people watching.

**Why.** People came to play. An hour of court time split between six is better spent with
everyone on court than with a third of the group standing behind the glass. The social point
of a Mexicano outranks the purity of the doubles game.

**Rejected.** A setup toggle to choose per tournament — a question with a defensible default
doesn't need to be asked, and it is one more control on a screen that already has plenty.
Also rejected: preferring full courts and only going to threes when benching is impossible,
which is the opposite trade and leaves people idle.

**Costs.** Nine players on three courts becomes three solo games, which is a lot of 1 v 2
at once. The escape hatch is to enter fewer courts; this is documented in
[player-counts.md](player-counts.md).

---

## 2. The solo role rotates by who has done it least

**Decision.** On a court of three, the player who plays alone is whoever has played alone
fewest times so far; between players level on that, whoever did it longest ago. And when a
round mixes courts of four with courts of three, which court gets the four rotates with the
round number.

**Why.** It is the same fairness principle organisers already use for rest rounds, and it is
the one thing everyone on court can verify without trusting the app. The rotation of the
court of four was added after measuring the first version: with thirteen players on four
courts, the top-ranked player sat on the single doubles court every round and never played
alone at all. Rotating it brought the spread from four turns down to two.

Exact equality is not reachable — courts are carved out of the ranking, so who is available
to take the role depends on the standings. Counts land within about one of the average, which
the tests assert.

**Rejected.** *Always the strongest player* — self-balancing, and arguably the most
Mexicano-spirited choice, but it repeatedly penalises whoever is leading, which is a strange
thing to do to the person playing best. *Always the weakest* — most ball contact for the
person who needs the practice, but it drives them further down a table they are already at
the bottom of.

---

## 3. No score compensation for playing alone

**Decision.** Points from a 1 v 2 game count exactly as they fall. The solo player's 6 is
worth 6.

**Why.** The role rotates (§2), so the disadvantage is shared rather than eliminated. And a
low score drops you in the ranking, which hands you an easier court next round — the format
already corrects for it.

**Rejected.** Multiplying the solo player's points by a factor: the factor would be invented,
and an invented number in the leaderboard is worse than a small unfairness everyone can see.
A head start on court: it changes what a valid score even sums to, and complicates the one
screen that has to work while someone is holding a racket.

**Revisit if** real sessions show solo players systematically finishing last. The solo counts
are derivable from the saved rounds, so this can be measured rather than argued about.

---

## 4. Scores are the thing worth protecting

**Decision.** Every path through the app preserves played rounds and their scores. Only
*Reset*, behind a confirmation, destroys anything.

**Why.** Everything else in the app can be reconstructed — the draw is deterministic, the
roster is retypable. A score that existed only in someone's memory of the last game is gone
for good. So the app biases every ambiguous case towards keeping it.

**Consequences.** Editing the roster mid-tournament re-draws the current round only while it
holds no typed score; once anything is entered, the change waits for the next round. Removing
a player keeps their history on the leaderboard rather than erasing it.

---

## 5. The seed is drawn once and stored

**Decision.** A random seed is generated when the tournament is created, saved with it, and
never recomputed.

**Why.** Draws must be reproducible: undo a round, re-save it, and the same round must come
back. Previously the seed was hashed from the player and court names on every access, so
editing the roster silently reshuffled every future draw — the same tournament could not be
replayed.

**Contract.** A round is a pure function of `(seed, players, courts, randomize, rounds)`.

**Rejected.** Hashing the names, then freezing it: reproducible from the setup alone, which
sounds useful but means the same eight regulars get the same opening draw every week.
Exposing the seed as an editable field: real control, but a field on the setup screen that
needs a paragraph of explanation to justify itself.

---

## 6. Rest goes to whoever has played most

**Decision.** When there are more players than seats, the players with the most games so far
sit out. Ties rotate with the round number.

**Why.** It keeps games-played within one across the whole field, where the previous rule — a
positional window marching through the entry order — could leave a four-game spread in a
short session. It also handles a mid-session arrival for free: no games played means straight
onto court.

**Rejected.** The old positional rotation. It is fair over a complete cycle, but sessions end
mid-cycle, and a player added in round five landed in an arbitrary slot.

---

## 7. Each round remembers its own points target

**Decision.** A round stores the points-per-match it was drawn with.

**Why.** Otherwise changing the target mid-tournament retroactively flags every finished
round as adding up wrong. It also removes the score screen's dependency on the live config,
which had been reverting to its default after every page reload and quietly validating
32-point games against 16.

---

## 8. An odd score total warns, it does not block

**Decision.** Scores that don't add up to the target are flagged in amber and saved anyway.
Only negative and non-numeric entries are refused.

**Why.** Games end early — someone's knee, the court booking, a disagreement about the
score. Whoever was on court knows what happened and the app does not. Its job is to record
and flag, not to refuse.

**Consequences.** *Save Round* is never blocked by a total, so a tournament can't get stuck
behind a validation rule at the one moment everybody is waiting to start the next game.

---

## 9. Auto-completing the second score removed

**Decision.** Typing one side's score no longer fills in the other.

**Why.** It guessed `target − score1`, which is wrong for exactly the games §8 exists to
allow, and it wrote a score nobody had typed. A number on the leaderboard that no human
entered is a bad trade for two saved keystrokes. The inputs are now a real form instead, so
the phone keyboard's *next* control moves through them.

---

## 10. Three history entries, setup pinned at the bottom

**Decision.** Setup, tournament and leaderboard are browser history entries, with setup
always at position 0.

**Why.** *Edit* and *Close* become `history.back()`, the phone's back gesture closes the
leaderboard and leaves the tournament, and Back stops dumping you out of the app entirely.
Pinning setup at the bottom is what lets *Edit* be unconditional — the stack is seeded with a
setup entry on load even when the app opens straight into a running tournament.

**Rejected.** Pushing a new entry in both directions, which works but grows the stack so Back
ping-pongs. Keeping the leaderboard as a local flag inside the tournament screen, which
leaves the back gesture doing the wrong thing on the one screen people open most.

---

## 11. Randomize teams is on by default, and the cross-side swap is gone

**Decision.** *Randomize teams* ships checked, labelled *(Recommended)*. The shuffle itself
was cut down to two coin-flips per court of four; the third move — an occasional swap across
the two sides — was deleted.

**Why.** Measuring it contradicted the assumption it had been built on. The shuffle was
treated as trading balance away for variety, so it defaulted off. It does not. A court of
four has three possible splits, and the strict ranking's `1 & 3 v 2 & 4` is not the closest
of them — `1 & 4 v 2 & 3` is level on an evenly spaced ladder. Alternating between those two
**halves** the average gap between sides (2.00 to 1.01) while also improving partner
variety. It is better on both axes at once.

It also fixes a genuine degenerate case: four players on one court reach only four of the
six possible partnerships under the strict ranking, and two people never partner all
session. That is a common real setup, not an edge case.

Rest rounds and 1 v 2 turns are unaffected — seating is decided before the shuffle runs, and
bench spread is identical between the two modes in all 77 benchmark cells.

**The cross-side swap** was the only route to the third split, `1 & 2 v 3 & 4`, which stacks
the top two against the bottom two. Sweeping its probability from 0 to 1 showed it made
balance monotonically worse and, past about 0.3, variety worse too. It was paying for
nothing, so it is deleted rather than tuned down. Full sweep in
[randomization.md](randomization.md).

**Rejected.** *Leaving it off and documenting the four-player problem* — a default that is
worse for every measured configuration is not worth preserving for familiarity. *Removing
the checkbox* — an organiser running a seeded ladder has a real reason to want the strict
ranking. *Rotating all three splits deterministically* — reaches every partnership, but
spends a third of all games on the most lopsided split.

**Costs.** Sixteen players on four courts see a slightly worse worst-case partner repeat
(4.30 to 4.77): a strict ranking spreads partners systematically, a shuffle occasionally
repeats by luck. A saved config from before this change keeps whatever it had, so returning
users are not switched over behind their backs.

**Contract unchanged.** The shuffle is still seeded, so undo and re-save still reproduce a
round exactly.
