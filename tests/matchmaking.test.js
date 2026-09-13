import { Tournament, computeSeating, MIN_PLAYERS } from '../src/tournament.js';
import { TestRunner } from './tournament.test.js';

/**
 * Matchmaking review suite.
 *
 * Two kinds of test live here:
 *
 *  - **Guarantees** the draw is supposed to make, checked by brute force over a wide
 *    matrix of player/court counts rather than one hand-picked example.
 *  - **Characterisations** of known limits of the format. These pass today and are
 *    written so that fixing the limit makes them fail loudly, with a comment saying
 *    what the intended replacement assertion is.
 */

/**
 * Deterministic scorer so a whole session can be played out in a test.
 *
 * `pattern` is a list of [score1, score2] pairs. The pair used is picked from the
 * round and game index rather than a running counter, so playing six rounds in one
 * call and playing one round six times produce identical scores - which is what lets
 * the reload test compare the two.
 */
const EVEN_SPLIT = [[11, 5], [5, 11], [9, 7], [7, 9], [8, 8], [12, 4], [4, 12], [10, 6]];

function playSession(tournament, rounds, pattern = EVEN_SPLIT) {
    for (let r = 0; r < rounds; r++) {
        const roundIndex = tournament.rounds.length - 1;
        tournament.rounds[roundIndex].games.forEach((game, gameIndex) => {
            const [score1, score2] = pattern[(roundIndex * 3 + gameIndex) % pattern.length];
            tournament.updateScore(roundIndex, gameIndex, score1, score2);
        });
        if (r < rounds - 1) {
            tournament.createNextRound();
        }
    }
    return tournament;
}

function names(count, prefix = 'P') {
    return Array.from({length: count}, (_, i) => `${prefix}${i}`);
}

function spread(values) {
    return Math.max(...values) - Math.min(...values);
}

/**
 * Every structural promise a single round has to keep.
 * @returns {Array<string>} problems found, empty when the round is sound
 */
function roundProblems(tournament, roundIndex) {
    const problems = [];
    const round = tournament.rounds[roundIndex];
    const onCourt = [];

    round.games.forEach(game => {
        const players = [...game.team1, ...game.team2];
        players.forEach(player => onCourt.push(player));

        if (players.some(player => typeof player !== 'string')) {
            problems.push(`round ${roundIndex}: empty slot on ${game.court}`);
        }
        if (players.length < MIN_PLAYERS) {
            problems.push(`round ${roundIndex}: ${game.court} has ${players.length} players`);
        }
        if (game.team1.length === 0 || game.team2.length === 0) {
            problems.push(`round ${roundIndex}: ${game.court} has an empty side`);
        }
        if (game.team1.length > 2 || game.team2.length > 2) {
            problems.push(`round ${roundIndex}: ${game.court} has a side of three`);
        }
        // A court of three always records the lone player as team1, so the UI's
        // "alone" badge and getSoloCounts() only ever have to look at one side.
        if (game.team2.length === 1 && game.team1.length === 2) {
            problems.push(`round ${roundIndex}: solo player is team2 on ${game.court}`);
        }
    });

    if (new Set(onCourt).size !== onCourt.length) {
        problems.push(`round ${roundIndex}: a player is on two courts at once`);
    }
    if (new Set(round.games.map(game => game.court)).size !== round.games.length) {
        problems.push(`round ${roundIndex}: a court hosts two games at once`);
    }

    const roster = new Set(round.players);
    onCourt.forEach(player => {
        if (!roster.has(player)) {
            problems.push(`round ${roundIndex}: ${player} plays but is not on the roster`);
        }
    });

    const expected = computeSeating(round.players.length, tournament.courts.length);
    if (onCourt.length !== expected.seated) {
        problems.push(
            `round ${roundIndex}: seated ${onCourt.length}, computeSeating() says ${expected.seated}`
        );
    }

    return problems;
}

