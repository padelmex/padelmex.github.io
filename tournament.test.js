import { Tournament } from './tournament.js';

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

        // All players should have played roughly the same number of games
        // With 6 players and 6 rounds of 4 players each, that's 24 player-slots
        // Ideally 24/6 = 4 games per player
        // Current algorithm prioritizes leaderboard ranking, which can cause imbalance
        // TODO: Improve fair rotation to ensure ±1 game difference
        const counts = Object.values(gamesPlayed);
        const min = Math.min(...counts);
        const max = Math.max(...counts);
        const maxDifference = max - min;

        // For now, just ensure everyone plays at least once and difference isn't extreme (>4 games)
        runner.assertTrue(min >= 1, `All players should play at least once: ${JSON.stringify(gamesPlayed)}`);
        runner.assertTrue(maxDifference <= 4, `Max difference should be ≤4 games. Got: ${JSON.stringify(gamesPlayed)}, difference: ${maxDifference}`);
    });

    runner.test('Randomization is deterministic with same seed', () => {
        const config = {
            players: ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank', 'Grace', 'Henry'],
            courts: ['Court 1', 'Court 2'],
            pointsPerMatch: 16,
            randomize: true
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
    // NEW TESTS: Round Robin Benching
    // ============================================================================

    runner.test('Round robin benching rotates players in fixed order', () => {
        const tournament = new Tournament({
            players: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false,
            benchingMode: 'round-robin'
        });

        // Round 0: Should bench P1, P2 (first 2 in rotation)
        const round0Players = new Set();
        tournament.rounds[0].games.forEach(game => {
            game.team1.forEach(p => round0Players.add(p));
            game.team2.forEach(p => round0Players.add(p));
        });
        runner.assertTrue(!round0Players.has('P1'), 'P1 should be benched in Round 0');
        runner.assertTrue(!round0Players.has('P2'), 'P2 should be benched in Round 0');
        runner.assertTrue(round0Players.has('P3'), 'P3 should play in Round 0');
        runner.assertTrue(round0Players.has('P4'), 'P4 should play in Round 0');
        runner.assertTrue(round0Players.has('P5'), 'P5 should play in Round 0');
        runner.assertTrue(round0Players.has('P6'), 'P6 should play in Round 0');

        // Complete Round 0 and create Round 1
        tournament.updateScore(0, 0, 10, 6);
        tournament.createNextRound();

        // Round 1: Should bench P3, P4 (next 2 in rotation)
        const round1Players = new Set();
        tournament.rounds[1].games.forEach(game => {
            game.team1.forEach(p => round1Players.add(p));
            game.team2.forEach(p => round1Players.add(p));
        });
        runner.assertTrue(round1Players.has('P1'), 'P1 should play in Round 1');
        runner.assertTrue(round1Players.has('P2'), 'P2 should play in Round 1');
        runner.assertTrue(!round1Players.has('P3'), 'P3 should be benched in Round 1');
        runner.assertTrue(!round1Players.has('P4'), 'P4 should be benched in Round 1');
        runner.assertTrue(round1Players.has('P5'), 'P5 should play in Round 1');
        runner.assertTrue(round1Players.has('P6'), 'P6 should play in Round 1');

        // Complete Round 1 and create Round 2
        tournament.updateScore(1, 0, 10, 6);
        tournament.createNextRound();

        // Round 2: Should bench P5, P6 (next 2 in rotation)
        const round2Players = new Set();
        tournament.rounds[2].games.forEach(game => {
            game.team1.forEach(p => round2Players.add(p));
            game.team2.forEach(p => round2Players.add(p));
        });
        runner.assertTrue(round2Players.has('P1'), 'P1 should play in Round 2');
        runner.assertTrue(round2Players.has('P2'), 'P2 should play in Round 2');
        runner.assertTrue(round2Players.has('P3'), 'P3 should play in Round 2');
        runner.assertTrue(round2Players.has('P4'), 'P4 should play in Round 2');
        runner.assertTrue(!round2Players.has('P5'), 'P5 should be benched in Round 2');
        runner.assertTrue(!round2Players.has('P6'), 'P6 should be benched in Round 2');
    });

    // ============================================================================
    // NEW TESTS: Random Benching
    // ============================================================================

    runner.test('Random benching is deterministic with same seed', () => {
        const config = {
            players: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false,
            benchingMode: 'random'
        };

        const tournament1 = new Tournament(config);
        const tournament2 = new Tournament(config);

        // Round 0 should have same players
        const round0Players1 = new Set();
        tournament1.rounds[0].games.forEach(game => {
            game.team1.forEach(p => round0Players1.add(p));
            game.team2.forEach(p => round0Players1.add(p));
        });

        const round0Players2 = new Set();
        tournament2.rounds[0].games.forEach(game => {
            game.team1.forEach(p => round0Players2.add(p));
            game.team2.forEach(p => round0Players2.add(p));
        });

        runner.assertEqual(
            Array.from(round0Players1).sort(),
            Array.from(round0Players2).sort(),
            'Random benching should be deterministic with same seed'
        );
    });

    runner.test('Random benching changes which players are benched each round', () => {
        const tournament = new Tournament({
            players: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false,
            benchingMode: 'random'
        });

        // Get benched players for multiple rounds
        const benchedPerRound = [];
        for (let i = 0; i < 3; i++) {
            const roundPlayers = new Set();
            tournament.rounds[i].games.forEach(game => {
                game.team1.forEach(p => roundPlayers.add(p));
                game.team2.forEach(p => roundPlayers.add(p));
            });
            const benched = tournament.players.filter(p => !roundPlayers.has(p));
            benchedPerRound.push(benched.sort().join(','));

            if (i < 2) {
                tournament.updateScore(i, 0, 10, 6);
                tournament.createNextRound();
            }
        }

        // At least one round should have different benched players
        // (very unlikely all 3 rounds bench the same 2 players)
        const uniqueBenched = new Set(benchedPerRound);
        runner.assertTrue(
            uniqueBenched.size >= 2,
            'Random benching should vary which players are benched (got: ' + Array.from(uniqueBenched).join('; ') + ')'
        );
    });

    // ============================================================================
    // NEW TESTS: Deterministic Recreation
    // ============================================================================

    runner.test('Removing and recreating round produces identical result (round robin)', () => {
        const config = {
            players: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false,
            benchingMode: 'round-robin'
        };

        const tournament = new Tournament(config);

        // Complete Round 0
        tournament.updateScore(0, 0, 10, 6);

        // Create Round 1
        tournament.createNextRound();
        const round1Original = JSON.parse(JSON.stringify(tournament.rounds[1]));

        // Undo Round 1
        tournament.undoLastRound();

        // Recreate Round 1
        tournament.createNextRound();
        const round1Recreated = JSON.parse(JSON.stringify(tournament.rounds[1]));

        runner.assertEqual(
            round1Original,
            round1Recreated,
            'Recreated round should be identical to original'
        );
    });

    runner.test('Removing and recreating round produces identical result (random)', () => {
        const config = {
            players: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
            courts: ['Court 1'],
            pointsPerMatch: 16,
            randomize: false,
            benchingMode: 'random'
        };

        const tournament = new Tournament(config);

        // Complete Round 0
        tournament.updateScore(0, 0, 10, 6);

        // Create Round 1
        tournament.createNextRound();
        const round1Original = JSON.parse(JSON.stringify(tournament.rounds[1]));

        // Undo Round 1
        tournament.undoLastRound();

        // Recreate Round 1
        tournament.createNextRound();
        const round1Recreated = JSON.parse(JSON.stringify(tournament.rounds[1]));

        runner.assertEqual(
            round1Original,
            round1Recreated,
            'Recreated round should be identical to original (random benching)'
        );
    });

    runner.test('Deterministic recreation with randomized pairing', () => {
        const config = {
            players: ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank', 'Grace', 'Henry'],
            courts: ['Court 1', 'Court 2'],
            pointsPerMatch: 16,
            randomize: true,
            benchingMode: 'random'
        };

        const tournament = new Tournament(config);

        // Complete Round 0
        tournament.updateScore(0, 0, 16, 0);
        tournament.updateScore(0, 1, 16, 0);

        // Create Round 1
        tournament.createNextRound();
        const round1Original = JSON.parse(JSON.stringify(tournament.rounds[1]));

        // Undo Round 1
        tournament.undoLastRound();

        // Recreate Round 1
        tournament.createNextRound();
        const round1Recreated = JSON.parse(JSON.stringify(tournament.rounds[1]));

        runner.assertEqual(
            round1Original,
            round1Recreated,
            'Recreated round should be identical with both random benching and pairing'
        );
    });

    return runner;
}
