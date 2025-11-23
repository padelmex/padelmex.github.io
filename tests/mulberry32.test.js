/**
 * Tests for Mulberry32 random number generator
 * Verifies statistical properties and lack of correlation
 */

import { Mulberry32 } from '../src/tournament.js';

/**
 * Test 1: Output range
 */
function testOutputRange() {
    const rng = new Mulberry32(12345);
    const samples = 1000;

    for (let i = 0; i < samples; i++) {
        const val = rng.next();
        if (val < 0 || val >= 1) {
            throw new Error(`Value out of range [0,1): ${val}`);
        }
    }

    console.log('✓ Output range test passed (all values in [0,1))');
}

/**
 * Test 2: Determinism (same seed = same sequence)
 */
function testDeterminism() {
    const rng1 = new Mulberry32(98765);
    const rng2 = new Mulberry32(98765);

    for (let i = 0; i < 100; i++) {
        const val1 = rng1.next();
        const val2 = rng2.next();
        if (val1 !== val2) {
            throw new Error(`Non-deterministic at step ${i}: ${val1} !== ${val2}`);
        }
    }

    console.log('✓ Determinism test passed (same seed = same sequence)');
}

/**
 * Test 3: Different seeds produce different sequences
 */
function testDifferentSeeds() {
    const rng1 = new Mulberry32(1);
    const rng2 = new Mulberry32(2);

    const val1 = rng1.next();
    const val2 = rng2.next();

    if (val1 === val2) {
        throw new Error('Different seeds produced same first value');
    }

    console.log('✓ Different seeds test passed');
}

/**
 * Test 4: Uniform distribution (chi-squared test)
 */
function testUniformDistribution() {
    const rng = new Mulberry32(54321);
    const bins = 10;
    const samples = 10000;
    const expected = samples / bins;

    const counts = new Array(bins).fill(0);

    for (let i = 0; i < samples; i++) {
        const val = rng.next();
        const bin = Math.floor(val * bins);
        counts[bin]++;
    }

    // Chi-squared test
    let chiSquared = 0;
    for (let i = 0; i < bins; i++) {
        const diff = counts[i] - expected;
        chiSquared += (diff * diff) / expected;
    }

    // For 9 degrees of freedom (bins-1), critical value at 95% confidence is ~16.9
    // We'll use a more lenient threshold of 20 to avoid flakiness
    if (chiSquared > 20) {
        throw new Error(`Chi-squared test failed: ${chiSquared.toFixed(2)} > 20`);
    }

    console.log(`✓ Uniform distribution test passed (χ² = ${chiSquared.toFixed(2)})`);
}

/**
 * Test 5: No autocorrelation between consecutive seeds
 */
function testNoAutocorrelation() {
    const baseSeed = 100000;
    const trials = 50;
    const samples = 6; // Array size we shuffle

    // Generate shuffles with consecutive seeds
    const shuffles = [];
    for (let i = 0; i < trials; i++) {
        const rng = new Mulberry32(baseSeed + i);
        const arr = [0, 1, 2, 3, 4, 5];
        const shuffled = rng.shuffle(arr);
        shuffles.push(shuffled.join(','));
    }

    // Count how many consecutive shuffles are identical
    let identicalCount = 0;
    for (let i = 0; i < trials - 1; i++) {
        if (shuffles[i] === shuffles[i + 1]) {
            identicalCount++;
        }
    }

    // With good randomness, we should rarely see identical consecutive shuffles
    // For 6 elements, probability of identical shuffle is 1/720 ≈ 0.14%
    // In 49 pairs, expect ~0.07 identical pairs
    // Allow up to 3 for statistical fluctuation
    if (identicalCount > 3) {
        throw new Error(`Too many identical consecutive shuffles: ${identicalCount}/49 (expected ~0)`);
    }

    console.log(`✓ No autocorrelation test passed (${identicalCount}/49 identical consecutive shuffles)`);
}

/**
 * Test 6: Avalanche effect (small seed change = big output change)
 */