export function runMatchmakingTests() {
    const runner = new TestRunner();

    // ------------------------------------------------------------------
    // Structural guarantees
    // ------------------------------------------------------------------

    runner.test('Every draw from 3..20 players on 1..5 courts is structurally sound', () => {
        const problems = [];

        for (let playerCount = MIN_PLAYERS; playerCount <= 20; playerCount++) {
            for (let courtCount = 1; courtCount <= 5; courtCount++) {
                for (const randomize of [false, true]) {
                    const tournament = new Tournament({
                        players: names(playerCount),
                        courts: names(courtCount, 'C'),
                        pointsPerMatch: 16,
                        randomize,
                        seed: playerCount * 1000 + courtCount
                    });

                    for (let round = 0; round < 8; round++) {
                        problems.push(...roundProblems(tournament, tournament.rounds.length - 1).map(
                            problem => `${playerCount}p/${courtCount}c randomize=${randomize} ${problem}`
                        ));
                        playSession(tournament, 1);
                        tournament.createNextRound();
                    }
                }
            }
        }

        runner.assertEqual(problems.slice(0, 5), [], `${problems.length} structural problems`);
    });

    runner.test('Roster changes mid-session never corrupt a draw', () => {
        const problems = [];

        for (let trial = 0; trial < 40; trial++) {
            const tournament = new Tournament({
                players: names(4 + (trial % 9)),
                courts: names(1 + (trial % 4), 'C'),
                pointsPerMatch: 16,
                randomize: trial % 2 === 0,
                seed: trial * 7919 + 13
            });

            let added = 100;
            for (let round = 0; round < 10; round++) {
                playSession(tournament, 1);

                // Alternate between dropping someone, adding someone, and changing courts.
                const roster = [...tournament.players];
                if (round % 3 === 0 && roster.length > MIN_PLAYERS) {
                    roster.splice(round % roster.length, 1);
                } else if (round % 3 === 1) {
                    roster.push(`N${added++}`);
                }
                const courts = round % 3 === 2
                    ? names(1 + (round % 4), 'C')
                    : tournament.courts;

                tournament.applyConfig({
                    players: roster,
                    courts,
                    pointsPerMatch: tournament.pointsPerMatch,
                    randomize: tournament.randomize
                });

                tournament.createNextRound();
                problems.push(...roundProblems(tournament, tournament.rounds.length - 1).map(
                    problem => `trial ${trial} ${problem}`
                ));
            }
        }

        runner.assertEqual(problems.slice(0, 5), [], `${problems.length} problems after roster edits`);
    });

    runner.test('A saved and reloaded tournament keeps drawing the same rounds', () => {
        const build = () => new Tournament({
            players: names(11),
            courts: names(3, 'C'),
            pointsPerMatch: 16,
            randomize: true,
            seed: 5150
        });

        const live = playSession(build(), 6);

        // Round-trip through the exact shape localStorage stores.
        let reloaded = build();
        for (let round = 0; round < 6; round++) {
            playSession(reloaded, 1);
            reloaded = Tournament.fromJSON(JSON.parse(JSON.stringify(reloaded.toJSON())));
            if (round < 5) reloaded.createNextRound();
        }

        runner.assertEqual(
            reloaded.rounds.map(round => round.games),
            live.rounds.map(round => round.games),
            'Reloading between rounds must not change the draw'
        );
    });

    // ------------------------------------------------------------------
    // Long-run fairness
    // ------------------------------------------------------------------

    runner.test('Games played stay within one of each other over a long session', () => {
        const worst = [];

        for (const [playerCount, courtCount] of [[5, 1], [6, 1], [7, 1], [9, 2], [10, 2], [13, 3], [17, 4]]) {
            const tournament = new Tournament({
                players: names(playerCount),
                courts: names(courtCount, 'C'),
                pointsPerMatch: 16,
                randomize: false,
                seed: 4242
            });
            playSession(tournament, 25);

            const counts = tournament.getScheduledGameCounts();
            const actual = spread(tournament.players.map(player => counts[player]));
            if (actual > 1) {
                worst.push(`${playerCount}p/${courtCount}c spread ${actual}`);
            }
        }

        runner.assertEqual(worst, [], 'Rest rotation must keep games played within one');
    });

    /**
     * Bench and solo turns are handed out before randomization gets involved -
     * seating is decided from games played and solo counts, and the shuffle only
     * reorders players inside a court that is already chosen. These two tests pin
     * that down: the fairness bounds must hold with the shuffle on, must hold from
     * the very first rounds rather than only averaging out over a long session, and
     * must not differ between the two modes.
     */
    const FAIRNESS_GRID = [[5, 1], [6, 1], [7, 1], [9, 2], [11, 2], [6, 2], [7, 2], [9, 3], [10, 3], [13, 4], [15, 4]];
    const SESSION_LENGTHS = [2, 3, 4, 5, 6, 10, 20];

    /**
     * Worst spread seen across several draws, so the bound is not one lucky seed.
     * @returns {{bench: number, solo: number, games: number}}
     */
    function worstSpreads(playerCount, courtCount, rounds, randomize) {
        let bench = 0;
        let solo = 0;
        let games = 0;

        for (let seed = 0; seed < 12; seed++) {
            const tournament = new Tournament({
                players: names(playerCount),
                courts: names(courtCount, 'C'),
                pointsPerMatch: 16,
                randomize,
                seed: seed * 7919 + 11
            });
            // Vary the scoring pattern with the seed so the standings - and therefore
            // who is available for each court - differ from draw to draw.
            playSession(tournament, rounds, EVEN_SPLIT.slice(seed % 4).concat(EVEN_SPLIT.slice(0, seed % 4)));

            const benchCounts = {};
            tournament.players.forEach(player => benchCounts[player] = 0);
            tournament.rounds.forEach((_, roundIndex) => {
                tournament.getBenchPlayers(roundIndex).forEach(player => benchCounts[player]++);
            });

            const soloCounts = tournament.getSoloCounts();
            const gameCounts = tournament.getScheduledGameCounts();

            bench = Math.max(bench, spread(tournament.players.map(player => benchCounts[player])));
            solo = Math.max(solo, spread(tournament.players.map(player => soloCounts[player])));
            games = Math.max(games, spread(tournament.players.map(player => gameCounts[player])));
        }

        return {bench, solo, games};
    }

    runner.test('Bench and solo turns stay within bounds in both modes, short session and long', () => {
        const breaches = [];

        for (const [playerCount, courtCount] of FAIRNESS_GRID) {
            for (const rounds of SESSION_LENGTHS) {
                for (const randomize of [false, true]) {
                    const {bench, solo, games} = worstSpreads(playerCount, courtCount, rounds, randomize);
                    const where = `${playerCount}p/${courtCount}c ${rounds}r randomize=${randomize}`;

                    // Rest rounds can always be dealt out to within one of each other,
                    // however short the session, so one is a bound and not an average.
                    if (bench > 1) breaches.push(`${where}: bench spread ${bench}`);
                    if (games > 1) breaches.push(`${where}: games spread ${games}`);
                    // Solo turns cannot reach the same bound - courts are carved out of
                    // the ranking, so who is even available to take the role depends on
                    // the standings. Three is the worst seen across the grid.
                    if (solo > 3) breaches.push(`${where}: solo spread ${solo}`);
                }
            }
        }

        runner.assertEqual(breaches.slice(0, 5), [], `${breaches.length} fairness breaches`);
    });

    runner.test('Randomize does not systematically worsen bench or solo fairness', () => {
        // Randomize cannot bias seating directly - it only reorders players inside a
        // court that has already been chosen. It does move the standings, though, and
        // the standings decide who is on each court, so individual draws differ either
        // way. What has to hold is that neither mode is worse on average.
        const totals = {false: {bench: 0, solo: 0}, true: {bench: 0, solo: 0}};
        let cells = 0;

        for (const [playerCount, courtCount] of FAIRNESS_GRID) {
            for (const rounds of SESSION_LENGTHS) {
                cells++;
                for (const randomize of [false, true]) {
                    const {bench, solo} = worstSpreads(playerCount, courtCount, rounds, randomize);
                    totals[randomize].bench += bench;
                    totals[randomize].solo += solo;
                }
            }
        }

        const mean = (mode, metric) => totals[mode][metric] / cells;

        runner.assertTrue(
            mean(true, 'bench') <= mean(false, 'bench'),
            `Randomize worsened mean bench spread: ${mean(false, 'bench')} -> ${mean(true, 'bench')}`
        );
        runner.assertTrue(
            mean(true, 'solo') <= mean(false, 'solo') + 0.25,
            `Randomize worsened mean solo spread: ${mean(false, 'solo')} -> ${mean(true, 'solo')}`
        );
    });

    runner.test('Nobody is benched twice in a row while somebody else has rested less', () => {
        const problems = [];

        for (const [playerCount, courtCount] of [[5, 1], [6, 1], [7, 1], [9, 2], [11, 2]]) {
            const tournament = new Tournament({
                players: names(playerCount),
                courts: names(courtCount, 'C'),
                pointsPerMatch: 16,
                randomize: false,
                seed: 31337
            });
            playSession(tournament, 20);

            const restCounts = {};
            tournament.players.forEach(player => restCounts[player] = 0);

            tournament.rounds.forEach((round, roundIndex) => {
                const benched = tournament.getBenchPlayers(roundIndex);
                benched.forEach(player => {
                    // Anyone resting must be at the top of the rest ladder, never
                    // sitting out while somebody who has rested less is on court.
                    const fewestRests = Math.min(...tournament.players.map(other => restCounts[other]));
                    if (restCounts[player] > fewestRests + 1) {
                        problems.push(
                            `${playerCount}p/${courtCount}c round ${roundIndex}: ` +
                            `${player} rests again on ${restCounts[player]} rests, minimum is ${fewestRests}`
                        );
                    }
                });
                benched.forEach(player => restCounts[player]++);
            });
        }

        runner.assertEqual(problems.slice(0, 5), [], `${problems.length} unfair rest rounds`);
    });

    // ------------------------------------------------------------------
    // Score handling
    // ------------------------------------------------------------------

    runner.test('updateScore() refuses anything the leaderboard could not add', () => {
        const tournament = new Tournament({
            players: names(4), courts: ['C0'], pointsPerMatch: 16, randomize: false, seed: 1
        });

        [NaN, undefined, null, '12', {}, Infinity, -Infinity, 7.5]
            .forEach(bad => {
                runner.assertThrows(
                    () => tournament.updateScore(0, 0, bad, 4),
                    `updateScore() must reject ${String(bad)} as score1`
                );
                runner.assertThrows(
                    () => tournament.updateScore(0, 0, 4, bad),
                    `updateScore() must reject ${String(bad)} as score2`
                );
            });

        runner.assertThrows(
            () => tournament.updateScore(0, 0, -1, 17),
            'updateScore() must reject a negative score'
        );

        runner.assertEqual(
            [tournament.rounds[0].games[0].score1, tournament.rounds[0].games[0].score2],
            [null, null],
            'A rejected score must not be written to the round'
        );

        // A total that misses the target is still accepted - design decision 8.
        tournament.updateScore(0, 0, 5, 3);
        runner.assertEqual(
            [tournament.rounds[0].games[0].score1, tournament.rounds[0].games[0].score2],
            [5, 3],
            'A short game is recorded, not refused'
        );
    });

    runner.test('A round is complete only when every score can be counted', () => {
        const tournament = new Tournament({
            players: names(4), courts: ['C0'], pointsPerMatch: 16, randomize: false, seed: 1
        });

        runner.assertFalse(tournament.isRoundComplete(0), 'An unscored round is not complete');

        // Bypass updateScore the way a corrupt localStorage payload would.
        tournament.rounds[0].games[0].score1 = undefined;
        tournament.rounds[0].games[0].score2 = 16;
        runner.assertFalse(
            tournament.isRoundComplete(0),
            'undefined is not a score, even though it is not null'
        );

        tournament.rounds[0].games[0].score1 = NaN;
        runner.assertFalse(tournament.isRoundComplete(0), 'NaN is not a score');

        tournament.rounds[0].games[0].score1 = 0;
        runner.assertTrue(tournament.isRoundComplete(0), 'A zero completes the round');
    });

    runner.test('Points survive a player being removed mid-session', () => {
        const tournament = new Tournament({
            players: ['Ana', 'Ben', 'Cleo', 'Dan', 'Eve'],
            courts: ['C0'], pointsPerMatch: 16, randomize: false, seed: 77
        });
        playSession(tournament, 3);

        const before = tournament.getLeaderboard()
            .reduce((total, entry) => total + entry.points, 0);

        tournament.applyConfig({
            players: ['Ben', 'Cleo', 'Dan', 'Eve'],
            courts: ['C0'], pointsPerMatch: 16, randomize: false
        });

        const after = tournament.getLeaderboard();
        runner.assertEqual(
            after.reduce((total, entry) => total + entry.points, 0),
            before,
            'Removing a player must not remove points from the table'
        );
        runner.assertFalse(
            after.find(entry => entry.name === 'Ana').active,
            'A departed player is kept but marked inactive'
        );
    });

    // ------------------------------------------------------------------
    // Characterised limits - these document what the format does NOT do
    // ------------------------------------------------------------------

    runner.test('LIMIT: total-points ranking rewards whoever got the extra game', () => {
        // With 5 players on 1 court somebody rests every round, so after an odd
        // number of rounds the field is split between N and N-1 games played.
        // The leaderboard ranks on total points and only breaks *exact* ties on
        // games played, so the players with the extra game start roughly half a
        // match ahead of the rest through no merit of their own.
        //
        // If ranking ever moves to points-per-game, this test should start failing
        // and be replaced by an assertion that the two groups are comparable.
        const tournament = new Tournament({
            players: names(5), courts: ['C0'], pointsPerMatch: 16, randomize: false, seed: 2024
        });
        // Every game a dead-even 8-8, so points differ only through games played.
        playSession(tournament, 9, [[8, 8]]);

        const leaderboard = tournament.getLeaderboard();
        const mostGames = Math.max(...leaderboard.map(entry => entry.gamesPlayed));
        const fewestGames = Math.min(...leaderboard.map(entry => entry.gamesPlayed));

        runner.assertEqual(mostGames - fewestGames, 1, 'Games played differ by exactly one');

        const topOfTable = leaderboard[0];
        runner.assertEqual(
            topOfTable.gamesPlayed,
            mostGames,
            'Identical per-game performance still puts an extra-game player top'
        );
        runner.assertTrue(
            leaderboard.find(entry => entry.gamesPlayed === mostGames).points -
            leaderboard.find(entry => entry.gamesPlayed === fewestGames).points === 8,
            'The unearned head start is half a match of points'
        );
    });

    runner.test('LIMIT: with no scores separating players the draw never changes', () => {
        // Used as a pure draw generator - rounds saved without meaningful scores -
        // every player stays on zero, the leaderboard falls back to its alphabetical
        // tie-break, and that tie-break does not rotate the way rest and solo do.
        // The whole session is then one round repeated.
        const draw = randomize => {
            const tournament = new Tournament({
                players: ['Ana', 'Ben', 'Cleo', 'Dan', 'Eve', 'Finn', 'Gus', 'Hana'],
                courts: ['C0', 'C1'], pointsPerMatch: 16, randomize, seed: 8675309
            });
            playSession(tournament, 6, [[0, 0]]);
            return tournament.rounds.map(round =>
                round.games.map(game => `${game.team1}|${game.team2}`).join(' ')
            );
        };

        runner.assertEqual(
            new Set(draw(false)).size,
            1,
            'Without randomize, an unscored session repeats a single round'
        );
        runner.assertTrue(
            new Set(draw(true)).size > 1,
            'Randomize is the existing escape hatch and must keep working'
        );
    });

    runner.test('LIMIT: four players on one court never meet two of the six pairings', () => {
        // A court of four is always ranks 1&3 against 2&4, so the partition that
        // puts the top two together can only ever appear via randomize. With four
        // players that is the whole tournament, and two pairings go unplayed.
        const partnerships = randomize => {
            const tournament = new Tournament({
                players: ['Ana', 'Ben', 'Cleo', 'Dan'],
                courts: ['C0'], pointsPerMatch: 16, randomize, seed: 31337
            });
            playSession(tournament, 20);

            const pairs = new Set();
            tournament.rounds.forEach(round => round.games.forEach(game => {
                [game.team1, game.team2].forEach(team => pairs.add([...team].sort().join('+')));
            }));
            return pairs;
        };

        runner.assertEqual(
            partnerships(false).size,
            4,
            'Strict ranking reaches only four of the six possible partnerships'
        );
        runner.assertEqual(
            partnerships(true).size,
            6,
            'Randomize reaches all six - it is the workaround for a four-player session'
        );
    });

    return runner;
}
