/**
 * Unit Tests for COD Settlement Webhook Handler
 * 
 * Tests:
 * - handleSettlementWebhook()
 * - Reconciliation logic
 * - Discrepancy detection
 */

import mongoose from 'mongoose';
import CODRemittanceService from '../../../src/core/application/services/finance/cod-remittance.service';
import { Shipment } from '../../../src/infrastructure/database/mongoose/models';
import CODRemittance from '../../../src/infrastructure/database/mongoose/models/finance/payouts/cod-remittance.model';

jest.mock('../../../src/infrastructure/database/mongoose/models/logistics/shipping/core/shipment.model');
jest.mock('../../../src/infrastructure/database/mongoose/models/finance/payouts/cod-remittance.model');
jest.mock('../../../src/core/application/services/communication/email.service');

describe('COD Settlement Webhook Handler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('handleSettlementWebhook', () => {
        it('should reconcile settlement with internal records', async () => {
            const mockPayload = {
                settlement_id: 'SETTLE-123',
                settlement_date: '2026-02-03T10:00:00Z',
                total_amount: 5000,
                currency: 'INR',
                utr_number: 'UTR123456',
                shipments: [
                    {
                        awb: 'VEL123456789',
                        cod_amount: 1000,
                        shipping_deduction: 50,
                        cod_charge: 20,
                        rto_charge: 0,
                        net_amount: 930
                    },
                    {
                        awb: 'VEL987654321',
                        cod_amount: 2000,
                        shipping_deduction: 100,
                        cod_charge: 40,
                        rto_charge: 0,
                        net_amount: 1860
                    }
                ]
            };

            const mockShipment1 = {
                _id: new mongoose.Types.ObjectId(),
                trackingNumber: 'VEL123456789',
                companyId: new mongoose.Types.ObjectId(),
                paymentDetails: { type: 'cod' },
                remittance: {
                    included: true,
                    remittedAmount: 930
                },
                save: jest.fn()
            };

            const mockShipment2 = {
                _id: new mongoose.Types.ObjectId(),
                trackingNumber: 'VEL987654321',
                companyId: mockShipment1.companyId,
                paymentDetails: { type: 'cod' },
                remittance: {
                    included: false
                },
                save: jest.fn()
            };

            (Shipment.findOne as jest.Mock)
                .mockResolvedValueOnce(mockShipment1)
                .mockResolvedValueOnce(mockShipment2)
                .mockResolvedValueOnce({ ...mockShipment1, select: jest.fn().mockReturnThis() })
                .mockResolvedValueOnce({ ...mockShipment2, select: jest.fn().mockReturnThis() });

            (Shipment.find as jest.Mock).mockResolvedValue([mockShipment1]);

            const mockBatch = {
                _id: new mongoose.Types.ObjectId(),
                companyId: mockShipment1.companyId,
                status: 'approved',
                shipments: [mockShipment1._id],
                save: jest.fn()
            };

            (CODRemittance.find as jest.Mock).mockResolvedValue([mockBatch]);

            const result = await CODRemittanceService.handleSettlementWebhook(mockPayload);

            expect(result.success).toBe(true);
            expect(result.reconciledBatches).toBeGreaterThan(0);
            expect(mockShipment2.save).toHaveBeenCalled();
            expect(mockBatch.save).toHaveBeenCalled();
        });

        it('should detect amount discrepancies', async () => {
            const mockPayload = {
                settlement_id: 'SETTLE-456',
                settlement_date: '2026-02-03T10:00:00Z',
                total_amount: 1000,
                shipments: [
                    {
                        awb: 'VEL111222333',
                        cod_amount: 1000,
                        shipping_deduction: 50,
                        cod_charge: 20,
                        net_amount: 930
                    }
                ]
            };

            const mockShipment = {
                trackingNumber: 'VEL111222333',
                paymentDetails: { type: 'cod' },
                remittance: {
                    included: true,
                    remittedAmount: 800  // Mismatch!
                },
                save: jest.fn()
            };

            (Shipment.findOne as jest.Mock).mockResolvedValue(mockShipment);
            (Shipment.find as jest.Mock).mockResolvedValue([]);
            (CODRemittance.find as jest.Mock).mockResolvedValue([]);

            const result = await CODRemittanceService.handleSettlementWebhook(mockPayload);

            expect(result.discrepancies).toHaveLength(1);
            expect(result.discrepancies[0].awb).toBe('VEL111222333');
            expect(result.discrepancies[0].reason).toContain('Amount mismatch');
        });

        it('should handle shipment not found', async () => {
            const mockPayload = {
                settlement_id: 'SETTLE-789',
                settlement_date: '2026-02-03T10:00:00Z',
                total_amount: 500,
                shipments: [
                    {
                        awb: 'NOTFOUND123',
                        cod_amount: 500,
                        shipping_deduction: 25,
                        cod_charge: 10,
                        net_amount: 465
                    }
                ]
            };

            (Shipment.findOne as jest.Mock).mockResolvedValue(null);
            (Shipment.find as jest.Mock).mockResolvedValue([]);
            (CODRemittance.find as jest.Mock).mockResolvedValue([]);

            const result = await CODRemittanceService.handleSettlementWebhook(mockPayload);

            expect(result.discrepancies).toHaveLength(1);
            expect(result.discrepancies[0].reason).toBe('Shipment not found in system');
        });

        it('should update batch status to settled', async () => {
            const mockPayload = {
                settlement_id: 'SETTLE-999',
                settlement_date: '2026-02-03T10:00:00Z',
                total_amount: 1500,
                utr_number: 'UTR999888',
                bank_details: {
                    account_number: '1234567890',
                    ifsc: 'HDFC0001234',
                    bank_name: 'HDFC Bank'
                },
                shipments: [
                    {
                        awb: 'VEL555666777',
                        cod_amount: 1500,
                        shipping_deduction: 75,
                        cod_charge: 30,
                        net_amount: 1395
                    }
                ]
            };

            const mockShipment = {
                _id: new mongoose.Types.ObjectId(),
                trackingNumber: 'VEL555666777',
                companyId: new mongoose.Types.ObjectId(),
                paymentDetails: { type: 'cod' },
                remittance: { included: false },
                save: jest.fn()
            };

            const mockBatch = {
                _id: new mongoose.Types.ObjectId(),
                companyId: mockShipment.companyId,
                status: 'approved',
                shipments: [mockShipment._id],
                settlementDetails: undefined as any,
                save: jest.fn()
            };

            (Shipment.findOne as jest.Mock)
                .mockResolvedValueOnce(mockShipment)
                .mockResolvedValueOnce({ ...mockShipment, select: jest.fn().mockReturnThis() });
            (Shipment.find as jest.Mock).mockResolvedValue([mockShipment]);

            (CODRemittance.find as jest.Mock).mockResolvedValue([mockBatch]);

            await CODRemittanceService.handleSettlementWebhook(mockPayload);

            expect(mockBatch.status).toBe('settled');
            expect(mockBatch.settlementDetails).toBeDefined();
            expect(mockBatch.settlementDetails?.settlementId).toBe('SETTLE-999');
            expect(mockBatch.settlementDetails?.utrNumber).toBe('UTR999888');
            expect(mockBatch.save).toHaveBeenCalled();
        });
    });
});