function testAvalancheEffect() {
    // Test that consecutive seeds produce very different first values
    const diffs = [];

    for (let seed = 1000; seed < 1100; seed++) {
        const rng1 = new Mulberry32(seed);
        const rng2 = new Mulberry32(seed + 1);

        const val1 = rng1.next();
        const val2 = rng2.next();

        diffs.push(Math.abs(val1 - val2));
    }

    // Average difference should be around 0.5 for good mixing
    // (since values are uniform in [0,1])
    const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;

    if (avgDiff < 0.2 || avgDiff > 0.8) {
        throw new Error(`Poor avalanche effect: avg diff = ${avgDiff.toFixed(3)} (expected ~0.5)`);
    }

    console.log(`✓ Avalanche effect test passed (avg diff = ${avgDiff.toFixed(3)})`);
}

/**
 * Test 7: Shuffle produces all permutations over many trials
 */
function testShuffleVariety() {
    const rng = new Mulberry32(11111);
    const arr = [1, 2, 3, 4];
    const permutations = new Set();

    // Generate 100 shuffles
    for (let i = 0; i < 100; i++) {
        // Need fresh RNG for each shuffle to get variety
        const tempRng = new Mulberry32(11111 + i * 137); // Use large step
        const shuffled = tempRng.shuffle([...arr]);
        permutations.add(shuffled.join(','));
    }

    // Should see many different permutations (4! = 24 total possible)
    // Expect to see at least 15 different ones in 100 trials
    if (permutations.size < 15) {
        throw new Error(`Too few permutations: ${permutations.size}/24 (expected ≥15)`);
    }

    console.log(`✓ Shuffle variety test passed (${permutations.size}/24 permutations seen)`);
}

/**
 * Test 8: Regression test for consecutive seed correlation bug
 */
function testConsecutiveSeedRegression() {
    const baseSeed = 123456;
    const players = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];

    // Simulate what happens in the tournament with consecutive round numbers
    const benchedPlayers = [];
    for (let round = 0; round < 10; round++) {
        const rng = new Mulberry32(baseSeed + round);
        const shuffled = rng.shuffle([...players]);
        const benched = shuffled.slice(4, 6).sort().join(',');
        benchedPlayers.push(benched);
    }

    // Count unique benched pairs
    const uniquePairs = new Set(benchedPlayers);

    // Should have good variety (at least 6 different pairs in 10 rounds)
    if (uniquePairs.size < 6) {
        console.log('Benched pairs:', benchedPlayers);
        throw new Error(`Regression: Too little variety in benched pairs: ${uniquePairs.size}/10 unique (expected ≥6)`);
    }

    // Count consecutive repeats (same pair benched in round N and N+1)
    let consecutiveRepeats = 0;
    for (let i = 0; i < benchedPlayers.length - 1; i++) {
        if (benchedPlayers[i] === benchedPlayers[i + 1]) {
            consecutiveRepeats++;
        }
    }

    // Should rarely have the same pair benched consecutively
    // With 15 possible pairs (C(6,2)), expect 1/15 ≈ 6.7% chance
    // In 9 transitions, expect ~0.6 repeats. Allow up to 2.
    if (consecutiveRepeats > 2) {
        console.log('Benched pairs:', benchedPlayers);
        throw new Error(`Regression: Too many consecutive repeats: ${consecutiveRepeats}/9 (expected ≤2)`);
    }

    console.log(`✓ Consecutive seed regression test passed (${uniquePairs.size} unique pairs, ${consecutiveRepeats} consecutive repeats)`);
}

/**
 * Run all tests
 */
function runAllTests() {
    console.log('\n=== MULBERRY32 RNG TESTS ===\n');

    try {
        testOutputRange();
        testDeterminism();
        testDifferentSeeds();
        testUniformDistribution();
        testNoAutocorrelation();
        testAvalancheEffect();
        testShuffleVariety();
        testConsecutiveSeedRegression();

        console.log('\n✅ All Mulberry32 tests passed!\n');
        return true;
    } catch (err) {
        console.error('\n❌ Test failed:', err.message);
        console.error(err.stack);
        return false;
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const success = runAllTests();
    process.exit(success ? 0 : 1);
}

export { runAllTests };
