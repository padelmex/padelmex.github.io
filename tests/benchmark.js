/**
 * Pairing benchmark.
 *
 * `make bench` — prints the tables in docs/randomization.md and the scorecard
 * described in docs/pairing-benchmarks.md.
 *
 * This is not a test. Tests assert bounds and fail; this measures quality and
 * prints numbers for a human to judge. Run it after changing anything about how
 * rounds are drawn, and paste the scorecard into the pull request.
 */

import {Tournament} from '../src/tournament.js';

const TARGET = 16;
const ROUNDS = 12;
const TRIALS = 300;

/**
 * The configurations worth caring about: the ones real sessions actually turn up as.
 */
const GRID = [[4, 1], [5, 1], [6, 2], [7, 2], [8, 2], [10, 3], [12, 3], [16, 4]];

/**
 * Session lengths to check fairness bounds over. Two rounds is the shortest thing
 * anyone would call a tournament; twenty is a long evening.
 */
const SESSION_LENGTHS = [2, 3, 4, 5, 6, 10, 20];

/**
 * Mulberry32, standalone so the benchmark's own noise never touches the draw's RNG.
 */
function rngFrom(seed) {
    let state = seed >>> 0;
    return () => {
        let t = state += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

/**
 * Play a game between two sides of known strength.
 *
 * Points are split in proportion to team strength, plus noise. A player alone
 * against two covers the whole court, so their effective strength is discounted.
 * The discount is a guess; nothing in the scorecard should hinge on its exact value.
 */
const SOLO_HANDICAP = 0.72;
const NOISE = 0.30;

function playGame(game, skills, random) {
    const strength = team =>
        team.reduce((total, player) => total + skills[player], 0) / team.length
        * (team.length === 1 ? SOLO_HANDICAP : 1);

    const s1 = strength(game.team1);
    const s2 = strength(game.team2);
    const share = Math.max(0.05, Math.min(0.95,
        s1 / (s1 + s2) + (random() - 0.5) * NOISE));
    const score1 = Math.max(0, Math.min(TARGET, Math.round(TARGET * share)));
    return [score1, TARGET - score1];
}

/**
 * Play one whole session and return the raw material for every metric.
 */
function session(playerCount, courtCount, rounds, randomize, trial) {
    const players = Array.from({length: playerCount}, (_, i) => `P${i}`);
    // An evenly spaced ladder: rank gaps are 1, so a team-strength difference reads
    // directly as "how many ranks apart are these two sides".
    const skills = {};
    players.forEach((player, i) => skills[player] = playerCount - i);

    const random = rngFrom(trial * 7919 + 11);
    const tournament = new Tournament({
        players,
        courts: Array.from({length: courtCount}, (_, i) => `C${i}`),
        pointsPerMatch: TARGET,
        randomize,
        seed: trial * 104729 + 5
    });

    const partners = {};
    const gameShapes = {};
    const gaps = [];
    const margins = [];

    for (let round = 0; round < rounds; round++) {
        const roundIndex = tournament.rounds.length - 1;

        tournament.rounds[roundIndex].games.forEach((game, gameIndex) => {
            const shape = `[${[...game.team1].sort()}]v[${[...game.team2].sort()}]`;
            gameShapes[shape] = (gameShapes[shape] || 0) + 1;

            [game.team1, game.team2].forEach(team => {
                if (team.length === 2) {
                    const pair = [...team].sort().join('+');
                    partners[pair] = (partners[pair] || 0) + 1;
                }
            });

            if (game.team1.length === 2 && game.team2.length === 2) {
                const total = team => team.reduce((sum, player) => sum + skills[player], 0);
                gaps.push(Math.abs(total(game.team1) - total(game.team2)));
            }

            const [score1, score2] = playGame(game, skills, random);
            margins.push(Math.abs(score1 - score2));
            tournament.updateScore(roundIndex, gameIndex, score1, score2);
        });

        if (round < rounds - 1) {
            tournament.createNextRound();
        }
    }

    const benchCounts = {};
    players.forEach(player => benchCounts[player] = 0);
    tournament.rounds.forEach((_, roundIndex) => {
        tournament.getBenchPlayers(roundIndex).forEach(player => benchCounts[player]++);
    });

    const soloCounts = tournament.getSoloCounts();
    const gameCounts = tournament.getScheduledGameCounts();
    const spread = values => Math.max(...values) - Math.min(...values);

    return {
        coverage: Object.keys(partners).length / (playerCount * (playerCount - 1) / 2),
        worstPartner: Math.max(...Object.values(partners), 0),
        worstGame: Math.max(...Object.values(gameShapes)),
        gap: gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null,
        margin: margins.reduce((a, b) => a + b, 0) / margins.length,
        benchSpread: spread(players.map(player => benchCounts[player])),
        soloSpread: spread(players.map(player => soloCounts[player])),
        gamesSpread: spread(players.map(player => gameCounts[player]))
    };
}

function average(playerCount, courtCount, rounds, randomize, trials) {
    const totals = {};
    let gapCells = 0;

    for (let trial = 0; trial < trials; trial++) {
        const result = session(playerCount, courtCount, rounds, randomize, trial);
        for (const key in result) {
            if (result[key] === null) continue;
            if (key === 'gap') gapCells++;
            totals[key] = (totals[key] || 0) + result[key];
        }
    }

    const out = {};
    for (const key in totals) {
        out[key] = totals[key] / (key === 'gap' ? gapCells : trials);
    }
    return out;
}

function worstSpreads(playerCount, courtCount, rounds, randomize, trials = 12) {
    let bench = 0;
    let solo = 0;
    let games = 0;

    for (let trial = 0; trial < trials; trial++) {
        const result = session(playerCount, courtCount, rounds, randomize, trial);
        bench = Math.max(bench, result.benchSpread);
        solo = Math.max(solo, result.soloSpread);
        games = Math.max(games, result.gamesSpread);
    }

    return {bench, solo, games};
}

// ---------------------------------------------------------------- reporting

const pct = value => `${(100 * value).toFixed(0)}%`;
const num = (value, digits = 2) => value === undefined ? '   -' : value.toFixed(digits);

console.log(`\nPairing benchmark — ${ROUNDS} rounds, ${TRIALS} sessions per cell, ${TARGET} points per match.`);
console.log('Skills are an even ladder, so a gap of 1 means the two sides are one rank apart.\n');

console.log('VARIETY AND BALANCE                     randomize off  ->  randomize on');
console.log('-'.repeat(78));
console.log('config      metric                          off        on      verdict');
for (const [playerCount, courtCount] of GRID) {
    const off = average(playerCount, courtCount, ROUNDS, false, TRIALS);
    const on = average(playerCount, courtCount, ROUNDS, true, TRIALS);

    const rows = [
        ['partnership coverage', off.coverage, on.coverage, 'up', pct],
        ['worst partner repeat', off.worstPartner, on.worstPartner, 'down', v => num(v)],
        ['worst game repeat', off.worstGame, on.worstGame, 'down', v => num(v)],
        ['gap between sides', off.gap, on.gap, 'down', v => num(v, 3)],
        ['mean score margin', off.margin, on.margin, 'down', v => num(v)]
    ];

    console.log(`${playerCount}p/${courtCount}c`);
    for (const [label, before, after, want, format] of rows) {
        if (before === undefined || after === undefined) continue;
        const better = want === 'up' ? after > before + 1e-9 : after < before - 1e-9;
        const same = Math.abs(after - before) <= 1e-9;
        console.log(
            `            ${label.padEnd(24)} ${format(before).padStart(7)}  ${format(after).padStart(8)}` +
            `      ${same ? '=' : better ? 'better' : 'worse'}`
        );
    }
}

console.log('\n\nFAIRNESS BOUNDS — worst spread over 12 draws, every session length');
console.log('Rest and games played must never exceed 1. Solo turns must never exceed 3.');
console.log('-'.repeat(78));
console.log('config   mode   ' + SESSION_LENGTHS.map(r => `${r}r`.padStart(6)).join(''));

let breaches = 0;
for (const [playerCount, courtCount] of [[5, 1], [6, 1], [7, 1], [9, 2], [11, 2], [6, 2], [7, 2], [9, 3], [10, 3], [13, 4], [15, 4]]) {
    for (const randomize of [false, true]) {
        const cells = SESSION_LENGTHS.map(rounds => {
            const {bench, solo, games} = worstSpreads(playerCount, courtCount, rounds, randomize);
            if (bench > 1 || games > 1 || solo > 3) breaches++;
            return `${bench}/${solo}`.padStart(6);
        });
        console.log(
            `${`${playerCount}p/${courtCount}c`.padEnd(9)}${(randomize ? 'on' : 'off').padEnd(7)}${cells.join('')}`
        );
    }
}

console.log('\nCells are bench-spread/solo-spread.');
console.log(breaches === 0
    ? 'All fairness bounds held.'
    : `${breaches} cells breached a bound — see docs/pairing-benchmarks.md.`);
console.log('');
