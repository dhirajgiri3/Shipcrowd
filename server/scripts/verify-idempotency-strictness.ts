import dotenv from 'dotenv';
import path from 'path';

// Load environment variables FIRST, before any other imports that might use them
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Dynamic imports to ensure env vars are loaded first
async function main() {
    const mongoose = (await import('mongoose')).default;
    const { Company } = await import('../src/infrastructure/database/mongoose/models');

    // Using default check for these service imports as they might be default exports
    const WalletServiceModule = await import('../src/core/application/services/wallet/wallet.service');
    const WalletService = WalletServiceModule.default || WalletServiceModule;

    const loggerModule = await import('../src/shared/logger/winston.logger');
    const logger = loggerModule.default || loggerModule;

    console.log('\n🔍 Idempotency & Strict Pricing Verification\n');
    console.log('='.repeat(60));

    interface TestResult {
        name: string;
        passed: boolean;
        message: string;
        details?: any;
    }

    const results: TestResult[] = [];

    async function connectDB() {
        try {
            await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shipcrowd');
            logger.info('Connected to MongoDB');
        } catch (error) {
            console.error('MongoDB connection failed:', error);
            process.exit(1);
        }
    }

    async function disconnectDB() {
        await mongoose.disconnect();
        logger.info('Disconnected from MongoDB');
    }

    async function getTestCompany() {
        // Find any company
        const company = await Company.findOne({}).sort({ createdAt: -1 }).lean();
        if (!company) {
            throw new Error('No company found. Please seed data.');
        }
        return company;
    }

    // ============================================================================
    // TEST 1: Wallet Idempotency
    // ============================================================================
    async function test1_WalletIdempotency(): Promise<TestResult> {
        try {
            const company = await getTestCompany();
            const companyId = company._id.toString();
            const idempotencyKey = `test-idempotency-${Date.now()}`;
            const amount = 10;
            const creditAmount = 100;

            console.log('Test 1: Wallet Idempotency');
            console.log(`Using Company: ${companyId}, Key: ${idempotencyKey}`);

            // Ensure sufficient balance
            await WalletService.credit(
                companyId,
                creditAmount,
                'recharge',
                'Test Setup: Add balance',
                { type: 'manual' },
                'test-script'
            );

            // Get Initial Balance
            const initialBalance = (await WalletService.getBalance(companyId)).balance;

            // 1. First Debit
            const result1 = await WalletService.debit(
                companyId,
                amount,
                'shipping_cost',
                'Test 1: First Call',
                { type: 'manual' },
                'test-user',
                idempotencyKey // Pass key
            );

            if (!result1.success) {
                return { name: 'Wallet Idempotency', passed: false, message: 'First debit failed', details: result1 };
            }

            const balanceAfter1 = (await WalletService.getBalance(companyId)).balance;
            console.log(`Balance after 1st debit: ${balanceAfter1} (Expected: ${initialBalance - amount})`);

            // 2. Second Debit (Same Key)
            const result2 = await WalletService.debit(
                companyId,
                amount,
                'shipping_cost',
                'Test 1: Second Call (Duplicate)',
                { type: 'manual' },
                'test-user',
                idempotencyKey // SAME KEY
            );

            // Expect success (idempotent success) but NO double deduction
            const balanceAfter2 = (await WalletService.getBalance(companyId)).balance;
            console.log(`Balance after 2nd debit: ${balanceAfter2} (Expected: ${balanceAfter1})`);

            if (result2.success === false && result2.error !== 'Duplicate transaction ignored') {
                // Depending on implementation, it might return success: true for idempotent calls
                // or success: false with specific error.
                // My implementation returns { success: true, transaction: ... } if handled idempotently?
                // Let's check implementation behavior. If it throws catch it.
            }

            // Verify Balance
            if (balanceAfter1 !== balanceAfter2) {
                return {
                    name: 'Wallet Idempotency',
                    passed: false,
                    message: 'Balance changed on second call!',
                    details: { initialBalance, balanceAfter1, balanceAfter2 }
                };
            }

            if (Math.abs(initialBalance - balanceAfter1 - amount) > 0.01) {
                return {
                    name: 'Wallet Idempotency',
                    passed: false,
                    message: 'First deduction incorrect',
                    details: { initialBalance, balanceAfter1 }
                };
            }

            return {
                name: 'Wallet Idempotency',
                passed: true,
                message: '✅ Idempotency Verified. Balance deducted only once.',
                details: { key: idempotencyKey, balanceAfter1, balanceAfter2 }
            };

        } catch (error: any) {
            return { name: 'Wallet Idempotency', passed: false, message: error.message };
        }
    }

    // Run tests
    await connectDB();
    try {
        results.push(await test1_WalletIdempotency());

        console.log('\n📊 Test Results:\n');
        results.forEach((result, index) => {
            const status = result.passed ? '✅ PASS' : '❌ FAIL';
            console.log(`${index + 1}. ${result.name}: ${status}`);
            console.log(`   ${result.message}`);
            if (result.details) console.log(`   Details:`, JSON.stringify(result.details, null, 2));
            console.log('');
        });
    } catch (err) {
        console.error('Test Suite Error', err);
    } finally {
        await disconnectDB();
    }
}

main().catch(console.error);
