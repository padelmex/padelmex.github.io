import { runTournamentTests } from './tournament.test.js';
import { runMatchmakingTests } from './matchmaking.test.js';
import { runAllTests as runMulberryTests } from './mulberry32.test.js';

async function main() {
    console.log('\n🏓 Running Paddle Tournament Tests...\n');

    const runner = runTournamentTests();
    runMatchmakingTests().tests.forEach(test => runner.test(test.name, test.fn));
    runner.test('Mulberry32 statistical properties', () => {
        if (!runMulberryTests()) {
            throw new Error('Mulberry32 suite reported a failure - see output above');
        }
    });

    const results = await runner.run();
    const summary = runner.getSummary();

    // Print results
    results.forEach(result => {
        if (result.passed) {
            console.log(`✅ ${result.name}`);
        } else {
            console.log(`❌ ${result.name}`);
            console.log(`   ${result.error}\n`);
        }
    });

    // Print summary
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Total: ${summary.total} | Passed: ${summary.passed} | Failed: ${summary.failed}`);
    console.log('='.repeat(70));

    if (summary.failed === 0) {
        console.log('\n✨ All tests passed!\n');
    } else {
        console.log(`\n❌ ${summary.failed} test(s) failed\n`);
    }

    // Exit with appropriate code
    process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch(err => {
    console.error('❌ Test runner error:', err);
    process.exit(1);
});
