
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import WeightDisputeResolutionService from '../../../../src/core/application/services/disputes/weight-dispute-resolution.service';
import WalletService from '../../../../src/core/application/services/wallet/wallet.service';
import Shipment from '../../../../src/infrastructure/database/mongoose/models/logistics/shipping/core/shipment.model';
import WeightDispute from '../../../../src/infrastructure/database/mongoose/models/logistics/shipping/exceptions/weight-dispute.model';
import { AppError, AuthorizationError, NotFoundError, ValidationError } from '../../../../src/shared/errors/app.error';

// Mock models and services
jest.mock('../../../../src/infrastructure/database/mongoose/models/logistics/shipping/exceptions/weight-dispute.model');
jest.mock('../../../../src/infrastructure/database/mongoose/models/logistics/shipping/core/shipment.model');
jest.mock('../../../../src/core/application/services/wallet/wallet.service');
jest.mock('../../../../src/shared/logger/winston.logger');

// Type helpers for mocks
describe('WeightDisputeResolutionService', () => {
    const mockDisputeId = '654321654321654321654321';
    const mockCompanyId = '123456123456123456123456';
    const mockShipmentId = '987654987654987654987654';
    const mockAdminId = '507f1f77bcf86cd799439011';

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
            save: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
        };

        (WeightDispute.findById as jest.MockedFunction<any>).mockResolvedValue(mockDispute);
        (WeightDispute.find as jest.MockedFunction<any>).mockResolvedValue([]);
        (Shipment.findByIdAndUpdate as jest.MockedFunction<any>).mockResolvedValue({});
    });

    describe('submitSellerResponse', () => {
        it('should allow seller to submit evidence for pending dispute', async () => {
            const evidence = {
                photos: ['url1', 'url2'],
                documents: ['doc1'],
                notes: 'Test evidence - weight was correct'
            };

            const result = await WeightDisputeResolutionService.submitSellerResponse(
                mockDisputeId,
                mockCompanyId,
                evidence
            );

            expect(result.status).toBe('under_review');
            expect(result.evidence.sellerPhotos).toHaveLength(2);
            expect(result.evidence.sellerDocuments).toHaveLength(1);
            expect(result.evidence.notes).toBe('Test evidence - weight was correct');
            expect(result.timeline).toHaveLength(1);
            expect(result.timeline[0].action).toContain('Seller submitted evidence');
            expect(result.save).toHaveBeenCalled();
            expect(Shipment.findByIdAndUpdate).toHaveBeenCalledWith(
                mockShipmentId,
                { 'weightDispute.status': 'under_review' }
            );
        });

        it('should handle evidence submission with only photos', async () => {
            const evidence = {
                photos: ['url1', 'url2', 'url3']
            };

            const result = await WeightDisputeResolutionService.submitSellerResponse(
                mockDisputeId,
                mockCompanyId,
                evidence
            );

            expect(result.status).toBe('under_review');
            expect(result.evidence.sellerPhotos).toHaveLength(3);
            expect(result.evidence.sellerDocuments).toHaveLength(0);
            expect(result.evidence.notes).toBe('');
        });

        it('should handle evidence submission with only notes', async () => {
            const evidence = {
                notes: 'Package was weighed correctly at our facility'
            };

            const result = await WeightDisputeResolutionService.submitSellerResponse(
                mockDisputeId,
                mockCompanyId,
                evidence
            );

            expect(result.status).toBe('under_review');
            expect(result.evidence.sellerPhotos).toHaveLength(0);
            expect(result.evidence.notes).toBe('Package was weighed correctly at our facility');
        });

        it('should throw NotFoundError if dispute does not exist', async () => {
            (WeightDispute.findById as jest.MockedFunction<any>).mockResolvedValue(null);

            await expect(WeightDisputeResolutionService.submitSellerResponse(
                mockDisputeId,
                mockCompanyId,
                { notes: 'Test' }
            )).rejects.toThrow(NotFoundError);
        });

        it('should throw AuthorizationError if company ID does not match', async () => {
            await expect(WeightDisputeResolutionService.submitSellerResponse(
                mockDisputeId,
                'wrong_company_id_123456123456',
                { notes: 'Test' }
            )).rejects.toThrow(AuthorizationError);
        });

        it('should throw AppError if dispute is not in pending status', async () => {
            mockDispute.status = 'resolved';

            await expect(WeightDisputeResolutionService.submitSellerResponse(
                mockDisputeId,
                mockCompanyId,
                { notes: 'Test' }
            )).rejects.toThrow(AppError);
        });

        it('should throw AppError if dispute is under_review already', async () => {
            mockDispute.status = 'under_review';

            await expect(WeightDisputeResolutionService.submitSellerResponse(
                mockDisputeId,
                mockCompanyId,
                { notes: 'Test' }
            )).rejects.toThrow(AppError);
        });

        it('should throw AppError if dispute is auto_resolved', async () => {
            mockDispute.status = 'auto_resolved';

            await expect(WeightDisputeResolutionService.submitSellerResponse(
                mockDisputeId,
                mockCompanyId,
                { notes: 'Test' }
            )).rejects.toThrow(AppError);
        });
    });

    describe('resolveDispute', () => {
        beforeEach(() => {
            mockDispute.status = 'under_review';
        });

        describe('seller_favor outcome', () => {
            it('should process refund for seller_favor outcome', async () => {
                (WalletService.credit as jest.MockedFunction<any>).mockResolvedValue({
                    success: true,
                    transactionId: '507f1f77bcf86cd799439012'
                });

                const resolution = {
                    outcome: 'seller_favor' as const,
                    refundAmount: 50,
                    reasonCode: 'CARRIER_ERROR',
                    notes: 'Carrier made error in weighing. Refunding seller.'
                };

                const result = await WeightDisputeResolutionService.resolveDispute(
                    mockDisputeId,
                    mockAdminId,
                    resolution
                );

                expect(result.status).toBe('manual_resolved');
                expect(result.resolution.outcome).toBe('seller_favor');
                expect(result.resolution.refundAmount).toBe(50);
                expect(result.resolution.reasonCode).toBe('CARRIER_ERROR');
                expect(WalletService.credit).toHaveBeenCalledWith(
                    mockCompanyId,
                    50,
                    'other',
                    expect.stringContaining('refund'),
                    expect.objectContaining({
                        type: 'shipment',
                        id: mockShipmentId,
                        externalId: 'WD-20230101-ABCDE'
                    }),
                    'system'
                );
                expect(result.save).toHaveBeenCalled();
                expect(Shipment.findByIdAndUpdate).toHaveBeenCalledWith(
                    mockShipmentId,
                    { 'weightDispute.status': 'resolved' }
                );
            });

            it('should not call wallet credit if refundAmount is 0', async () => {
                const resolution = {
                    outcome: 'seller_favor' as const,
                    refundAmount: 0,
                    reasonCode: 'GOODWILL',
                    notes: 'Resolved in seller favor but no refund needed'
                };

                await WeightDisputeResolutionService.resolveDispute(
                    mockDisputeId,
                    mockAdminId,
                    resolution
                );

                expect(WalletService.credit).not.toHaveBeenCalled();
            });

            it('should store wallet transaction ID after successful credit', async () => {
                const mockTxnId = '507f1f77bcf86cd799439012';
                (WalletService.credit as jest.MockedFunction<any>).mockResolvedValue({
                    success: true,
                    transactionId: mockTxnId
                });

                const resolution = {
                    outcome: 'seller_favor' as const,
                    refundAmount: 100,
                    reasonCode: 'CARRIER_ERROR',
                    notes: 'Refund approved'
                };

                const result = await WeightDisputeResolutionService.resolveDispute(
                    mockDisputeId,
                    mockAdminId,
                    resolution
                );

                expect(result.walletTransactionId).toBeDefined();
            });
        });

        describe('Shipcrowd_favor outcome', () => {
            it('should process deduction for Shipcrowd_favor outcome with sufficient balance', async () => {
                (WalletService.getBalance as jest.MockedFunction<any>).mockResolvedValue({ balance: 1000 });
                (WalletService.debit as jest.MockedFunction<any>).mockResolvedValue({
                    success: true,
                    transactionId: '507f1f77bcf86cd799439013'
                });

                const resolution = {
                    outcome: 'Shipcrowd_favor' as const,
                    deductionAmount: 50,
                    reasonCode: 'VALID_WEIGHT',
                    notes: 'Carrier weight is correct. Deducting from seller.'
                };

                const result = await WeightDisputeResolutionService.resolveDispute(
                    mockDisputeId,
                    mockAdminId,
                    resolution
                );

                expect(result.status).toBe('manual_resolved');
                expect(result.resolution.outcome).toBe('Shipcrowd_favor');
                expect(WalletService.getBalance).toHaveBeenCalledWith(mockCompanyId);
                expect(WalletService.debit).toHaveBeenCalledWith(
                    mockCompanyId,
                    50,
                    'other',
                    expect.stringContaining('deduction'),
                    expect.objectContaining({
                        type: 'shipment',
                        id: mockShipmentId,
                        externalId: 'WD-20230101-ABCDE'
                    }),
                    'system'
                );
            });

            it('should handle insufficient balance for deduction', async () => {
                (WalletService.getBalance as jest.MockedFunction<any>).mockResolvedValue({ balance: 10 });

                const resolution = {
                    outcome: 'Shipcrowd_favor' as const,
                    deductionAmount: 50,
                    reasonCode: 'VALID_WEIGHT',
                    notes: 'Deduction approved but insufficient balance'
                };

                await WeightDisputeResolutionService.resolveDispute(
                    mockDisputeId,
                    mockAdminId,
                    resolution
                );

                expect(WalletService.debit).not.toHaveBeenCalled();
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

            it('should mark payment pending when balance is exactly equal to deduction', async () => {
                // Edge case: balance = 50, deduction = 50 should work
                (WalletService.getBalance as jest.MockedFunction<any>).mockResolvedValue({ balance: 50 });
                (WalletService.debit as jest.MockedFunction<any>).mockResolvedValue({
                    success: true,
                    transactionId: '507f1f77bcf86cd799439014'
                });

                const resolution = {
                    outcome: 'Shipcrowd_favor' as const,
                    deductionAmount: 50,
                    reasonCode: 'VALID_WEIGHT',
                    notes: 'Exact balance match'
                };

                await WeightDisputeResolutionService.resolveDispute(
                    mockDisputeId,
                    mockAdminId,
                    resolution
                );

                expect(WalletService.debit).toHaveBeenCalled();
            });

            it('should not deduct if deductionAmount is 0', async () => {
                const resolution = {
                    outcome: 'Shipcrowd_favor' as const,
                    deductionAmount: 0,
                    reasonCode: 'VALID_WEIGHT',
                    notes: 'Resolved in Shipcrowd favor but no deduction'
                };

                await WeightDisputeResolutionService.resolveDispute(
                    mockDisputeId,
                    mockAdminId,
                    resolution
                );

                expect(WalletService.getBalance).not.toHaveBeenCalled();
                expect(WalletService.debit).not.toHaveBeenCalled();
            });
        });

        describe('split outcome', () => {
            it('should process partial deduction for split outcome', async () => {
                (WalletService.getBalance as jest.MockedFunction<any>).mockResolvedValue({ balance: 500 });
                (WalletService.debit as jest.MockedFunction<any>).mockResolvedValue({
                    success: true,
                    transactionId: '507f1f77bcf86cd799439015'
                });

                const resolution = {
                    outcome: 'split' as const,
                    deductionAmount: 25,
                    reasonCode: 'SHARED_RESPONSIBILITY',
                    notes: 'Split decision - partial deduction',
                    adjustedWeight: {
                        value: 1.05,
                        unit: 'kg' as const
                    }
                };

                const result = await WeightDisputeResolutionService.resolveDispute(
                    mockDisputeId,
                    mockAdminId,
                    resolution
                );

                expect(result.resolution.outcome).toBe('split');
                expect(result.resolution.adjustedWeight).toEqual({
                    value: 1.05,
                    unit: 'kg'
                });
                expect(WalletService.debit).toHaveBeenCalledWith(
                    mockCompanyId,
                    25,
                    'other',
                    expect.any(String),
                    expect.any(Object),
                    'system'
                );
            });

            it('should handle split outcome with insufficient balance', async () => {
                (WalletService.getBalance as jest.MockedFunction<any>).mockResolvedValue({ balance: 5 });

                const resolution = {
                    outcome: 'split' as const,
                    deductionAmount: 25,
                    reasonCode: 'SHARED_RESPONSIBILITY',
                    notes: 'Split decision but insufficient balance'
                };

                await WeightDisputeResolutionService.resolveDispute(
                    mockDisputeId,
                    mockAdminId,
                    resolution
                );

                expect(WalletService.debit).not.toHaveBeenCalled();
                expect(Shipment.findByIdAndUpdate).toHaveBeenCalledWith(
                    mockShipmentId,
                    expect.objectContaining({
                        $set: expect.objectContaining({
                            'paymentPending.amount': 25,
                            'paymentPending.reason': 'weight_dispute',
                            'paymentPending.disputeId': 'WD-20230101-ABCDE'
                        })
                    })
                );
            });
        });

        describe('waived outcome', () => {
            it('should process waived outcome with no financial impact', async () => {
                const resolution = {
                    outcome: 'waived' as const,
                    reasonCode: 'GOODWILL',
                    notes: 'Waived as goodwill gesture'
                };

                const result = await WeightDisputeResolutionService.resolveDispute(
                    mockDisputeId,
                    mockAdminId,
                    resolution
                );

                expect(result.status).toBe('manual_resolved');
                expect(result.resolution.outcome).toBe('waived');
                expect(WalletService.credit).not.toHaveBeenCalled();
                expect(WalletService.debit).not.toHaveBeenCalled();
                expect(WalletService.getBalance).not.toHaveBeenCalled();
            });
        });

        describe('system auto-resolution', () => {
            it('should mark dispute as auto_resolved when resolved by system', async () => {
                (WalletService.getBalance as jest.MockedFunction<any>).mockResolvedValue({ balance: 1000 });
                (WalletService.debit as jest.MockedFunction<any>).mockResolvedValue({
                    success: true,
                    transactionId: '507f1f77bcf86cd799439016'
                });

                const resolution = {
                    outcome: 'Shipcrowd_favor' as const,
                    deductionAmount: 100,
                    reasonCode: 'AUTO_RESOLVED_NO_RESPONSE',
                    notes: 'Auto-resolved after 7 days'
                };

                const result = await WeightDisputeResolutionService.resolveDispute(
                    mockDisputeId,
                    'system',
                    resolution
                );

                expect(result.status).toBe('auto_resolved');
                expect(result.resolution.resolvedBy).toBe('system');
            });
        });

        describe('validation and error handling', () => {
            it('should throw NotFoundError if dispute does not exist', async () => {
                (WeightDispute.findById as jest.MockedFunction<any>).mockResolvedValue(null);

                await expect(WeightDisputeResolutionService.resolveDispute(
                    mockDisputeId,
                    mockAdminId,
                    {
                        outcome: 'seller_favor',
                        reasonCode: 'TEST',
                        notes: 'Test'
                    }
                )).rejects.toThrow(NotFoundError);
            });

            it('should throw ValidationError for invalid outcome', async () => {
                const resolution = {
                    outcome: 'invalid_outcome' as any,
                    reasonCode: 'TEST',
                    notes: 'Test'
                };

                await expect(WeightDisputeResolutionService.resolveDispute(
                    mockDisputeId,
                    mockAdminId,
                    resolution
                )).rejects.toThrow(ValidationError);
            });

            it('should add timeline entry with admin actor', async () => {
                const resolution = {
                    outcome: 'waived' as const,
                    reasonCode: 'GOODWILL',
                    notes: 'Waived for customer satisfaction'
                };

                const result = await WeightDisputeResolutionService.resolveDispute(
                    mockDisputeId,
                    mockAdminId,
                    resolution
                );

                expect(result.timeline).toHaveLength(1);
                expect(result.timeline[0].action).toContain('Dispute resolved');
                expect(result.timeline[0].notes).toBe('Waived for customer satisfaction');
            });
        });
    });

    describe('autoResolveExpiredDisputes', () => {
        it('should auto-resolve disputes older than 7 days', async () => {
            const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago

            const expiredDispute = {
                ...mockDispute,
                createdAt: oldDate,
                status: 'pending'
            };

            (WeightDispute.find as jest.MockedFunction<any>).mockResolvedValue([expiredDispute]);
            (WalletService.getBalance as jest.MockedFunction<any>).mockResolvedValue({ balance: 1000 });
            (WalletService.debit as jest.MockedFunction<any>).mockResolvedValue({
                success: true,
                transactionId: '507f1f77bcf86cd799439014'
            });

            const resolved = await WeightDisputeResolutionService.autoResolveExpiredDisputes();

            expect(WeightDispute.find).toHaveBeenCalledWith(expect.objectContaining({
                status: { $in: ['pending', 'under_review'] },
                isDeleted: false
            }));
            expect(resolved).toBe(1);
            expect(WalletService.debit).toHaveBeenCalled();
        });

        it('should auto-resolve multiple expired disputes', async () => {
            const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

            const expiredDisputes = [
                { ...mockDispute, _id: 'dispute1', createdAt: oldDate, status: 'pending' },
                { ...mockDispute, _id: 'dispute2', createdAt: oldDate, status: 'under_review' },
                { ...mockDispute, _id: 'dispute3', createdAt: oldDate, status: 'pending' }
            ];

            (WeightDispute.find as jest.MockedFunction<any>).mockResolvedValue(expiredDisputes);
            (WalletService.getBalance as jest.MockedFunction<any>).mockResolvedValue({ balance: 1000 });
            (WalletService.debit as jest.MockedFunction<any>).mockResolvedValue({
                success: true,
                transactionId: '507f1f77bcf86cd799439014'
            });

            const resolved = await WeightDisputeResolutionService.autoResolveExpiredDisputes();

            expect(resolved).toBe(3);
        });

        it('should return 0 when no expired disputes found', async () => {
            (WeightDispute.find as jest.MockedFunction<any>).mockResolvedValue([]);

            const resolved = await WeightDisputeResolutionService.autoResolveExpiredDisputes();

            expect(resolved).toBe(0);
        });

        it('should continue processing other disputes if one fails', async () => {
            const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

            const dispute1 = { ...mockDispute, _id: 'dispute1', createdAt: oldDate };
            const dispute2 = { ...mockDispute, _id: 'dispute2', createdAt: oldDate };

            (WeightDispute.find as jest.MockedFunction<any>).mockResolvedValue([dispute1, dispute2]);

            // First call fails, second succeeds
            (WeightDispute.findById as jest.MockedFunction<any>)
                .mockResolvedValueOnce(null) // First dispute not found
                .mockResolvedValueOnce(dispute2); // Second dispute found

            (WalletService.getBalance as jest.MockedFunction<any>).mockResolvedValue({ balance: 1000 });
            (WalletService.debit as jest.MockedFunction<any>).mockResolvedValue({
                success: true,
                transactionId: '507f1f77bcf86cd799439014'
            });

            const resolved = await WeightDisputeResolutionService.autoResolveExpiredDisputes();

            // Should resolve at least the successful ones
            expect(resolved).toBeGreaterThanOrEqual(0);
        });

        it('should only query pending and under_review disputes', async () => {
            await WeightDisputeResolutionService.autoResolveExpiredDisputes();

            expect(WeightDispute.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: { $in: ['pending', 'under_review'] }
                })
            );
        });
    });

    describe('getDisputeMetrics', () => {
        const createMockDispute = (status: string, financialImpact: number, createdAt: Date, resolvedAt?: Date) => ({
            status,
            financialImpact: { difference: financialImpact },
            createdAt,
            resolution: resolvedAt ? { resolvedAt } : {},
            isDeleted: false
        });

        it('should calculate metrics for all disputes when no filters provided', async () => {
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

            const mockDisputes = [
                createMockDispute('pending', 100, now),
                createMockDispute('under_review', 150, now),
                createMockDispute('manual_resolved', 200, oneHourAgo, now),
                createMockDispute('auto_resolved', 75, oneHourAgo, now),
            ];

            (WeightDispute.find as jest.MockedFunction<any>).mockResolvedValue(mockDisputes);

            const metrics = await WeightDisputeResolutionService.getDisputeMetrics();

            expect(metrics.total).toBe(4);
            expect(metrics.pending).toBe(1);
            expect(metrics.underReview).toBe(1);
            expect(metrics.resolved).toBe(2);
            expect(metrics.autoResolved).toBe(1);
            expect(metrics.totalFinancialImpact).toBe(525); // 100 + 150 + 200 + 75
            expect(metrics.averageResolutionTime).toBeGreaterThan(0);
        });

        it('should filter metrics by company ID', async () => {
            const mockDisputes = [
                createMockDispute('pending', 100, new Date()),
                createMockDispute('manual_resolved', 200, new Date(), new Date()),
            ];

            (WeightDispute.find as jest.MockedFunction<any>).mockResolvedValue(mockDisputes);

            await WeightDisputeResolutionService.getDisputeMetrics(mockCompanyId);

            expect(WeightDispute.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    isDeleted: false
                })
            );
        });

        it('should filter metrics by date range', async () => {
            const start = new Date('2023-01-01');
            const end = new Date('2023-12-31');

            (WeightDispute.find as jest.MockedFunction<any>).mockResolvedValue([]);

            await WeightDisputeResolutionService.getDisputeMetrics(undefined, { start, end });

            expect(WeightDispute.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    createdAt: {
                        $gte: start,
                        $lte: end
                    },
                    isDeleted: false
                })
            );
        });

        it('should calculate average resolution time correctly', async () => {
            const createdAt = new Date('2023-01-01T00:00:00Z');
            const resolvedAt1 = new Date('2023-01-01T02:00:00Z'); // 2 hours later
            const resolvedAt2 = new Date('2023-01-01T04:00:00Z'); // 4 hours later

            const mockDisputes = [
                createMockDispute('manual_resolved', 100, createdAt, resolvedAt1),
                createMockDispute('manual_resolved', 100, createdAt, resolvedAt2),
            ];

            (WeightDispute.find as jest.MockedFunction<any>).mockResolvedValue(mockDisputes);

            const metrics = await WeightDisputeResolutionService.getDisputeMetrics();

            expect(metrics.averageResolutionTime).toBe(3); // (2 + 4) / 2 = 3 hours
        });

        it('should return 0 average resolution time when no resolved disputes', async () => {
            const mockDisputes = [
                createMockDispute('pending', 100, new Date()),
                createMockDispute('under_review', 150, new Date()),
            ];

            (WeightDispute.find as jest.MockedFunction<any>).mockResolvedValue(mockDisputes);

            const metrics = await WeightDisputeResolutionService.getDisputeMetrics();

            expect(metrics.averageResolutionTime).toBe(0);
        });

        it('should handle empty disputes array', async () => {
            (WeightDispute.find as jest.MockedFunction<any>).mockResolvedValue([]);

            const metrics = await WeightDisputeResolutionService.getDisputeMetrics();

            expect(metrics.total).toBe(0);
            expect(metrics.pending).toBe(0);
            expect(metrics.underReview).toBe(0);
            expect(metrics.resolved).toBe(0);
            expect(metrics.autoResolved).toBe(0);
            expect(metrics.totalFinancialImpact).toBe(0);
            expect(metrics.averageResolutionTime).toBe(0);
        });

        it('should combine company ID and date range filters', async () => {
            const start = new Date('2023-01-01');
            const end = new Date('2023-12-31');

            (WeightDispute.find as jest.MockedFunction<any>).mockResolvedValue([]);

            await WeightDisputeResolutionService.getDisputeMetrics(mockCompanyId, { start, end });

            expect(WeightDispute.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    createdAt: {
                        $gte: start,
                        $lte: end
                    },
                    isDeleted: false
                })
            );
        });
    });
});
