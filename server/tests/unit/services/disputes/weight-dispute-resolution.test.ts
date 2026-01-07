
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import WeightDisputeResolutionService from '../../../../src/core/application/services/disputes/weight-dispute-resolution.service';
import WeightDispute from '../../../../src/infrastructure/database/mongoose/models/logistics/shipping/exceptions/weight-dispute.model';
import Shipment from '../../../../src/infrastructure/database/mongoose/models/logistics/shipping/core/shipment.model';
import WalletService from '../../../../src/core/application/services/wallet/wallet.service';
import { AppError, NotFoundError, AuthorizationError, ValidationError } from '../../../../src/shared/errors/app.error';

// Mock models and services
jest.mock('../../../../src/infrastructure/database/mongoose/models/logistics/shipping/exceptions/weight-dispute.model');
jest.mock('../../../../src/infrastructure/database/mongoose/models/logistics/shipping/core/shipment.model');
jest.mock('../../../../src/core/application/services/wallet/wallet.service');
jest.mock('../../../../src/shared/logger/winston.logger');

describe('WeightDisputeResolutionService', () => {
    const mockDisputeId = '654321654321654321654321';
    const mockCompanyId = '123456123456123456123456';
    const mockShipmentId = '987654987654987654987654';

    let mockDispute: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockDispute = {
            _id: mockDisputeId,
            disputeId: 'WD-20230101-ABCDE',
            companyId: { toString: () => mockCompanyId },
            shipmentId: mockShipmentId,
            status: 'pending',
            evidence: {},
            timeline: [],
            discrepancy: { percentage: 10 },
            financialImpact: { difference: 100 },
            resolution: {},
            save: jest.fn().mockResolvedValue(true),
        };

        (WeightDispute.findById as jest.Mock).mockResolvedValue(mockDispute);
        (WeightDispute.find as jest.Mock).mockResolvedValue([]);
        (Shipment.findByIdAndUpdate as jest.Mock).mockResolvedValue({});
    });

    describe('submitSellerEvidence', () => {
        it('should allow seller to submit evidence for pending dispute', async () => {
            const evidence = {
                photos: ['url1', 'url2'],
                notes: 'Test evidence'
            };

            const result = await WeightDisputeResolutionService.submitSellerResponse(
                mockDisputeId,
                mockCompanyId,
                evidence
            );

            expect(result.status).toBe('under_review');
            expect(result.evidence.sellerPhotos).toHaveLength(2);
            expect(result.timeline).toHaveLength(1);
            expect(result.save).toHaveBeenCalled();
            expect(Shipment.findByIdAndUpdate).toHaveBeenCalledWith(
                mockShipmentId,
                { 'weightDispute.status': 'under_review' }
            );
        });

        it('should throw error if company ID does not match', async () => {
            await expect(WeightDisputeResolutionService.submitSellerResponse(
                mockDisputeId,
                'wrong_company_id',
                {}
            )).rejects.toThrow(AuthorizationError);
        });

        it('should throw error if dispute is not pending', async () => {
            mockDispute.status = 'resolved';

            await expect(WeightDisputeResolutionService.submitSellerResponse(
                mockDisputeId,
                mockCompanyId,
                {}
            )).rejects.toThrow(AppError);
        });
    });

    describe('resolveDispute', () => {
        it('should process refund for seller_favor outcome', async () => {
            (WalletService.credit as jest.Mock).mockResolvedValue({
                success: true,
                transactionId: '507f1f77bcf86cd799439012' // Valid ObjectId
            });

            const resolution = {
                outcome: 'seller_favor' as const,
                refundAmount: 50,
                reasonCode: 'CARRIER_ERROR',
                notes: 'Refund approved'
            };

            const result = await WeightDisputeResolutionService.resolveDispute(
                mockDisputeId,
                '507f1f77bcf86cd799439011', // Valid ObjectId
                resolution
            );

            expect(result.status).toBe('manual_resolved');
            expect(result.resolution.outcome).toBe('seller_favor');
            expect(WalletService.credit).toHaveBeenCalledWith(
                mockCompanyId,
                50,
                'other',
                expect.stringContaining('refund'),
                expect.anything(),
                'system'
            );
            expect(result.save).toHaveBeenCalled();
        });

        it('should process deduction for shipcrowd_favor outcome', async () => {
            (WalletService.getBalance as jest.Mock).mockResolvedValue({ balance: 1000 });
            (WalletService.debit as jest.Mock).mockResolvedValue({
                success: true,
                transactionId: '507f1f77bcf86cd799439013' // Valid ObjectId
            });

            const resolution = {
                outcome: 'shipcrowd_favor' as const,
                deductionAmount: 50,
                reasonCode: 'VALID_WEIGHT',
                notes: 'Deduction approved'
            };

            const result = await WeightDisputeResolutionService.resolveDispute(
                mockDisputeId,
                '507f1f77bcf86cd799439011', // Valid ObjectId
                resolution
            );

            expect(result.status).toBe('manual_resolved');
            expect(WalletService.debit).toHaveBeenCalled();
        });

        it('should handle insufficient balance for deduction', async () => {
            (WalletService.getBalance as jest.Mock).mockResolvedValue({ balance: 10 }); // Only 10 in wallet

            const resolution = {
                outcome: 'shipcrowd_favor' as const,
                deductionAmount: 50, // Need 50
                reasonCode: 'VALID_WEIGHT',
                notes: 'Deduction approved'
            };

            await WeightDisputeResolutionService.resolveDispute(
                mockDisputeId,
                '507f1f77bcf86cd799439011', // Valid ObjectId
                resolution
            );

            expect(WalletService.debit).not.toHaveBeenCalled();
            // Check that the first call (before status update) includes payment pending
            expect(Shipment.findByIdAndUpdate).toHaveBeenCalledWith(
                mockShipmentId,
                expect.objectContaining({
                    $set: expect.objectContaining({
                        'paymentPending.amount': 50,
                        'paymentPending.reason': 'weight_dispute',
                        'paymentPending.disputeId': 'WD-20230101-ABCDE'
                    })
                })
            );
        });
    });

    describe('autoResolveExpiredDisputes', () => {
        it('should auto-resolve expired disputes', async () => {
            (WeightDispute.find as jest.Mock).mockResolvedValue([mockDispute]);

            // Mocking WalletService.debit just in case resolveDispute is called and reaches there
            (WalletService.getBalance as jest.Mock).mockResolvedValue({ balance: 1000 });
            (WalletService.debit as jest.Mock).mockResolvedValue({
                success: true,
                transactionId: '507f1f77bcf86cd799439014' // Valid ObjectId
            });

            await WeightDisputeResolutionService.autoResolveExpiredDisputes();

            expect(WeightDispute.find).toHaveBeenCalledWith(expect.objectContaining({
                status: { $in: ['pending', 'under_review'] }
            }));

            // Since we mocked find to return one dispute, resolveDispute should be called logic inside.
            // We can check if refund/debit was called or shipment updated
            expect(WalletService.debit).toHaveBeenCalled();
        });
    });
});
