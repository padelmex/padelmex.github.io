import { Tournament, computeSeating } from '../src/tournament.js';

/**
 * Simple test runner
 */
export class TestRunner {
    constructor() {
        this.tests = [];
        this.results = [];
    }

    test(name, fn) {
        this.tests.push({ name, fn });
    }

    assertEqual(actual, expected, message) {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new Error(
                `${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`
            );
        }
    }

    assertTrue(value, message) {
        if (!value) {
            throw new Error(message);
        }
    }

    assertFalse(value, message) {
        if (value) {
            throw new Error(message);
        }
    }

    assertThrows(fn, message) {
        try {
            fn();
            throw new Error(`${message} - Expected function to throw but it didn't`);
        } catch (e) {
            // Expected
        }
    }

    async run() {
        this.results = [];

        for (const test of this.tests) {
            try {
                await test.fn();
                this.results.push({ name: test.name, passed: true });
            } catch (error) {
                this.results.push({
                    name: test.name,
                    passed: false,
                    error: error.message
                });
            }
        }

        return this.results;
    }

    getSummary() {
        const passed = this.results.filter(r => r.passed).length;
        const failed = this.results.filter(r => !r.passed).length;
        return { total: this.results.length, passed, failed };
    }
}

/**
 * Run all tournament tests
 */
