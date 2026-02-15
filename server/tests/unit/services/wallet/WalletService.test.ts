/**
 * WalletService Unit Tests
 */

import WalletService from '@/core/application/services/wallet/wallet.service';
import crypto from 'crypto';
import mongoose from 'mongoose';
import Razorpay from 'razorpay';
import { Company, WalletTransaction } from '../../../../src/infrastructure/database/mongoose/models';

// Mock the models
jest.mock('../../../../src/infrastructure/database/mongoose/models', () => ({
    Company: {
        findById: jest.fn(),
        findOneAndUpdate: jest.fn(),
        findByIdAndUpdate: jest.fn(),
        exists: jest.fn(),
        updateOne: jest.fn(),
    },
    WalletTransaction: {
        create: jest.fn(),
        findOne: jest.fn(),
        findById: jest.fn(),
        findByIdAndUpdate: jest.fn(),
        aggregate: jest.fn(),
        getTransactionHistory: jest.fn(),
    },
}));
jest.mock('@/shared/logger/winston.logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));
jest.mock('razorpay', () => jest.fn());

describe('WalletService', () => {
    const mockCompanyId = new mongoose.Types.ObjectId().toString();
    const originalKeyId = process.env.RAZORPAY_KEY_ID;
    const originalKeySecret = process.env.RAZORPAY_KEY_SECRET;
    const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (mongoose.startSession as jest.Mock) = jest.fn().mockResolvedValue(mockSession);
        process.env.RAZORPAY_KEY_ID = 'rzp_test_key';
        process.env.RAZORPAY_KEY_SECRET = 'secret_test_key';
    });

    afterAll(() => {
        if (originalKeyId === undefined) {
            delete process.env.RAZORPAY_KEY_ID;
        } else {
            process.env.RAZORPAY_KEY_ID = originalKeyId;
        }

        if (originalKeySecret === undefined) {
            delete process.env.RAZORPAY_KEY_SECRET;
        } else {
            process.env.RAZORPAY_KEY_SECRET = originalKeySecret;
        }
    });

    const mockFindOneAndUpdateChain = (result: any) => {
        (Company.findOneAndUpdate as jest.Mock).mockReturnValue({
            select: jest.fn().mockReturnValue({
                session: jest.fn().mockResolvedValue(result),
            }),
        });
    };

    const mockFindByIdSessionChain = (result: any) => {
        (Company.findById as jest.Mock).mockReturnValue({
            select: jest.fn().mockReturnValue({
                session: jest.fn().mockResolvedValue(result),
            }),
            session: jest.fn().mockResolvedValue(result),
        });
    };

    describe('getBalance', () => {
        it('should return wallet balance for existing company', async () => {
            const mockWallet = {
                balance: 1000,
                currency: 'INR',
                lastUpdated: new Date(),
                lowBalanceThreshold: 500,
            };

            (Company.findById as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue({ wallet: mockWallet }),
            });

            const result = await WalletService.getBalance(mockCompanyId);

            expect(result.balance).toBe(1000);
            expect(result.currency).toBe('INR');
            expect(result.isLowBalance).toBe(false);
        });

        it('should indicate low balance when below threshold', async () => {
            const mockWallet = {
                balance: 200,
                currency: 'INR',
                lowBalanceThreshold: 500,
            };

            (Company.findById as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue({ wallet: mockWallet }),
            });

            const result = await WalletService.getBalance(mockCompanyId);

            expect(result.balance).toBe(200);
            expect(result.isLowBalance).toBe(true);
        });

        it('should throw error if company not found', async () => {
            (Company.findById as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue(null),
            });

            await expect(WalletService.getBalance(mockCompanyId)).rejects.toThrow(
                'Company not found'
            );
        });
    });

    describe('hasMinimumBalance', () => {
        it('should return true when balance is sufficient', async () => {
            const mockWallet = {
                balance: 1000,
                currency: 'INR',
                lowBalanceThreshold: 500,
            };

            (Company.findById as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue({ wallet: mockWallet }),
            });

            const result = await WalletService.hasMinimumBalance(mockCompanyId, 500);

            expect(result).toBe(true);
        });

        it('should return false when balance is insufficient', async () => {
            const mockWallet = {
                balance: 100,
                currency: 'INR',
                lowBalanceThreshold: 500,
            };

            (Company.findById as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue({ wallet: mockWallet }),
            });

            const result = await WalletService.hasMinimumBalance(mockCompanyId, 500);

            expect(result).toBe(false);
        });
    });

    describe('credit', () => {
        it('should add funds to wallet successfully', async () => {
            const mockWallet = { balance: 1000, currency: 'INR', lowBalanceThreshold: 500 };
            const mockCompany = {
                _id: mockCompanyId,
                wallet: mockWallet,
                __v: 0,
            };

            mockFindByIdSessionChain(mockCompany);

            // Mock WalletTransaction.create with session
            (WalletTransaction.create as jest.Mock).mockResolvedValue([
                { _id: 'txn123', balanceAfter: 1500 },
            ]);

            mockFindOneAndUpdateChain({
                wallet: { balance: 1500 },
                __v: 1,
            });

            const result = await WalletService.credit(
                mockCompanyId,
                500,
                'recharge',
                'Test recharge'
            );

            expect(result.success).toBe(true);
            expect(result.newBalance).toBe(1500);
        });
    });

    describe('debit', () => {
        it('should fail when insufficient balance', async () => {
            const mockWallet = {
                balance: 100,
                currency: 'INR',
                lowBalanceThreshold: 500,
            };

            const mockCompany = {
                _id: mockCompanyId,
                wallet: mockWallet,
                __v: 0,
            };

            mockFindByIdSessionChain(mockCompany);
            mockFindOneAndUpdateChain(null);

            const result = await WalletService.debit(
                mockCompanyId,
                500,
                'shipping_cost',
                'Test shipping cost'
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain('Insufficient balance');
        });
    });

    describe('handleRTOCharge', () => {
        it('should deduct RTO charges from wallet', async () => {
            const mockWallet = { balance: 1000, currency: 'INR', lowBalanceThreshold: 500 };
            const mockCompany = {
                _id: mockCompanyId,
                wallet: mockWallet,
                __v: 0,
            };
            const rtoEventId = new mongoose.Types.ObjectId().toString();

            mockFindByIdSessionChain(mockCompany);

            // Mock WalletTransaction.create
            (WalletTransaction.create as jest.Mock).mockResolvedValue([
                { _id: 'txn123', balanceAfter: 950 },
            ]);

            mockFindOneAndUpdateChain({
                wallet: { balance: 950 },
                __v: 1,
            });

            const result = await WalletService.handleRTOCharge(
                mockCompanyId,
                rtoEventId,
                50,
                'AWB12345'
            );

            expect(result.success).toBe(true);
            expect(result.newBalance).toBe(950);
        });
    });

    describe('handleShippingCost', () => {
        it('should deduct shipping cost from wallet', async () => {
            const mockWallet = { balance: 500, currency: 'INR', lowBalanceThreshold: 100 };
            const mockCompany = {
                _id: mockCompanyId,
                wallet: mockWallet,
                __v: 0,
            };
            const shipmentId = new mongoose.Types.ObjectId().toString();

            mockFindByIdSessionChain(mockCompany);

            // Mock WalletTransaction.create
            (WalletTransaction.create as jest.Mock).mockResolvedValue([
                { _id: 'txn123', balanceAfter: 400 },
            ]);

            mockFindOneAndUpdateChain({
                wallet: { balance: 400 },
                __v: 1,
            });

            const result = await WalletService.handleShippingCost(
                mockCompanyId,
                shipmentId,
                100,
                'AWB12345'
            );

            expect(result.success).toBe(true);
        });
    });

    describe('handleCODRemittance', () => {
        it('should credit COD amount to wallet', async () => {
            const mockWallet = { balance: 1000, currency: 'INR', lowBalanceThreshold: 500 };
            const mockCompany = {
                _id: mockCompanyId,
                wallet: mockWallet,
                __v: 0,
            };
            const shipmentId = new mongoose.Types.ObjectId().toString();

            mockFindByIdSessionChain(mockCompany);

            // Mock WalletTransaction.create
            (WalletTransaction.create as jest.Mock).mockResolvedValue([
                { _id: 'txn123', balanceAfter: 1500 },
            ]);

            mockFindOneAndUpdateChain({
                wallet: { balance: 1500 },
                __v: 1,
            });

            const result = await WalletService.handleCODRemittance(
                mockCompanyId,
                500,
                shipmentId,
                'AWB12345'
            );

            expect(result.success).toBe(true);
            expect(result.newBalance).toBe(1500);
        });
    });

    describe('handleRecharge validation', () => {
        it('should fail when Razorpay credentials are missing', async () => {
            delete process.env.RAZORPAY_KEY_ID;
            delete process.env.RAZORPAY_KEY_SECRET;

            const result = await WalletService.handleRecharge(
                mockCompanyId,
                5000,
                'pay_test_1',
                'order_test_1',
                'sig_test_1',
                'user_1'
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('Razorpay configuration missing');
            expect(Razorpay as unknown as jest.Mock).not.toHaveBeenCalled();
        });

        it('should reject payment when purpose/type conflicts with wallet recharge', async () => {
            const paymentId = 'pay_test_2';
            const orderId = 'order_test_2';
            const signature = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET as string)
                .update(`${orderId}|${paymentId}`)
                .digest('hex');

            const fetchMock = jest.fn().mockResolvedValue({
                id: paymentId,
                order_id: orderId,
                amount: 500000,
                status: 'captured',
                currency: 'INR',
                notes: {
                    companyId: mockCompanyId,
                    purpose: 'auto-recharge',
                },
            });

            (Razorpay as unknown as jest.Mock).mockImplementation(() => ({
                payments: { fetch: fetchMock },
            }));

            const result = await WalletService.handleRecharge(
                mockCompanyId,
                5000,
                paymentId,
                orderId,
                signature,
                'user_1'
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('Payment purpose mismatch');
        });

        it('should reject payment when currency is not INR', async () => {
            const paymentId = 'pay_test_3';
            const orderId = 'order_test_3';
            const signature = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET as string)
                .update(`${orderId}|${paymentId}`)
                .digest('hex');

            const fetchMock = jest.fn().mockResolvedValue({
                id: paymentId,
                order_id: orderId,
                amount: 500000,
                status: 'captured',
                currency: 'USD',
                notes: {
                    companyId: mockCompanyId,
                    purpose: 'wallet_recharge',
                },
            });

            (Razorpay as unknown as jest.Mock).mockImplementation(() => ({
                payments: { fetch: fetchMock },
            }));

            const result = await WalletService.handleRecharge(
                mockCompanyId,
                5000,
                paymentId,
                orderId,
                signature,
                'user_1'
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('Unsupported payment currency: USD');
        });
    });
});
