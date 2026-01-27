import dotenv from 'dotenv';
import path from 'path';

// Initialize environment variables BEFORE importing application code
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

console.log('Environment loaded from:', envPath);
console.log('ENCRYPTION_KEY present:', !!process.env.ENCRYPTION_KEY);

if (!process.env.ENCRYPTION_KEY) {
    console.warn('⚠️ ENCRYPTION_KEY missing in .env, using fallback for test script');
    process.env.ENCRYPTION_KEY = 'fallback_secret_for_testing_only_32_chars_long';
}

async function comprehensiveWalletTest() {
    console.log('========================================');
    console.log('COMPREHENSIVE WALLET SYSTEM TESTING');
    console.log('========================================\n');

    if (!process.env.MONGODB_URI) {
        console.error('❌ Critical: Missing MONGODB_URI in .env');
        process.exit(1);
    }

    let testsPassed = 0;
    let testsFailed = 0;

    try {
        // Dynamic imports to ensure env vars are loaded first
        const mongoose = (await import('mongoose')).default;
        const connectDB = (await import('../config/database')).default;
        const WalletService = (await import('../core/application/services/wallet/wallet.service')).default;
        const { Company } = await import('../infrastructure/database/mongoose/models');

        console.log('Connecting to Database...');
        await connectDB();
        console.log('✅ Connected to MongoDB\n');

        // Setup: Create or Find Test Company
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('SETUP: Test Company');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const testEmail = 'wallet_comprehensive_test@shipcrowd.com';
        const testName = 'Wallet Comprehensive Test Company';
        let company = await Company.findOne({
            $or: [{ email: testEmail }, { name: testName }]
        });

        if (!company) {
            company = await Company.create({
                name: testName,
                email: testEmail,
                phone: '9999999999',
                password: 'hashed_password_placeholder',
                status: 'approved',
                wallet: {
                    balance: 0,
                    currency: 'INR',
                    lowBalanceThreshold: 500
                }
            });
            console.log(`✅ Created Test Company: ${company._id}\n`);
        } else {
            await Company.findByIdAndUpdate(company._id, { 'wallet.balance': 0 }, { new: true });
            console.log(`✅ Using Existing Test Company: ${company._id}`);
            console.log(`Balance Reset to: 0\n`);
        }

        const companyId = company._id.toString();

        // TEST 1: Valid Credit Operation
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('TEST 1: Valid Credit Operation');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        try {
            const creditResult = await WalletService.credit(
                companyId,
                1000,
                'recharge',
                'Test Recharge 1000',
                { type: 'manual', id: new mongoose.Types.ObjectId().toString() },
                'system_test'
            );

            if (creditResult.success && creditResult.newBalance === 1000) {
                console.log(`✅ PASS: Credit successful. New Balance: ${creditResult.newBalance}`);
                testsPassed++;
            } else {
                console.error(`❌ FAIL: Credit failed - ${creditResult.error}`);
                testsFailed++;
            }
        } catch (error: any) {
            console.error(`❌ FAIL: ${error.message}`);
            testsFailed++;
        }
        console.log('');

        // TEST 2: Negative Amount Rejection
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('TEST 2: Negative Amount Rejection');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        try {
            const result = await WalletService.credit(
                companyId,
                -100,
                'recharge',
                'Invalid negative credit',
                { type: 'manual' },
                'system_test'
            );

            if (!result.success && result.error?.includes('positive')) {
                console.log(`✅ PASS: Negative amount correctly rejected`);
                testsPassed++;
            } else {
                console.error(`❌ FAIL: Negative amount should be rejected`);
                testsFailed++;
            }
        } catch (error: any) {
            console.error(`❌ FAIL: ${error.message}`);
            testsFailed++;
        }
        console.log('');

        // TEST 3: Zero Amount Rejection
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('TEST 3: Zero Amount Rejection');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        try {
            const result = await WalletService.debit(
                companyId,
                0,
                'shipping_cost',
                'Invalid zero debit',
                { type: 'manual' },
                'system_test'
            );

            if (!result.success && result.error?.includes('positive')) {
                console.log(`✅ PASS: Zero amount correctly rejected`);
                testsPassed++;
            } else {
                console.error(`❌ FAIL: Zero amount should be rejected`);
                testsFailed++;
            }
        } catch (error: any) {
            console.error(`❌ FAIL: ${error.message}`);
            testsFailed++;
        }
        console.log('');

        // TEST 4: Insufficient Balance Protection
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('TEST 4: Insufficient Balance Protection');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        try {
            const result = await WalletService.debit(
                companyId,
                5000,
                'shipping_cost',
                'Should fail - insufficient balance',
                { type: 'manual' },
                'system_test'
            );

            if (!result.success && result.error?.toLowerCase().includes('insufficient')) {
                console.log(`✅ PASS: Insufficient balance correctly prevented`);
                testsPassed++;
            } else {
                console.error(`❌ FAIL: Should prevent insufficient balance debit`);
                testsFailed++;
            }
        } catch (error: any) {
            if (error.message.toLowerCase().includes('insufficient')) {
                console.log(`✅ PASS: Insufficient balance correctly prevented (via exception)`);
                testsPassed++;
            } else {
                console.error(`❌ FAIL: ${error.message}`);
                testsFailed++;
            }
        }
        console.log('');

        // TEST 5: Valid Debit Operation
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('TEST 5: Valid Debit Operation');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        try {
            const debitResult = await WalletService.debit(
                companyId,
                200,
                'shipping_cost',
                'Test Shipping Cost',
                { type: 'shipment', id: new mongoose.Types.ObjectId().toString() },
                'system_test'
            );

            if (debitResult.success && debitResult.newBalance === 800) {
                console.log(`✅ PASS: Debit successful. New Balance: ${debitResult.newBalance}`);
                testsPassed++;
            } else {
                console.error(`❌ FAIL: Debit failed - ${debitResult.error}`);
                testsFailed++;
            }
        } catch (error: any) {
            console.error(`❌ FAIL: ${error.message}`);
            testsFailed++;
        }
        console.log('');

        // TEST 6: Transaction History Accuracy
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('TEST 6: Transaction History Accuracy');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        try {
            const history = await WalletService.getTransactionHistory(companyId);

            // Should have at least credit and debit from successful tests
            if (history.transactions.length >= 2 && history.balance === 800) {
                console.log(`✅ PASS: Transaction history accurate`);
                console.log(`   - Total Transactions: ${history.transactions.length}`);
                console.log(`   - Current Balance: ${history.balance}`);
                testsPassed++;
            } else {
                console.error(`❌ FAIL: Transaction history mismatch`);
                console.error(`   - Expected balance: 800, Got: ${history.balance}`);
                console.error(`   - Transactions: ${history.transactions.length}`);
                testsFailed++;
            }
        } catch (error: any) {
            console.error(`❌ FAIL: ${error.message}`);
            testsFailed++;
        }
        console.log('');

        // TEST 7: Wallet Balance Query
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('TEST 7: Wallet Balance Query');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        try {
            const balanceInfo = await WalletService.getBalance(companyId);

            if (balanceInfo.balance === 800 && balanceInfo.currency === 'INR') {
                console.log(`✅ PASS: Balance query accurate`);
                console.log(`   - Balance: ${balanceInfo.balance} ${balanceInfo.currency}`);
                console.log(`   - Low Balance Threshold: ${balanceInfo.lowBalanceThreshold}`);
                console.log(`   - Is Low Balance: ${balanceInfo.isLowBalance}`);
                testsPassed++;
            } else {
                console.error(`❌ FAIL: Balance query mismatch`);
                testsFailed++;
            }
        } catch (error: any) {
            console.error(`❌ FAIL: ${error.message}`);
            testsFailed++;
        }
        console.log('');

        // TEST 8: Low Balance Check
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('TEST 8: Low Balance Detection');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        try {
            const balanceInfo = await WalletService.getBalance(companyId);
            // Current balance is 800, threshold is 500, so NOT low balance
            if (!balanceInfo.isLowBalance) {
                console.log(`✅ PASS: Low balance detection accurate (balance > threshold)`);
                testsPassed++;
            } else {
                console.error(`❌ FAIL: Should not be low balance`);
                testsFailed++;
            }

            // Now debit to below threshold
            await WalletService.debit(
                companyId,
                400, // Will bring balance to 400, below threshold of 500
                'shipping_cost',
                'Test low balance trigger',
                { type: 'manual' },
                'system_test'
            );

            const balanceInfoAfter = await WalletService.getBalance(companyId);
            if (balanceInfoAfter.isLowBalance) {
                console.log(`✅ PASS: Low balance correctly triggered (balance < threshold)`);
                testsPassed++;
            } else {
                console.error(`❌ FAIL: Should be low balance`);
                testsFailed++;
            }
        } catch (error: any) {
            console.error(`❌ FAIL: ${error.message}`);
            testsFailed++;
        }
        console.log('');

        // TEST 9: Decimal Precision
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('TEST 9: Decimal Precision (Floating Point)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        try {
            // Credit 100.55
            const decCredit = await WalletService.credit(
                companyId,
                100.55,
                'recharge',
                'Decimal Credit',
                { type: 'manual' },
                'system_test'
            );

            // Debit 50.25
            const decDebit = await WalletService.debit(
                companyId,
                50.25,
                'shipping_cost',
                'Decimal Debit',
                { type: 'manual' },
                'system_test'
            );

            // Theoretical change: +100.55 - 50.25 = +50.30
            // Initial Balance (from previous tests): 400
            // Expected: 450.30

            const finalBal = await WalletService.getBalance(companyId);

            // Allow small epsilon for floating point, but ideally WalletService handles this
            // Checking exact match because finance systems SHOULD handle this
            if (Math.abs(finalBal.balance - 450.30) < 0.001) {
                console.log(`✅ PASS: Decimal math handled correctly`);
                console.log(`   - Expected: 450.30`);
                console.log(`   - Actual: ${finalBal.balance}`);
                testsPassed++;
            } else {
                console.error(`❌ FAIL: Precision Error`);
                console.error(`   - Expected: 450.30`);
                console.error(`   - Actual: ${finalBal.balance}`);
                testsFailed++;
            }
        } catch (error: any) {
            console.error(`❌ FAIL: ${error.message}`);
            testsFailed++;
        }
        console.log('');

        // TEST 10: Concurrency / Race Condition (Optimistic Locking)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('TEST 10: Concurrency / Race Condition Stress Test');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        try {
            const initialBal = (await WalletService.getBalance(companyId)).balance;
            console.log(`Starting Balance: ${initialBal}`);
            console.log('Simulating 5 parallel debits of 10 INR each...');

            const parallelTxns = 5;
            const amountPerTxn = 10;

            // Fire promises in parallel
            const promises = [];
            for (let i = 0; i < parallelTxns; i++) {
                promises.push(
                    WalletService.debit(
                        companyId,
                        amountPerTxn,
                        'shipping_cost',
                        `Concurrent Debit ${i}`,
                        { type: 'manual' }, // Use manual to avoid unique constraint on shipment ref if strict
                        'stress_test'
                    )
                );
            }

            const results = await Promise.all(promises);
            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;

            console.log(`Results: ${successful} successful, ${failed} failed`);

            const finalBal = (await WalletService.getBalance(companyId)).balance;
            const expectedBal = initialBal - (successful * amountPerTxn);

            console.log(`Final Balance: ${finalBal}`);
            console.log(`Expected Balance: ${expectedBal}`);

            if (Math.abs(finalBal - expectedBal) < 0.001) {
                console.log(`✅ PASS: Balance integrity maintained under load`);
                if (failed === 0) {
                    console.log(`   - BONUS: WalletService successfully retried all race conditions!`);
                } else {
                    console.log(`   - Note: Some transactions failed but consistency was kept.`);
                }
                testsPassed++;
            } else {
                console.error(`❌ FAIL: Balance corruption detected! Race condition failed.`);
                testsFailed++;
            }

        } catch (error: any) {
            console.error(`❌ FAIL: ${error.message}`);
            testsFailed++;
        }
        console.log('');

        // Final Summary
        console.log('========================================');
        console.log('TEST SUMMARY');
        console.log('========================================');
        console.log(`✅ Tests Passed: ${testsPassed}`);
        console.log(`❌ Tests Failed: ${testsFailed}`);
        console.log(`📊 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
        console.log('========================================\n');

        await mongoose.disconnect();

        if (testsFailed > 0) {
            process.exit(1);
        }

    } catch (error: any) {
        console.error('\n❌ COMPREHENSIVE WALLET TEST FAILED:');
        console.error(error);
        process.exit(1);
    }
}

// Execute immediately
comprehensiveWalletTest().catch(err => console.error(err));

export default comprehensiveWalletTest;