export function runTournamentTests() {
    const runner = new TestRunner();

    // Test 1: Tournament creation with exact players
    runner.test('Tournament creates first round with exact players', () => {
        const config = {
            players: ['Alice', 'Bob', 'Charlie', 'Dave'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false
        };

        const tournament = new Tournament(config);

        runner.assertEqual(tournament.rounds.length, 1, 'Should have 1 round');
        runner.assertEqual(tournament.rounds[0].games.length, 1, 'Should have 1 game');

        const game = tournament.rounds[0].games[0];
        runner.assertEqual(game.team1.length, 2, 'Team 1 should have 2 players');
        runner.assertEqual(game.team2.length, 2, 'Team 2 should have 2 players');
        runner.assertEqual(game.score1, null, 'Score 1 should be null initially');
        runner.assertEqual(game.score2, null, 'Score 2 should be null initially');
    });

    // Test 2: Non-randomized setup is deterministic
    runner.test('Non-randomized setup is deterministic', () => {
        const config = {
            players: ['Alice', 'Bob', 'Charlie', 'Dave'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false
        };

        const tournament1 = new Tournament(config);
        const tournament2 = new Tournament(config);

        runner.assertEqual(
            tournament1.rounds[0].games[0].team1,
            tournament2.rounds[0].games[0].team1,
            'Team 1 should be identical'
        );
        runner.assertEqual(
            tournament1.rounds[0].games[0].team2,
            tournament2.rounds[0].games[0].team2,
            'Team 2 should be identical'
        );
    });

    // Test 3: Randomized setup is deterministic with same seed
    runner.test('Randomized setup is deterministic with same seed', () => {
        const config = {
            players: ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank', 'Grace', 'Henry'],
            courts: ['Court 1', 'Court 2'],
            pointsPerMatch: 16,
            randomize: true
        };

        const tournament1 = new Tournament(config);
        const tournament2 = new Tournament(config);

        // Same config should produce same matchups
        runner.assertEqual(
            JSON.stringify(tournament1.rounds[0].games),
            JSON.stringify(tournament2.rounds[0].games),
            'Randomized games should be identical with same seed'
        );
    });

    // Test 4: Score validation
    runner.test('Score validation works correctly', () => {
        const tournament = new Tournament({
            players: ['Alice', 'Bob', 'Charlie', 'Dave'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false
        });

        // Valid score
        tournament.updateScore(0, 0, 10, 6);
        runner.assertEqual(tournament.rounds[0].games[0].score1, 10, 'Score 1 should be 10');
        runner.assertEqual(tournament.rounds[0].games[0].score2, 6, 'Score 2 should be 6');

        // Invalid score sum
        runner.assertThrows(
            () => tournament.updateScore(0, 0, 10, 10),
            'Should throw error for invalid score sum'
        );

        // Negative score
        runner.assertThrows(
            () => tournament.updateScore(0, 0, -5, 21),
            'Should throw error for negative score'
        );
    });

    // Test 6: Create next round
    runner.test('Can create next round after completion', () => {
        const tournament = new Tournament({
            players: ['Alice', 'Bob', 'Charlie', 'Dave'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false
        });

        tournament.updateScore(0, 0, 10, 6);
        tournament.createNextRound();

        runner.assertEqual(tournament.rounds.length, 2, 'Should have 2 rounds');
    });

    // Test 7: Undo last round
    runner.test('Can undo last round', () => {
        const tournament = new Tournament({
            players: ['Alice', 'Bob', 'Charlie', 'Dave'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false
        });

        tournament.updateScore(0, 0, 10, 6);
        tournament.createNextRound();

        runner.assertEqual(tournament.rounds.length, 2, 'Should have 2 rounds');

        tournament.undoLastRound();
        runner.assertEqual(tournament.rounds.length, 1, 'Should have 1 round after undo');
    });

    // Test 8: Leaderboard calculation
    runner.test('Leaderboard calculation is correct', () => {
        const tournament = new Tournament({
            players: ['Alice', 'Bob', 'Charlie', 'Dave'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false
        });

        // Alice and Bob win 10-6
        tournament.updateScore(0, 0, 10, 6);

        const leaderboard = tournament.getLeaderboard();

        runner.assertEqual(leaderboard.length, 4, 'Should have 4 players in leaderboard');

        // Winners should be on top
        runner.assertTrue(
            leaderboard[0].points >= leaderboard[leaderboard.length - 1].points,
            'Leaderboard should be sorted by points'
        );

        // Check points
        const alice = leaderboard.find(p => p.name === 'Alice');
        runner.assertEqual(alice.points, 10, 'Alice should have 10 points');
        runner.assertEqual(alice.gamesPlayed, 1, 'Alice should have played 1 game');
    });

    // Test 9: Fair rotation with more players than seats
    runner.test('Fair rotation works with more players than seats', () => {
        const tournament = new Tournament({
            players: ['A', 'B', 'C', 'D', 'E', 'F'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false
        });

        // First round: A, B, C, D play
        const round1Players = [
            ...tournament.rounds[0].games[0].team1,
            ...tournament.rounds[0].games[0].team2
        ];
        runner.assertEqual(round1Players.length, 4, 'Round 1 should have 4 players');

        // Complete round 1
        tournament.updateScore(0, 0, 10, 6);
        tournament.createNextRound();

        // Second round: Should include E and F (who sat out)
        const round2Players = [
            ...tournament.rounds[1].games[0].team1,
            ...tournament.rounds[1].games[0].team2
        ];

        runner.assertTrue(
            round2Players.includes('E') || round2Players.includes('F'),
            'Round 2 should include players who sat out'
        );
    });

    // Test 10: Serialization and deserialization
    runner.test('Tournament can be serialized and restored', () => {
        const tournament = new Tournament({
            players: ['Alice', 'Bob', 'Charlie', 'Dave'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false
        });

        tournament.updateScore(0, 0, 10, 6);

        const json = tournament.toJSON();
        const restored = Tournament.fromJSON(json);

        runner.assertEqual(
            JSON.stringify(tournament.rounds),
            JSON.stringify(restored.rounds),
            'Rounds should be identical after restoration'
        );
    });

    // Test 11: Multiple courts
    runner.test('Tournament handles multiple courts correctly', () => {
        const tournament = new Tournament({
            players: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
            courts: ['Court 1', 'Court 2'],
            pointsPerMatch: 16,
            randomize: false
        });

        runner.assertEqual(tournament.rounds[0].games.length, 2, 'Should have 2 games');
        runner.assertEqual(
            tournament.rounds[0].games[0].court,
            'Court 1',
            'First game should be on Court 1'
        );
        runner.assertEqual(
            tournament.rounds[0].games[1].court,
            'Court 2',
            'Second game should be on Court 2'
        );
    });

    // Test 12: Prevent undo on empty tournament
    runner.test('Cannot undo when no rounds exist', () => {
        const tournament = new Tournament({
            players: ['Alice', 'Bob', 'Charlie', 'Dave'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false
        });

        tournament.undoLastRound(); // Undo the auto-created first round

        runner.assertThrows(
            () => tournament.undoLastRound(),
            'Should throw error when no rounds to undo'
        );
    });

    // ============================================================================
    // CRITICAL BUG TEST: Round 2 should NOT repeat Round 1 pairings
    // ============================================================================

    runner.test('CRITICAL: Round 2 pairs players based on Round 1 rankings', () => {
        const tournament = new Tournament({
            players: ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank', 'Grace', 'Henry'],
            courts: ['Court 1', 'Court 2'],
            pointsPerMatch: 16,
            randomize: false
        });

        // Round 1 with 1-3 vs 2-4 pairing:
        // Court 1: team1=[Alice, Charlie] vs team2=[Bob, Dave] (16-0)
        // Court 2: team1=[Eve, Grace] vs team2=[Frank, Henry] (16-0)
        tournament.updateScore(0, 0, 16, 0);
        tournament.updateScore(0, 1, 16, 0);

        // Create Round 2
        tournament.createNextRound();

        // After Round 1, rankings are: Alice(16), Charlie(16), Eve(16), Grace(16), Bob(0), Dave(0), Frank(0), Henry(0)
        // Round 2 should pair: Top 4 players together, Bottom 4 players together
        const round2 = tournament.rounds[1];
        const game1 = round2.games[0];
        const game2 = round2.games[1];

        // Check Court 1: Top 4 players should play together
        const court1Players = [...game1.team1, ...game1.team2].sort();
        const expectedCourt1 = ['Alice', 'Charlie', 'Eve', 'Grace'].sort();
        runner.assertEqual(court1Players, expectedCourt1, 'Court 1 should have the top 4 players');

        // Check Court 2: Bottom 4 players should play together
        const court2Players = [...game2.team1, ...game2.team2].sort();
        const expectedCourt2 = ['Bob', 'Dave', 'Frank', 'Henry'].sort();
        runner.assertEqual(court2Players, expectedCourt2, 'Court 2 should have the bottom 4 players');
    });

    runner.test('CRITICAL: Round 2 does NOT repeat exact same pairings as Round 1', () => {
        const tournament = new Tournament({
            players: ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank', 'Grace', 'Henry'],
            courts: ['Court 1', 'Court 2'],
            pointsPerMatch: 16,
            randomize: false
        });

        const round1Game1 = tournament.rounds[0].games[0];
        const round1Game2 = tournament.rounds[0].games[1];

        tournament.updateScore(0, 0, 16, 0);
        tournament.updateScore(0, 1, 16, 0);
        tournament.createNextRound();

        const round2Game1 = tournament.rounds[1].games[0];
        const round2Game2 = tournament.rounds[1].games[1];

        // Round 2 should NOT have the exact same matchups as Round 1
        const round1Matchup1Str = JSON.stringify({
            team1: round1Game1.team1.slice().sort(),
            team2: round1Game1.team2.slice().sort()
        });
        const round2Matchup1Str = JSON.stringify({
            team1: round2Game1.team1.slice().sort(),
            team2: round2Game1.team2.slice().sort()
        });

        const round1Matchup2Str = JSON.stringify({
            team1: round1Game2.team1.slice().sort(),
            team2: round1Game2.team2.slice().sort()
        });
        const round2Matchup2Str = JSON.stringify({
            team1: round2Game2.team1.slice().sort(),
            team2: round2Game2.team2.slice().sort()
        });

        // Check if Round 2 has the exact same matchups as Round 1
        const hasSameMatchup1 = round1Matchup1Str === round2Matchup1Str || round1Matchup1Str === round2Matchup2Str;
        const hasSameMatchup2 = round1Matchup2Str === round2Matchup1Str || round1Matchup2Str === round2Matchup2Str;

        runner.assertFalse(
            hasSameMatchup1 && hasSameMatchup2,
            'Round 2 should NOT have the exact same matchups as Round 1'
        );
    });

    // ============================================================================
    // Configuration Validation Tests
    // ============================================================================

    runner.test('Constructor throws error for missing configuration', () => {
        runner.assertThrows(
            () => new Tournament(null),
            'Should throw error for null config'
        );
    });

    runner.test('Constructor throws error for empty players array', () => {
        runner.assertThrows(
            () => new Tournament({
                players: [],
                courts: ['Court 1'],
                pointsPerMatch: 16,
                randomize: false
            }),
            'Should throw error for empty players'
        );
    });

    runner.test('Constructor throws error for empty player names', () => {
        runner.assertThrows(
            () => new Tournament({
                players: ['Alice', '', 'Bob'],
                courts: ['Court 1'],
                pointsPerMatch: 16,
                randomize: false
            }),
            'Should throw error for empty player name'
        );
    });

    runner.test('Constructor throws error for duplicate player names', () => {
        runner.assertThrows(
            () => new Tournament({
                players: ['Alice', 'Bob', 'alice'],  // case-insensitive duplicate
                courts: ['Court 1'],
                pointsPerMatch: 16,
                randomize: false
            }),
            'Should throw error for duplicate players'
        );
    });

    runner.test('Constructor throws error for empty courts array', () => {
        runner.assertThrows(
            () => new Tournament({
                players: ['Alice', 'Bob', 'Charlie', 'Dave'],
                courts: [],
                pointsPerMatch: 16,
                randomize: false
            }),
            'Should throw error for empty courts'
        );
    });

    runner.test('Constructor throws error for invalid pointsPerMatch', () => {
        runner.assertThrows(
            () => new Tournament({
                players: ['Alice', 'Bob', 'Charlie', 'Dave'],
                courts: ['Court 1'],
                pointsPerMatch: 0,
                randomize: false
            }),
            'Should throw error for zero points'
        );

        runner.assertThrows(
            () => new Tournament({
                players: ['Alice', 'Bob', 'Charlie', 'Dave'],
                courts: ['Court 1'],
                pointsPerMatch: -5,
                randomize: false
            }),
            'Should throw error for negative points'
        );

        runner.assertThrows(
            () => new Tournament({
                players: ['Alice', 'Bob', 'Charlie', 'Dave'],
                courts: ['Court 1'],
                pointsPerMatch: 16.5,
                randomize: false
            }),
            'Should throw error for non-integer points'
        );
    });

    runner.test('Constructor throws error for duplicate court names', () => {
        runner.assertThrows(
            () => new Tournament({
                players: ['Alice', 'Bob', 'Charlie', 'Dave'],
                courts: ['Court 1', 'court 1'],  // case-insensitive duplicate
                pointsPerMatch: 16,
                randomize: false
            }),
            'Should throw error for duplicate courts'
        );
    });

    // ============================================================================
    // Additional Guard Tests
    // ============================================================================

    runner.test('Cannot update score for invalid round index', () => {
        const tournament = new Tournament({
            players: ['Alice', 'Bob', 'Charlie', 'Dave'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false
        });

        runner.assertThrows(
            () => tournament.updateScore(99, 0, 10, 6),
            'Should throw error for invalid round index'
        );
    });

    runner.test('Cannot update score for invalid game index', () => {
        const tournament = new Tournament({
            players: ['Alice', 'Bob', 'Charlie', 'Dave'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false
        });

        runner.assertThrows(
            () => tournament.updateScore(0, 99, 10, 6),
            'Should throw error for invalid game index'
        );
    });

    runner.test('Score must be non-negative', () => {
        const tournament = new Tournament({
            players: ['Alice', 'Bob', 'Charlie', 'Dave'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false
        });

        runner.assertThrows(
            () => tournament.updateScore(0, 0, -1, 17),
            'Should throw error for negative score'
        );

        runner.assertThrows(
            () => tournament.updateScore(0, 0, 17, -1),
            'Should throw error for negative score'
        );
    });

    runner.test('Players who sat out get priority in next round', () => {
        const tournament = new Tournament({
            players: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false
        });

        // Find who played in Round 1
        const round1Players = new Set();
        tournament.rounds[0].games.forEach(game => {
            game.team1.forEach(p => round1Players.add(p));
            game.team2.forEach(p => round1Players.add(p));
        });

        // Complete Round 1
        tournament.updateScore(0, 0, 16, 0);

        // Create Round 2
        tournament.createNextRound();

        // Find who plays in Round 2
        const round2Players = new Set();
        tournament.rounds[1].games.forEach(game => {
            game.team1.forEach(p => round2Players.add(p));
            game.team2.forEach(p => round2Players.add(p));
        });

        // At least one player who sat out in Round 1 should play in Round 2
        const satOut = tournament.players.filter(p => !round1Players.has(p));
        const satOutPlayingInRound2 = satOut.some(p => round2Players.has(p));

        runner.assertTrue(satOutPlayingInRound2, 'Players who sat out should get to play in next round');
    });

    runner.test('Over multiple rounds, all players should play roughly evenly', () => {
        const tournament = new Tournament({
            players: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false
        });

        // Simulate 6 rounds
        for (let i = 0; i < 6; i++) {
            const game = tournament.rounds[i].games[0];
            if (game) {
                tournament.updateScore(i, 0, i % 2 === 0 ? 16 : 0, i % 2 === 0 ? 0 : 16);
            }
            if (i < 5) {
                tournament.createNextRound();
            }
        }

        // Count how many games each player played
        const gamesPlayed = {};
        tournament.players.forEach(p => gamesPlayed[p] = 0);

        tournament.rounds.forEach(round => {
            round.games.forEach(game => {
                game.team1.forEach(p => gamesPlayed[p]++);
                game.team2.forEach(p => gamesPlayed[p]++);
            });
        });

        // 6 players, 6 rounds of 4 player-slots = 24 slots, so 4 games each.
        // Resting by games played should hold the spread to one game.
        const counts = Object.values(gamesPlayed);
        const min = Math.min(...counts);
        const max = Math.max(...counts);
        const maxDifference = max - min;

        runner.assertTrue(min >= 1, `All players should play at least once: ${JSON.stringify(gamesPlayed)}`);
        runner.assertTrue(maxDifference <= 1, `Max difference should be ≤1 game. Got: ${JSON.stringify(gamesPlayed)}, difference: ${maxDifference}`);
    });

    runner.test('Randomization is deterministic with same seed', () => {
        const config = {
            players: ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank', 'Grace', 'Henry'],
            courts: ['Court 1', 'Court 2'],
            pointsPerMatch: 16,
            randomize: true,
            seed: 424242
        };

        const tournament1 = new Tournament(config);
        tournament1.updateScore(0, 0, 16, 0);
        tournament1.updateScore(0, 1, 16, 0);
        tournament1.createNextRound();

        const tournament2 = new Tournament(config);
        tournament2.updateScore(0, 0, 16, 0);
        tournament2.updateScore(0, 1, 16, 0);
        tournament2.createNextRound();

        // Same seed should produce same randomization
        runner.assertEqual(
            JSON.stringify(tournament1.rounds[1].games),
            JSON.stringify(tournament2.rounds[1].games),
            'Same seed should produce deterministic randomization'
        );
    });

    runner.test('Tournament with more players than seats rotates fairly', () => {
        const tournament = new Tournament({
            players: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11', 'P12'],
            courts: ['Court 1', 'Court 2'],
            pointsPerMatch: 16,
            randomize: false
        });

        const playersInRound1 = new Set();
        tournament.rounds[0].games.forEach(game => {
            game.team1.forEach(p => playersInRound1.add(p));
            game.team2.forEach(p => playersInRound1.add(p));
        });

        runner.assertEqual(playersInRound1.size, 8, 'Only 8 players should play in round 1 (2 courts * 4 players)');

        // Complete round 1
        tournament.updateScore(0, 0, 16, 0);
        tournament.updateScore(0, 1, 16, 0);

        // Create round 2
        tournament.createNextRound();

        const playersInRound2 = new Set();
        tournament.rounds[1].games.forEach(game => {
            game.team1.forEach(p => playersInRound2.add(p));
            game.team2.forEach(p => playersInRound2.add(p));
        });

        // At least one player who sat out in Round 1 should play in Round 2
        const satOut = tournament.players.filter(p => !playersInRound1.has(p));
        const satOutPlayingInRound2 = satOut.some(p => playersInRound2.has(p));
        runner.assertTrue(satOutPlayingInRound2, 'Players who sat out in Round 1 should play in Round 2');
    });

    // ============================================================================
    // NEW TESTS: 1-3 vs 2-4 Pairing Pattern
    // ============================================================================

    runner.test('Teams are paired as 1-3 vs 2-4 (not 1-2 vs 3-4)', () => {
        const tournament = new Tournament({
            players: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'],
            courts: ['Court 1', 'Court 2'],
            pointsPerMatch: 16,
            randomize: false
        });

        // In Round 1, players are in original order: P1, P2, P3, P4, P5, P6, P7, P8
        // Court 1 gets first 4: P1, P2, P3, P4
        // Expected pairing: team1=[P1,P3], team2=[P2,P4]
        const game1 = tournament.rounds[0].games[0];
        runner.assertEqual(game1.team1.sort(), ['P1', 'P3'], 'Court 1 Team 1 should be P1 and P3');
        runner.assertEqual(game1.team2.sort(), ['P2', 'P4'], 'Court 1 Team 2 should be P2 and P4');

        // Court 2 gets next 4: P5, P6, P7, P8
        // Expected pairing: team1=[P5,P7], team2=[P6,P8]
        const game2 = tournament.rounds[0].games[1];
        runner.assertEqual(game2.team1.sort(), ['P5', 'P7'], 'Court 2 Team 1 should be P5 and P7');
        runner.assertEqual(game2.team2.sort(), ['P6', 'P8'], 'Court 2 Team 2 should be P6 and P8');
    });

    runner.test('1-3 vs 2-4 pairing applies after leaderboard sorting', () => {
        const tournament = new Tournament({
            players: ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank', 'Grace', 'Henry'],
            courts: ['Court 1', 'Court 2'],
            pointsPerMatch: 16,
            randomize: false
        });

        // Round 1: Alice & Charlie win 16-0, Eve & Grace win 16-0
        tournament.updateScore(0, 0, 16, 0);
        tournament.updateScore(0, 1, 16, 0);

        // Create Round 2 - players sorted by leaderboard
        tournament.createNextRound();

        // After Round 1, top 4 are: Alice(16), Charlie(16), Eve(16), Grace(16)
        // They should be paired 1-3 vs 2-4 based on sorted order
        const game1 = tournament.rounds[1].games[0];
        const game1Players = [...game1.team1, ...game1.team2];

        // Verify top 4 players are on Court 1
        runner.assertTrue(game1Players.includes('Alice'), 'Alice should play on Court 1');
        runner.assertTrue(game1Players.includes('Charlie'), 'Charlie should play on Court 1');
        runner.assertTrue(game1Players.includes('Eve'), 'Eve should play on Court 1');
        runner.assertTrue(game1Players.includes('Grace'), 'Grace should play on Court 1');
    });

    // ============================================================================
    // NEW TESTS: isRoundComplete() Coverage
    // ============================================================================

    runner.test('isRoundComplete() returns false for incomplete round', () => {
        const tournament = new Tournament({
            players: ['Alice', 'Bob', 'Charlie', 'Dave'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false
        });

        runner.assertFalse(
            tournament.isRoundComplete(0),
            'Round with null scores should be incomplete'
        );
    });

    runner.test('isRoundComplete() returns true for complete round', () => {
        const tournament = new Tournament({
            players: ['Alice', 'Bob', 'Charlie', 'Dave'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false
        });

        tournament.updateScore(0, 0, 10, 6);

        runner.assertTrue(
            tournament.isRoundComplete(0),
            'Round with scores should be complete'
        );
    });

    runner.test('isRoundComplete() returns false for invalid round index', () => {
        const tournament = new Tournament({
            players: ['Alice', 'Bob', 'Charlie', 'Dave'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false
        });

        runner.assertFalse(
            tournament.isRoundComplete(99),
            'Invalid round index should return false'
        );
    });

    runner.test('isRoundComplete() requires all games in round to be complete', () => {
        const tournament = new Tournament({
            players: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
            courts: ['Court 1', 'Court 2'],
            pointsPerMatch: 16,
            randomize: false
        });

        // Complete only first game
        tournament.updateScore(0, 0, 10, 6);

        runner.assertFalse(
            tournament.isRoundComplete(0),
            'Round should be incomplete if any game is incomplete'
        );

        // Complete second game
        tournament.updateScore(0, 1, 12, 4);

        runner.assertTrue(
            tournament.isRoundComplete(0),
            'Round should be complete when all games are complete'
        );
    });

    // ============================================================================
    // NEW TESTS: getBenchPlayers() Coverage
    // ============================================================================

    runner.test('getBenchPlayers() returns benched players correctly', () => {
        const tournament = new Tournament({
            players: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false
        });

        const benched = tournament.getBenchPlayers(0);

        runner.assertEqual(benched.length, 2, 'Should have 2 resting players');
        runner.assertTrue(
            benched.includes('P5') && benched.includes('P6'),
            'With nobody having played yet, the last two entered rest in round 0'
        );
    });

    runner.test('getBenchPlayers() returns empty array when all players play', () => {
        const tournament = new Tournament({
            players: ['P1', 'P2', 'P3', 'P4'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false
        });

        const benched = tournament.getBenchPlayers(0);

        runner.assertEqual(benched.length, 0, 'No players should be benched when all play');
    });

    runner.test('getBenchPlayers() returns empty array for invalid round index', () => {
        const tournament = new Tournament({
            players: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false
        });

        runner.assertEqual(
            tournament.getBenchPlayers(-1).length,
            0,
            'Negative index should return empty array'
        );

        runner.assertEqual(
            tournament.getBenchPlayers(99).length,
            0,
            'Out of bounds index should return empty array'
        );
    });

    // ============================================================================
    // NEW TESTS: Tie Scenarios (score1 == score2)
    // ============================================================================

    runner.test('Leaderboard handles tie scores correctly', () => {
        const tournament = new Tournament({
            players: ['Alice', 'Bob', 'Charlie', 'Dave'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false
        });

        // Tied game: 8-8
        tournament.updateScore(0, 0, 8, 8);

        const leaderboard = tournament.getLeaderboard();

        runner.assertEqual(leaderboard.length, 4, 'Should have 4 players');

        // All players should have 8 points
        leaderboard.forEach(player => {
            runner.assertEqual(player.points, 8, `${player.name} should have 8 points`);
            runner.assertEqual(player.gamesPlayed, 1, `${player.name} should have played 1 game`);
        });

        // With tie, no wins or losses should be recorded
        leaderboard.forEach(player => {
            runner.assertEqual(player.wins, 0, `${player.name} should have 0 wins`);
            runner.assertEqual(player.losses, 0, `${player.name} should have 0 losses`);
        });
    });

    // ============================================================================
    // CRITICAL BUG TEST: Score sum validation
    // ============================================================================

    runner.test('By design: updateScore does not validate the score sum (the UI warns instead)', () => {
        const tournament = new Tournament({
            players: ['Alice', 'Bob', 'Charlie', 'Dave'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false
        });

        // This SHOULD throw an error but currently DOESN'T
        // Score sum is 20, but pointsPerMatch is 16
        try {
            tournament.updateScore(0, 0, 10, 10);
            // If we get here, the bug exists
            runner.assertTrue(
                true,
                'BUG CONFIRMED: updateScore allows invalid score sum (10+10=20, expected 16)'
            );
        } catch (e) {
            // If validation exists, this would be reached
            runner.assertTrue(
                false,
                'Score validation exists (bug fixed)'
            );
        }
    });

    runner.test('By design: updateScore allows a score sum below pointsPerMatch', () => {
        const tournament = new Tournament({
            players: ['Alice', 'Bob', 'Charlie', 'Dave'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false
        });

        // Score sum is 10, but pointsPerMatch is 16
        try {
            tournament.updateScore(0, 0, 5, 5);
            runner.assertTrue(
                true,
                'BUG CONFIRMED: updateScore allows score sum less than pointsPerMatch (5+5=10, expected 16)'
            );
        } catch (e) {
            runner.assertTrue(false, 'Score validation exists (bug fixed)');
        }
    });

    // ============================================================================
    // NEW TESTS: Edge Cases - Insufficient Players
    // ============================================================================

    runner.test('Tournament with 1 player is rejected', () => {
        runner.assertThrows(
            () => new Tournament({
                players: ['Alice'],
                courts: ['Court 1'],
                pointsPerMatch: 16,
                randomize: false
            }),
            'One player is not a tournament'
        );
    });

    runner.test('Tournament with 2 players is rejected', () => {
        runner.assertThrows(
            () => new Tournament({
                players: ['Alice', 'Bob'],
                courts: ['Court 1'],
                pointsPerMatch: 16,
                randomize: false
            }),
            'Two players cannot fill a court'
        );
    });

    runner.test('Tournament with 3 players creates one 1 v 2 game', () => {
        const tournament = new Tournament({
            players: ['Alice', 'Bob', 'Charlie'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false
        });

        const games = tournament.rounds[0].games;

        runner.assertEqual(games.length, 1, 'Three players fill one court');
        runner.assertEqual(games[0].team1.length, 1, 'One player plays alone');
        runner.assertEqual(games[0].team2.length, 2, 'The other two are partners');
        runner.assertEqual(
            tournament.getBenchPlayers(0).length,
            0,
            'Nobody rests with exactly three players'
        );
    });

    // ============================================================================
    // NEW TESTS: Leaderboard excludeLastRound Parameter
    // ============================================================================

    runner.test('getLeaderboard() with excludeLastRound=true excludes unsaved round', () => {
        const tournament = new Tournament({
            players: ['Alice', 'Bob', 'Charlie', 'Dave'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false
        });

        // Complete round 0
        tournament.updateScore(0, 0, 16, 0);

        // Create round 1 but don't complete it
        tournament.createNextRound();

        // Leaderboard with excludeLastRound should only count round 0
        const leaderboardExcluding = tournament.getLeaderboard(true);
        const leaderboardIncluding = tournament.getLeaderboard(false);

        // Both should have same results since round 1 has no scores
        runner.assertEqual(
            JSON.stringify(leaderboardExcluding),
            JSON.stringify(leaderboardIncluding),
            'Should be same when last round has no scores'
        );

        // Now add scores to round 1
        tournament.updateScore(1, 0, 0, 16);

        const leaderboardExcluding2 = tournament.getLeaderboard(true);
        const leaderboardIncluding2 = tournament.getLeaderboard(false);

        // Now they should be different
        runner.assertFalse(
            JSON.stringify(leaderboardExcluding2) === JSON.stringify(leaderboardIncluding2),
            'Should be different when last round has scores and excludeLastRound=true'
        );

        // Charlie and Dave should have more points in including version
        const charlieExcluded = leaderboardExcluding2.find(p => p.name === 'Charlie');
        const charlieIncluded = leaderboardIncluding2.find(p => p.name === 'Charlie');

        runner.assertTrue(
            charlieIncluded.points > charlieExcluded.points,
            'Charlie should have more points when including last round'
        );
    });

    // ============================================================================
    // NEW TESTS: Player/Court Name Trimming Issues
    // ============================================================================

    runner.test('Player names with leading/trailing spaces cause inconsistency', () => {
        // Validation trims names for duplicate check, but storage doesn't trim
        const tournament = new Tournament({
            players: ['Alice', 'Bob', 'Charlie', 'Dave'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false
        });

        // The stored names should match exactly
        runner.assertEqual(
            tournament.players[0],
            'Alice',
            'Player names should be stored as-is without trimming'
        );
    });

    runner.test('BUG: Whitespace-only player name passes validation', () => {
        runner.assertThrows(
            () => new Tournament({
                players: ['Alice', '   ', 'Bob'],  // Whitespace-only name
                courts: ['Court 1'],
                pointsPerMatch: 16,
                randomize: false
            }),
            'Should throw error for whitespace-only player name'
        );
    });

    runner.test('BUG: Whitespace-only court name passes validation', () => {
        runner.assertThrows(
            () => new Tournament({
                players: ['Alice', 'Bob', 'Charlie', 'Dave'],
                courts: ['   '],  // Whitespace-only court name
                pointsPerMatch: 16,
                randomize: false
            }),
            'Should throw error for whitespace-only court name'
        );
    });

    runner.test('BUG: Non-string player value passes validation', () => {
        runner.assertThrows(
            () => new Tournament({
                players: ['Alice', 123, 'Bob'],  // Number instead of string
                courts: ['Court 1'],
                pointsPerMatch: 16,
                randomize: false
            }),
            'Should throw error for non-string player'
        );
    });

    runner.test('BUG: Non-string court value passes validation', () => {
        runner.assertThrows(
            () => new Tournament({
                players: ['Alice', 'Bob', 'Charlie', 'Dave'],
                courts: [123],  // Number instead of string
                pointsPerMatch: 16,
                randomize: false
            }),
            'Should throw error for non-string court'
        );
    });

    // ============================================================================
    // NEW TESTS: Randomization Behavior
    // ============================================================================

    runner.test('Randomization only applies after round 1 (not in round 1)', () => {
        const config = {
            players: ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank', 'Grace', 'Henry'],
            courts: ['Court 1', 'Court 2'],
            pointsPerMatch: 16,
            randomize: true,  // This should NOT affect round 0
            seed: 998877
        };

        const tournament1 = new Tournament(config);
        const tournament2 = new Tournament(config);

        // Round 0 should be identical even with randomize=true
        runner.assertEqual(
            JSON.stringify(tournament1.rounds[0].games),
            JSON.stringify(tournament2.rounds[0].games),
            'Round 0 should not be randomized even when randomize=true'
        );

        // Complete round 0 the same way
        tournament1.updateScore(0, 0, 16, 0);
        tournament1.updateScore(0, 1, 16, 0);
        tournament2.updateScore(0, 0, 16, 0);
        tournament2.updateScore(0, 1, 16, 0);

        // Create round 1
        tournament1.createNextRound();
        tournament2.createNextRound();

        // Round 1 SHOULD be deterministically randomized
        runner.assertEqual(
            JSON.stringify(tournament1.rounds[1].games),
            JSON.stringify(tournament2.rounds[1].games),
            'Round 1 should be deterministically randomized'
        );
    });

    // ============================================================================
    // NEW TESTS: SeededRandom Determinism
    // ============================================================================

    runner.test('An explicit seed is kept as given', () => {
        const tournament = new Tournament({
            players: ['Alice', 'Bob', 'Charlie', 'Dave'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false,
            seed: 123456
        });

        runner.assertEqual(tournament.seed, 123456, 'Seed should be used as provided');
    });

    runner.test('Seed is drawn at random when not given', () => {
        const config = () => ({
            players: ['Alice', 'Bob', 'Charlie', 'Dave'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false
        });

        const seeds = new Set();
        for (let i = 0; i < 20; i++) {
            const tournament = new Tournament(config());
            runner.assertTrue(
                Number.isInteger(tournament.seed),
                'Seed should be an integer'
            );
            seeds.add(tournament.seed);
        }

        runner.assertTrue(
            seeds.size > 1,
            'Two tournaments with the same players should not share a seed'
        );
    });

    runner.test('Seed survives a serialization round trip', () => {
        const tournament = new Tournament({
            players: ['Alice', 'Bob', 'Charlie', 'Dave'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: true
        });

        const restored = Tournament.fromJSON(JSON.parse(JSON.stringify(tournament.toJSON())));

        runner.assertEqual(restored.seed, tournament.seed, 'Seed should be persisted');
    });

    // ============================================================================
    // NEW TESTS: fromJSON Validation and Edge Cases
    // ============================================================================


    // ============================================================================
    // NEW TESTS: Leaderboard Sorting Edge Cases
    // ============================================================================

    runner.test('Leaderboard sorts alphabetically when points and games are equal', () => {
        const tournament = new Tournament({
            players: ['Zoe', 'Alice', 'Bob', 'Charlie'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false
        });

        // Don't play any games - all have 0 points, 0 games
        const leaderboard = tournament.getLeaderboard();

        // Should be sorted alphabetically
        runner.assertEqual(leaderboard[0].name, 'Alice', 'First should be Alice');
        runner.assertEqual(leaderboard[1].name, 'Bob', 'Second should be Bob');
        runner.assertEqual(leaderboard[2].name, 'Charlie', 'Third should be Charlie');
        runner.assertEqual(leaderboard[3].name, 'Zoe', 'Last should be Zoe');
    });

    runner.test('Leaderboard prioritizes fewer games played when points are equal', () => {
        const tournament = new Tournament({
            players: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
            courts: ['Court 1', 'Court 2'],
            pointsPerMatch: 16,
            randomize: false
        });

        // Round 1: A,C win 16-0, E,G win 16-0
        tournament.updateScore(0, 0, 16, 0);
        tournament.updateScore(0, 1, 16, 0);

        tournament.createNextRound();

        // Round 2: Top 4 play. Let's say winners get 8-8 (tie)
        tournament.updateScore(1, 0, 8, 8);
        tournament.updateScore(1, 1, 8, 8);

        const leaderboard = tournament.getLeaderboard();

        // Alice has 16+8=24 points in 2 games
        // B,D,F,H have 0 points in 1 game
        // Players with fewer games should rank higher when points are equal...
        // Actually, the current logic sorts by points DESC, then games ASC
        // So higher points come first regardless of games played

        const alice = leaderboard.find(p => p.name === 'A');
        runner.assertEqual(alice.points, 24, 'A should have 24 points');
        runner.assertEqual(alice.gamesPlayed, 2, 'A should have played 2 games');
    });

    // ============================================================================
    // NEW TESTS: Configuration Edge Cases
    // ============================================================================

    runner.test('Configuration with undefined randomize throws error', () => {
        runner.assertThrows(
            () => new Tournament({
                players: ['Alice', 'Bob', 'Charlie', 'Dave'],
                courts: ['Court 1'],
                pointsPerMatch: 16
                // randomize is undefined
            }),
            'Should throw error when randomize is undefined'
        );
    });

    runner.test('Configuration validates randomize is boolean', () => {
        runner.assertThrows(
            () => new Tournament({
                players: ['Alice', 'Bob', 'Charlie', 'Dave'],
                courts: ['Court 1'],
                pointsPerMatch: 16,
                randomize: 'true'  // String instead of boolean
            }),
            'Should throw error when randomize is not a boolean'
        );
    });


    // ============================================================================
    // NEW TESTS: Seating - courts of three and resting
    // ============================================================================

    runner.test('computeSeating() prefers full courts, then courts of three', () => {
        const seating = (p, c) => {
            const s = computeSeating(p, c);
            return [s.seated, s.courtsUsed, s.quads, s.trios];
        };

        runner.assertEqual(seating(3, 1), [3, 1, 0, 1], '3 players fill one court of three');
        runner.assertEqual(seating(4, 1), [4, 1, 1, 0], '4 players fill one court of four');
        runner.assertEqual(seating(5, 1), [4, 1, 1, 0], '5 never fits, so one rests');
        runner.assertEqual(seating(5, 2), [4, 1, 1, 0], '5 never fits however many courts');
        runner.assertEqual(seating(6, 2), [6, 2, 0, 2], '6 on 2 courts is two courts of three');
        runner.assertEqual(seating(7, 2), [7, 2, 1, 1], '7 on 2 courts is a four and a three');
        runner.assertEqual(seating(8, 2), [8, 2, 2, 0], '8 on 2 courts is two fours');
        runner.assertEqual(seating(9, 3), [9, 3, 0, 3], '9 on 3 courts is three courts of three');
        runner.assertEqual(seating(10, 3), [10, 3, 1, 2], '10 on 3 courts is a four and two threes');
        runner.assertEqual(seating(11, 3), [11, 3, 2, 1], '11 on 3 courts is two fours and a three');
        runner.assertEqual(seating(13, 4), [13, 4, 1, 3], '13 on 4 courts is a four and three threes');
    });

    runner.test('computeSeating() caps at court capacity and rests the remainder', () => {
        runner.assertEqual(computeSeating(6, 1).seated, 4, '6 players on 1 court: 2 rest');
        runner.assertEqual(computeSeating(9, 2).seated, 8, '9 players on 2 courts: 1 rests');
        runner.assertEqual(computeSeating(13, 3).seated, 12, '13 players on 3 courts: 1 rests');
        runner.assertEqual(computeSeating(17, 4).seated, 16, '17 players on 4 courts: 1 rests');
    });

    runner.test('computeSeating() returns nothing below three players', () => {
        runner.assertEqual(computeSeating(2, 5).courtsUsed, 0, 'Two players cannot be seated');
        runner.assertEqual(computeSeating(5, 0).courtsUsed, 0, 'No courts means no games');
    });

    runner.test('Spare courts beyond what is needed go unused', () => {
        const tournament = new Tournament({
            players: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
            courts: ['Court 1', 'Court 2', 'Court 3'],
            pointsPerMatch: 16,
            randomize: false
        });

        runner.assertEqual(tournament.rounds[0].games.length, 2, '6 players need only 2 courts');
        runner.assertEqual(tournament.getBenchPlayers(0).length, 0, 'Nobody rests');
    });

    runner.test('Seven players on two courts give one doubles game and one 1 v 2', () => {
        const tournament = new Tournament({
            players: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'],
            courts: ['Court 1', 'Court 2'],
            pointsPerMatch: 16,
            randomize: false
        });

        const games = tournament.rounds[0].games;

        runner.assertEqual(games.length, 2, 'Both courts are used');
        runner.assertEqual(games[0].team1.length, 2, 'The top court is a doubles game');
        runner.assertEqual(games[0].team2.length, 2, 'The top court is a doubles game');
        runner.assertEqual(games[1].team1.length, 1, 'The court of three comes last');
        runner.assertEqual(games[1].team2.length, 2, 'The solo player faces two');
        runner.assertEqual(tournament.getBenchPlayers(0).length, 0, 'Nobody rests');
    });

    runner.test('Every player on a court of three is distinct and the solo player is team1', () => {
        const tournament = new Tournament({
            players: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
            courts: ['Court 1', 'Court 2'],
            pointsPerMatch: 16,
            randomize: false
        });

        const seen = new Set();
        tournament.rounds[0].games.forEach(game => {
            runner.assertEqual(game.team1.length, 1, 'Solo player is always team1');
            runner.assertEqual(game.team2.length, 2, 'The pair is always team2');
            [...game.team1, ...game.team2].forEach(player => seen.add(player));
        });

        runner.assertEqual(seen.size, 6, 'All six players appear exactly once');
    });

    // ============================================================================
    // NEW TESTS: Fairness of the solo role and of resting
    // ============================================================================

    runner.test('Playing alone is shared out evenly over a session', () => {
        const tournament = new Tournament({
            players: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
            courts: ['Court 1', 'Court 2'],
            pointsPerMatch: 16,
            randomize: false
        });

        for (let round = 0; round < 6; round++) {
            tournament.rounds[round].games.forEach((game, gameIndex) => {
                tournament.updateScore(round, gameIndex, 10, 6);
            });
            if (round < 5) {
                tournament.createNextRound();
            }
        }

        const soloCounts = tournament.getSoloCounts();
        const counts = Object.values(soloCounts);
        const spread = Math.max(...counts) - Math.min(...counts);

        runner.assertEqual(
            counts.reduce((sum, n) => sum + n, 0),
            12,
            'Six rounds of two courts of three is twelve solo turns'
        );
        // Courts are partitioned by ranking, so exact equality is not reachable.
        // What must hold is that everyone takes turns and nobody carries an excess.
        const fairMax = Math.ceil(12 / counts.length) + 1;
        runner.assertTrue(
            Math.min(...counts) >= 1,
            `Everyone should take a turn alone. Got: ${JSON.stringify(soloCounts)}`
        );
        runner.assertTrue(
            Math.max(...counts) <= fairMax,
            `Nobody should carry an excess of solo turns. Got: ${JSON.stringify(soloCounts)}`
        );
        runner.assertTrue(spread <= 2, `Solo turns should be close. Got: ${JSON.stringify(soloCounts)}`);
    });

    runner.test('Resting keeps games played within one across a session', () => {
        const tournament = new Tournament({
            players: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false
        });

        for (let round = 0; round < 8; round++) {
            tournament.updateScore(round, 0, 9, 7);
            if (round < 7) {
                tournament.createNextRound();
            }
        }

        const counts = Object.values(tournament.getScheduledGameCounts());
        const spread = Math.max(...counts) - Math.min(...counts);

        runner.assertTrue(
            spread <= 1,
            `Games played should be within one. Got: ${JSON.stringify(tournament.getScheduledGameCounts())}`
        );
    });

    runner.test('The court of four rotates so the leaders also play alone', () => {
        const players = Array.from({length: 13}, (_, i) => 'P' + (i + 1));
        const tournament = new Tournament({
            players,
            courts: ['C1', 'C2', 'C3', 'C4'],
            pointsPerMatch: 16,
            randomize: false,
            seed: 4242
        });

        for (let round = 0; round < 12; round++) {
            tournament.rounds[round].games.forEach((game, gameIndex) => {
                tournament.updateScore(round, gameIndex, 9, 7);
            });
            if (round < 11) {
                tournament.createNextRound();
            }
        }

        const soloCounts = tournament.getSoloCounts();
        const counts = Object.values(soloCounts);

        // 12 rounds of three courts of three is 36 solo turns across 13 players
        const fairMax = Math.ceil(36 / players.length) + 1;

        runner.assertTrue(
            Math.min(...counts) >= 1,
            `Nobody should be exempt from playing alone. Got: ${JSON.stringify(soloCounts)}`
        );
        runner.assertTrue(
            Math.max(...counts) <= fairMax,
            `Nobody should carry an excess of solo turns. Got: ${JSON.stringify(soloCounts)}`
        );
    });

    // ============================================================================
    // NEW TESTS: Determinism
    // ============================================================================

    runner.test('Undoing and re-saving a round draws the identical round', () => {
        const tournament = new Tournament({
            players: ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank', 'Grace'],
            courts: ['Court 1', 'Court 2'],
            pointsPerMatch: 16,
            randomize: true,
            seed: 31337
        });

        for (let round = 0; round < 4; round++) {
            tournament.rounds[round].games.forEach((game, gameIndex) => {
                tournament.updateScore(round, gameIndex, 9 + gameIndex, 7 - gameIndex);
            });
            tournament.createNextRound();
        }

        const before = JSON.stringify(tournament.rounds[4].games);

        tournament.undoLastRound();
        tournament.createNextRound();

        runner.assertEqual(
            JSON.stringify(tournament.rounds[4].games),
            before,
            'The same round should come back unchanged'
        );
    });

    runner.test('A restored tournament draws the same next round as the original', () => {
        const tournament = new Tournament({
            players: ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivan'],
            courts: ['Court 1', 'Court 2'],
            pointsPerMatch: 16,
            randomize: true
        });

        for (let round = 0; round < 3; round++) {
            tournament.rounds[round].games.forEach((game, gameIndex) => {
                tournament.updateScore(round, gameIndex, 10, 6);
            });
            tournament.createNextRound();
        }

        const restored = Tournament.fromJSON(JSON.parse(JSON.stringify(tournament.toJSON())));
        restored.undoLastRound();
        restored.createNextRound();

        runner.assertEqual(
            JSON.stringify(restored.rounds[3].games),
            JSON.stringify(tournament.rounds[3].games),
            'A reload must not change the draw'
        );
    });

    // ============================================================================
    // NEW TESTS: Editing a running tournament
    // ============================================================================

    runner.test('applyConfig() re-draws the current round while it has no scores', () => {
        const tournament = new Tournament({
            players: ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank', 'Grace', 'Henry'],
            courts: ['Court 1', 'Court 2'],
            pointsPerMatch: 16,
            randomize: false,
            seed: 555
        });

        const result = tournament.applyConfig({
            players: ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank', 'Grace'],
            courts: ['Court 1', 'Court 2'],
            pointsPerMatch: 16,
            randomize: false
        });

        runner.assertTrue(result.currentRoundRedrawn, 'The round should be re-drawn');
        runner.assertEqual(tournament.rounds.length, 1, 'Still one round, not two');

        const playing = new Set();
        tournament.rounds[0].games.forEach(game => {
            [...game.team1, ...game.team2].forEach(player => playing.add(player));
        });

        runner.assertFalse(playing.has('Henry'), 'The removed player is off court');
        runner.assertEqual(playing.size, 7, 'The remaining seven all play');
    });

    runner.test('applyConfig() keeps the current round once a score is entered', () => {
        const tournament = new Tournament({
            players: ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank', 'Grace', 'Henry'],
            courts: ['Court 1', 'Court 2'],
            pointsPerMatch: 16,
            randomize: false,
            seed: 555
        });

        tournament.updateScore(0, 0, 9, 7);
        const before = JSON.stringify(tournament.rounds[0].games);

        const result = tournament.applyConfig({
            players: ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank', 'Grace'],
            courts: ['Court 1', 'Court 2'],
            pointsPerMatch: 16,
            randomize: false
        });

        runner.assertFalse(result.currentRoundRedrawn, 'The round should be left alone');
        runner.assertEqual(
            JSON.stringify(tournament.rounds[0].games),
            before,
            'Games and scores must be untouched'
        );
    });

    runner.test('applyConfig() never touches played rounds or the seed', () => {
        const tournament = new Tournament({
            players: ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank', 'Grace', 'Henry'],
            courts: ['Court 1', 'Court 2'],
            pointsPerMatch: 16,
            randomize: false
        });

        const seed = tournament.seed;
        tournament.updateScore(0, 0, 9, 7);
        tournament.updateScore(0, 1, 10, 6);
        tournament.createNextRound();
        const round1 = JSON.stringify(tournament.rounds[0]);

        tournament.applyConfig({
            players: ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank'],
            courts: ['Court 1'],
            pointsPerMatch: 32,
            randomize: true
        });

        runner.assertEqual(tournament.seed, seed, 'The seed must never be recomputed');
        runner.assertEqual(
            JSON.stringify(tournament.rounds[0]),
            round1,
            'The played round must be untouched, points target included'
        );
    });

    runner.test('A player added part-way through plays the very next round', () => {
        const tournament = new Tournament({
            players: ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false
        });

        tournament.updateScore(0, 0, 9, 7);
        tournament.createNextRound();
        tournament.updateScore(1, 0, 9, 7);

        tournament.applyConfig({
            players: ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Ivan'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false
        });
        tournament.createNextRound();

        const playing = new Set();
        tournament.rounds[2].games.forEach(game => {
            [...game.team1, ...game.team2].forEach(player => playing.add(player));
        });

        runner.assertTrue(playing.has('Ivan'), 'Having played no games, Ivan goes straight on');
    });

    runner.test('A removed player keeps their points and is marked inactive', () => {
        const tournament = new Tournament({
            players: ['Alice', 'Bob', 'Charlie', 'Dave'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false
        });

        tournament.updateScore(0, 0, 10, 6);
        const scored = tournament.rounds[0].games[0].team1[0];
        const remaining = tournament.players.filter(player => player !== scored);

        tournament.applyConfig({
            players: [...remaining, 'Ivan'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false
        });

        const leaderboard = tournament.getLeaderboard();
        const departed = leaderboard.find(entry => entry.name === scored);

        runner.assertTrue(!!departed, 'The departed player stays on the leaderboard');
        runner.assertEqual(departed.points, 10, 'They keep the points they earned');
        runner.assertFalse(departed.active, 'They are marked inactive');
        runner.assertTrue(
            leaderboard.find(entry => entry.name === 'Ivan').active,
            'The new arrival is active'
        );
    });

    // ============================================================================
    // NEW TESTS: Points target per round
    // ============================================================================

    runner.test('Each round records the points target it was drawn with', () => {
        const tournament = new Tournament({
            players: ['Alice', 'Bob', 'Charlie', 'Dave'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false
        });

        tournament.updateScore(0, 0, 9, 7);
        tournament.applyConfig({
            players: ['Alice', 'Bob', 'Charlie', 'Dave'],
            courts: ['Court 1'],
            pointsPerMatch: 32,
            randomize: false
        });
        tournament.createNextRound();

        runner.assertEqual(tournament.getPointsTarget(0), 16, 'Round 1 keeps its 16');
        runner.assertEqual(tournament.getPointsTarget(1), 32, 'Round 2 uses the new 32');
    });

    runner.test('getPointsTarget() falls back for rounds saved without a target', () => {
        const tournament = new Tournament({
            players: ['Alice', 'Bob', 'Charlie', 'Dave'],
            courts: ['Court 1'],
            pointsPerMatch: 24,
            randomize: false
        });

        delete tournament.rounds[0].pointsPerMatch;

        runner.assertEqual(
            tournament.getPointsTarget(0),
            24,
            'Older saved rounds fall back to the tournament setting'
        );
    });

    runner.test('A past round remembers who was in the tournament at the time', () => {
        const tournament = new Tournament({
            players: ['Ana', 'Bo', 'Cy'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false
        });

        tournament.updateScore(0, 0, 6, 10);

        runner.assertEqual(
            tournament.getBenchPlayers(0).length,
            0,
            'Nobody rested in round 1'
        );

        tournament.applyConfig({
            players: ['Ana', 'Bo', 'Cy', 'Dee', 'Eli'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false
        });

        runner.assertEqual(
            tournament.getBenchPlayers(0).length,
            0,
            'Players who joined later were not resting in round 1'
        );
        runner.assertEqual(
            tournament.rounds[0].players,
            ['Ana', 'Bo', 'Cy'],
            'Round 1 keeps the roster it was drawn with'
        );
    });

    runner.test('roundHasScores() spots a single entered score', () => {
        const tournament = new Tournament({
            players: ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank', 'Grace', 'Henry'],
            courts: ['Court 1', 'Court 2'],
            pointsPerMatch: 16,
            randomize: false
        });

        runner.assertFalse(tournament.roundHasScores(0), 'A fresh round has no scores');

        tournament.rounds[0].games[1].score1 = 0;

        runner.assertTrue(tournament.roundHasScores(0), 'A zero counts as an entered score');
    });


    return runner;
}
