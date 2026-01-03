/**
 * WalletService Unit Tests
 */

import WalletService from '@/core/application/services/wallet/wallet.service';
import { Company } from '../../../../src/infrastructure/database/mongoose/models';
import { WalletTransaction } from '../../../../src/infrastructure/database/mongoose/models';
import mongoose from 'mongoose';

// Mock the models
jest.mock('../../../../src/infrastructure/database/mongoose/models/organization/core/company.model');
jest.mock('../../../../src/infrastructure/database/mongoose/models/finance/wallets/wallet-transaction.model');
jest.mock('@/shared/logger/winston.logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));

describe('WalletService', () => {
    const mockCompanyId = new mongoose.Types.ObjectId().toString();
    const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (mongoose.startSession as jest.Mock) = jest.fn().mockResolvedValue(mockSession);
    });

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
            const mockCompany = { wallet: mockWallet };

            (Company.findById as jest.Mock).mockImplementation(() => ({
                select: jest.fn().mockResolvedValue(mockCompany),
                session: jest.fn().mockResolvedValue(mockCompany),
            }));

            (WalletTransaction.create as jest.Mock).mockResolvedValue([
                { _id: 'txn123', balanceAfter: 1500 },
            ]);

            (Company.findByIdAndUpdate as jest.Mock).mockReturnValue({
                session: jest.fn().mockReturnThis(),
            });
            (Company.findByIdAndUpdate as jest.Mock).mockResolvedValue({ wallet: { balance: 1500 } });

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

            (Company.findById as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue({ wallet: mockWallet }),
            });

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
            const mockCompany = { wallet: mockWallet };
            const rtoEventId = new mongoose.Types.ObjectId().toString();

            (Company.findById as jest.Mock).mockImplementation(() => ({
                select: jest.fn().mockResolvedValue(mockCompany),
                session: jest.fn().mockResolvedValue(mockCompany),
            }));

            (WalletTransaction.create as jest.Mock).mockResolvedValue([
                { _id: 'txn123', balanceAfter: 950 },
            ]);

            (Company.findByIdAndUpdate as jest.Mock).mockResolvedValue({ wallet: { balance: 950 } });

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
            const mockCompany = { wallet: mockWallet };
            const shipmentId = new mongoose.Types.ObjectId().toString();

            (Company.findById as jest.Mock).mockImplementation(() => ({
                select: jest.fn().mockResolvedValue(mockCompany),
                session: jest.fn().mockResolvedValue(mockCompany),
            }));

            (WalletTransaction.create as jest.Mock).mockResolvedValue([
                { _id: 'txn123', balanceAfter: 400 },
            ]);

            (Company.findByIdAndUpdate as jest.Mock).mockResolvedValue({ wallet: { balance: 400 } });

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
            const mockCompany = { wallet: mockWallet };
            const shipmentId = new mongoose.Types.ObjectId().toString();

            (Company.findById as jest.Mock).mockImplementation(() => ({
                select: jest.fn().mockResolvedValue(mockCompany),
                session: jest.fn().mockResolvedValue(mockCompany),
            }));

            (WalletTransaction.create as jest.Mock).mockResolvedValue([
                { _id: 'txn123', balanceAfter: 1500 },
            ]);

            (Company.findByIdAndUpdate as jest.Mock).mockResolvedValue({ wallet: { balance: 1500 } });

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
});
