import { execSync } from 'child_process';
import path from 'path';

console.log('================================================================');
console.log('🚀 SYSTEM-WIDE VERIFICATION SUITE');
console.log('================================================================\n');

const scripts = [
    {
        name: '1. Wallet System (Comprehensive)',
        file: 'verify-wallet-comprehensive.ts',
        description: 'Verifies precision, concurrency, and core wallet logic'
    },
    {
        name: '2. Razorpay Integration (Comprehensive)',
        file: 'verify-razorpay-comprehensive.ts',
        description: 'Verifies contacts, fund accounts, and webhooks'
    },
    {
        name: '3. End-to-End Finance Flow',
        file: 'verify-finance-e2e.ts',
        description: 'Verifies Order -> Shipment -> Remittance -> Payout flow'
    }
];

let totalPassed = 0;
let totalFailed = 0;

async function runAllTests() {
    for (const script of scripts) {
        console.log(`\n🔵 EXECUTING: ${script.name}`);
        console.log(`   Description: ${script.description}`);
        console.log('----------------------------------------------------------------');

        try {
            const scriptPath = path.join(__dirname, script.file);
            // Run script using npx tsx and inherit stdio to show real-time output
            execSync(`npx tsx "${scriptPath}"`, { stdio: 'inherit', cwd: process.cwd() });

            console.log(`\n✅ PASS: ${script.name}`);
            totalPassed++;
        } catch (error) {
            console.error(`\n❌ FAIL: ${script.name}`);
            console.error('   Execution stopped due to failure.');
            totalFailed++;
            process.exit(1);
        }
    }

    console.log('\n================================================================');
    console.log('🎉 VERIFICATION SUMMARY');
    console.log('================================================================');
    console.log(`✅ Modules Passed: ${totalPassed}/${scripts.length}`);
    console.log(`❌ Modules Failed: ${totalFailed}`);

    if (totalPassed === scripts.length) {
        console.log('\n🌟 RESULT: SYSTEM IS PRODUCTION READY');
        console.log('   All finance, payment, and wallet subsystems are fully operational.');
    } else {
        console.log('\n⚠️ RESULT: SYSTEM NEEDS ATTENTION');
    }
    console.log('================================================================\n');
}

runAllTests().catch(err => console.error(err));
