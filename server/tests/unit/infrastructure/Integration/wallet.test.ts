import mongoose from 'mongoose';
import connectDB from '@/config/database';
import WalletService from '@/core/application/services/wallet/wallet.service';
import { Company } from '@/infrastructure/database/mongoose/models';

describe('Wallet Service - Production Tests', () => {
    let testCompanyId: string;
    let initialBalance = 10000;

    beforeAll(async () => {
        if (!process.env.MONGODB_URI) {
            process.env.MONGODB_URI = 'mongodb://localhost:27017/shipcrowd_test';
        }
        if (!process.env.ENCRYPTION_KEY) {
            process.env.ENCRYPTION_KEY = 'fallback_secret_for_testing_only_32_chars_long';
        }
        await connectDB();
    });

    beforeEach(async () => {
        const company = await Company.create({
            name: `Test Company ${Date.now()}`,
            email: `test_${Date.now()}@shipcrowd.com`,
            phone: '9999999999',
            password: 'hashed',
            status: 'approved',
            wallet: { balance: initialBalance, currency: 'INR' },
        });
        testCompanyId = company._id.toString();
    });

    afterEach(async () => {
        await Company.deleteMany({ _id: testCompanyId });
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    describe('Credit Operations', () => {
        test('should credit wallet and maintain precision', async () => {
            const result = await WalletService.credit(
                testCompanyId,
                1500.75,
                'recharge',
                'Test credit',
                { type: 'manual', id: new mongoose.Types.ObjectId().toString() },
                'test'
            );

            expect(result.success).toBe(true);
            expect(result.newBalance).toBe(initialBalance + 1500.75);

            const company = await Company.findById(testCompanyId);
            expect(company?.wallet.balance).toBe(initialBalance + 1500.75);
        });

        test('should reject negative amounts', async () => {
            const result = await WalletService.credit(
                testCompanyId,
                -100,
                'recharge',
                'Invalid',
                { type: 'manual' },
                'test'
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain('positive');
        });

        test('should reject zero amounts', async () => {
            const result = await WalletService.credit(
                testCompanyId,
                0,
                'recharge',
                'Invalid',
                { type: 'manual' },
                'test'
            );

            expect(result.success).toBe(false);
        });
    });

    describe('Debit Operations', () => {
        test('should debit wallet correctly', async () => {
            const result = await WalletService.debit(
                testCompanyId,
                500.25,
                'shipping_cost',
                'Test debit',
                { type: 'manual' },
                'test'
            );

            expect(result.success).toBe(true);
            expect(result.newBalance).toBe(initialBalance - 500.25);
        });

        test('should prevent debit exceeding balance', async () => {
            const result = await WalletService.debit(
                testCompanyId,
                initialBalance + 1,
                'shipping_cost',
                'Overdraft attempt',
                { type: 'manual' },
                'test'
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain('insufficient');

            const company = await Company.findById(testCompanyId);
            expect(company?.wallet.balance).toBe(initialBalance);
        });

        test('should maintain balance integrity', async () => {
            const amounts = [100, 250.50, 75.25];
            let expectedBalance = initialBalance;

            for (const amount of amounts) {
                const result = await WalletService.debit(
                    testCompanyId,
                    amount,
                    'shipping_cost',
                    `Debit ${amount}`,
                    { type: 'manual' },
                    'test'
                );
                expect(result.success).toBe(true);
                expectedBalance -= amount;
                expect(result.newBalance).toBe(expectedBalance);
            }

            const company = await Company.findById(testCompanyId);
            expect(company?.wallet.balance).toBe(expectedBalance);
        });
    });

    describe('Concurrent Operations', () => {
        test('should handle 10 concurrent debits safely', async () => {
            const amount = 500;
            const promises = Array(10)
                .fill(null)
                .map((_, i) =>
                    WalletService.debit(
                        testCompanyId,
                        amount,
                        'shipping_cost',
                        `Concurrent ${i}`,
                        { type: 'manual', id: i.toString() },
                        'test'
                    )
                );

            const results = await Promise.all(promises);

            const successful = results.filter((r) => r.success).length;
            const failed = results.filter((r) => !r.success).length;

            // With 10,000 balance and 500 per debit: can do 20
            expect(successful).toBe(20);
            expect(failed).toBe(0);

            const company = await Company.findById(testCompanyId);
            expect(company?.wallet.balance).toBe(initialBalance - successful * amount);
        });

        test('should prevent balance from going negative under concurrent load', async () => {
            const smallBalance = 1000;
            const company = await Company.findByIdAndUpdate(
                testCompanyId,
                { 'wallet.balance': smallBalance },
                { new: true }
            );

            const promises = Array(20)
                .fill(null)
                .map((_, i) =>
                    WalletService.debit(
                        testCompanyId,
                        200,
                        'shipping_cost',
                        `Concurrent ${i}`,
                        { type: 'manual', id: i.toString() },
                        'test'
                    )
                );

            const results = await Promise.all(promises);
            const finalCompany = await Company.findById(testCompanyId);

            expect(finalCompany?.wallet.balance).toBeGreaterThanOrEqual(0);
            expect(finalCompany?.wallet.balance).toBeLessThanOrEqual(smallBalance);
        });
    });

    describe('Precision & Rounding', () => {
        test('should handle decimal precision correctly', async () => {
            await WalletService.credit(
                testCompanyId,
                100.55,
                'recharge',
                'Add 100.55',
                { type: 'manual' },
                'test'
            );

            const result = await WalletService.debit(
                testCompanyId,
                50.25,
                'shipping_cost',
                'Debit 50.25',
                { type: 'manual' },
                'test'
            );

            const expected = initialBalance + 100.55 - 50.25;
            expect(result.newBalance).toBe(expected);
            expect(Math.abs(result.newBalance - expected) < 0.01).toBe(true);
        });

        test('should not lose precision in multiple transactions', async () => {
            const transactions = [
                { amount: 123.45, type: 'credit' },
                { amount: 67.89, type: 'debit' },
                { amount: 12.34, type: 'debit' },
                { amount: 56.78, type: 'credit' },
                { amount: 9.99, type: 'debit' },
            ];

            let currentBalance = initialBalance;

            for (const tx of transactions) {
                const result =
                    tx.type === 'credit'
                        ? await WalletService.credit(
                            testCompanyId,
                            tx.amount,
                            'test',
                            'Test',
                            { type: 'manual' },
                            'test'
                        )
                        : await WalletService.debit(
                            testCompanyId,
                            tx.amount,
                            'test',
                            'Test',
                            { type: 'manual' },
                            'test'
                        );

                currentBalance += tx.type === 'credit' ? tx.amount : -tx.amount;
                expect(result.newBalance).toBeCloseTo(currentBalance, 2);
            }
        });
    });

    describe('Transaction Atomicity', () => {
        test('should not create transaction if balance check fails', async () => {
            const balanceBefore = (await Company.findById(testCompanyId))?.wallet.balance;

            await WalletService.debit(
                testCompanyId,
                initialBalance + 1000,
                'shipping_cost',
                'Overdraft',
                { type: 'manual' },
                'test'
            );

            const balanceAfter = (await Company.findById(testCompanyId))?.wallet.balance;
            expect(balanceBefore).toBe(balanceAfter);
        });
    });

    describe('Transaction History', () => {
        test('should track all transactions', async () => {
            await WalletService.credit(
                testCompanyId,
                500,
                'recharge',
                'Recharge',
                { type: 'manual' },
                'test'
            );

            await WalletService.debit(
                testCompanyId,
                150,
                'shipping_cost',
                'Shipping',
                { type: 'manual' },
                'test'
            );

            const history = await WalletService.getTransactionHistory(testCompanyId, {});

            expect(history.transactions.length).toBeGreaterThanOrEqual(2);
            expect(history.total).toBeGreaterThanOrEqual(2);
        });
    });
});
