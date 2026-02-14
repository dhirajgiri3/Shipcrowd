/**
 * Integration Tests for Settlement Webhook Flow
 * 
 * End-to-end tests for:
 * - Settlement webhook → Reconciliation → Batch update → Payout
 */

import mongoose from 'mongoose';
import CODRemittanceService from '../../../src/core/application/services/finance/cod-remittance.service';
import { Shipment } from '../../../src/infrastructure/database/mongoose/models';
import CODRemittance from '../../../src/infrastructure/database/mongoose/models/finance/payouts/cod-remittance.model';
import { setupTestDatabase, teardownTestDatabase } from '../../setup/testDatabase';

jest.mock('../../../src/core/application/services/communication/email.service', () => ({
    __esModule: true,
    default: {
        sendOperationalAlert: jest.fn().mockResolvedValue(undefined),
    },
}));

jest.mock('../../../src/core/application/services/communication/email.service.js', () => ({
    __esModule: true,
    default: {
        sendOperationalAlert: jest.fn().mockResolvedValue(undefined),
    },
}), { virtual: true });

describe('Settlement Webhook Integration Tests', () => {
    let testCompanyId: mongoose.Types.ObjectId;

    const createValidRemittanceBatch = async (params: {
        companyId: mongoose.Types.ObjectId;
        shipments: Array<any>;
    }) => {
        const createdDate = new Date();
        const cutoffDate = new Date();
        const totalCODCollected = params.shipments.reduce((sum, s) => sum + (s.paymentDetails?.codAmount || 0), 0);
        const totalShippingCharges = params.shipments.reduce((sum, s) => sum + (s.paymentDetails?.shippingCost || 0), 0);
        const totalPlatformFees = 60;
        const grandTotal = totalShippingCharges + totalPlatformFees;
        const netPayable = totalCODCollected - grandTotal;

        return CODRemittance.create({
            remittanceId: `REM-TEST-${Date.now()}`,
            companyId: params.companyId,
            batch: {
                batchNumber: 1,
                createdDate,
                cutoffDate,
                shippingPeriod: {
                    start: new Date(createdDate.getTime() - 7 * 24 * 60 * 60 * 1000),
                    end: cutoffDate,
                },
            },
            schedule: {
                type: 'manual',
            },
            shipments: params.shipments.map((shipment) => ({
                shipmentId: shipment._id,
                awb: shipment.trackingNumber,
                codAmount: shipment.paymentDetails.codAmount,
                deliveredAt: new Date(),
                status: 'delivered',
                deductions: {
                    shippingCharge: shipment.paymentDetails.shippingCost || 0,
                    weightDispute: 0,
                    rtoCharge: 0,
                    insuranceCharge: 0,
                    platformFee: 0,
                    otherFees: 0,
                    total: shipment.paymentDetails.shippingCost || 0,
                },
                netAmount: shipment.paymentDetails.codAmount - (shipment.paymentDetails.shippingCost || 0),
            })),
            financial: {
                totalCODCollected,
                totalShipments: params.shipments.length,
                successfulDeliveries: params.shipments.length,
                rtoCount: 0,
                disputedCount: 0,
                deductionsSummary: {
                    totalShippingCharges,
                    totalWeightDisputes: 0,
                    totalRTOCharges: 0,
                    totalInsuranceCharges: 0,
                    totalPlatformFees,
                    totalOtherFees: 0,
                    grandTotal,
                },
                netPayable,
            },
            payout: {
                status: 'pending',
                method: 'manual',
            },
            status: 'approved',
            reportGenerated: false,
            timeline: [],
            isDeleted: false,
        });
    };

    beforeAll(async () => {
        await setupTestDatabase();
    });

    afterAll(async () => {
        await teardownTestDatabase();
    });

    beforeEach(async () => {
        testCompanyId = new mongoose.Types.ObjectId();
    });

    afterEach(async () => {
        // Cleanup
        await Shipment.deleteMany({ companyId: testCompanyId });
        await CODRemittance.deleteMany({ companyId: testCompanyId });
    });

    describe('Settlement Webhook Reconciliation', () => {
        it('should reconcile settlement with shipments and update batch status', async () => {
            // Create test shipments
            const shipment1 = await Shipment.create({
                trackingNumber: 'TEST-AWB-001',
                orderId: new mongoose.Types.ObjectId(),
                companyId: testCompanyId,
                carrier: 'Velocity',
                serviceType: 'standard',
                packageDetails: {
                    weight: 1,
                    dimensions: { length: 10, width: 10, height: 10 },
                    packageCount: 1,
                    packageType: 'box',
                    declaredValue: 1000
                },
                deliveryDetails: {
                    recipientName: 'Test Customer',
                    recipientPhone: '9123456789',
                    address: {
                        line1: 'Test Address',
                        city: 'Delhi',
                        state: 'Delhi',
                        country: 'India',
                        postalCode: '110001'
                    }
                },
                paymentDetails: {
                    type: 'cod',
                    codAmount: 1000,
                    shippingCost: 50,
                    currency: 'INR'
                },
                currentStatus: 'delivered',
                weights: {
                    declared: { value: 1, unit: 'kg' },
                    verified: true
                }
            });

            const shipment2 = await Shipment.create({
                trackingNumber: 'TEST-AWB-002',
                orderId: new mongoose.Types.ObjectId(),
                companyId: testCompanyId,
                carrier: 'Velocity',
                serviceType: 'standard',
                packageDetails: {
                    weight: 2,
                    dimensions: { length: 20, width: 15, height: 10 },
                    packageCount: 1,
                    packageType: 'box',
                    declaredValue: 2000
                },
                deliveryDetails: {
                    recipientName: 'Test Customer 2',
                    recipientPhone: '9987654321',
                    address: {
                        line1: 'Test Address 2',
                        city: 'Mumbai',
                        state: 'Maharashtra',
                        country: 'India',
                        postalCode: '400001'
                    }
                },
                paymentDetails: {
                    type: 'cod',
                    codAmount: 2000,
                    shippingCost: 75,
                    currency: 'INR'
                },
                currentStatus: 'delivered',
                weights: {
                    declared: { value: 2, unit: 'kg' },
                    verified: true
                }
            });

            // Create remittance batch
            const batch = await createValidRemittanceBatch({
                companyId: testCompanyId,
                shipments: [shipment1, shipment2],
            });

            // Simulate settlement webhook
            const settlementPayload = {
                settlement_id: 'SETTLE-TEST-123',
                settlement_date: new Date().toISOString(),
                total_amount: 2815,
                currency: 'INR',
                utr_number: 'UTR-TEST-999',
                bank_details: {
                    account_number: '1234567890',
                    ifsc: 'HDFC0001234',
                    bank_name: 'HDFC Bank'
                },
                shipments: [
                    {
                        awb: 'TEST-AWB-001',
                        cod_amount: 1000,
                        shipping_deduction: 50,
                        cod_charge: 20,
                        rto_charge: 0,
                        net_amount: 930
                    },
                    {
                        awb: 'TEST-AWB-002',
                        cod_amount: 2000,
                        shipping_deduction: 75,
                        cod_charge: 40,
                        rto_charge: 0,
                        net_amount: 1885
                    }
                ]
            };

            const result = await CODRemittanceService.handleSettlementWebhook(settlementPayload);

            expect(result.success).toBe(true);
            expect(result.reconciledBatches).toBeGreaterThan(0);

            // Verify shipments updated
            const updatedShipment1 = await Shipment.findById(shipment1._id);
            expect(updatedShipment1?.remittance?.included).toBe(true);
            expect(updatedShipment1?.remittance?.remittanceId).toBe('SETTLE-TEST-123');

            // Verify batch updated
            const updatedBatch = await CODRemittance.findById(batch._id);
            expect(updatedBatch?.status).toBe('settled');
            expect(updatedBatch?.settlementDetails?.settlementId).toBe('SETTLE-TEST-123');
            expect(updatedBatch?.settlementDetails?.utrNumber).toBe('UTR-TEST-999');

        }, 30000);

        it('should detect discrepancies when amounts mismatch', async () => {
            const shipment = await Shipment.create({
                trackingNumber: 'TEST-AWB-MISMATCH',
                orderId: new mongoose.Types.ObjectId(),
                companyId: testCompanyId,
                carrier: 'Velocity',
                serviceType: 'standard',
                packageDetails: {
                    weight: 1,
                    dimensions: { length: 10, width: 10, height: 10 },
                    packageCount: 1,
                    packageType: 'box',
                    declaredValue: 1500
                },
                deliveryDetails: {
                    recipientName: 'Test',
                    recipientPhone: '9999999999',
                    address: {
                        line1: 'Test',
                        city: 'Test',
                        state: 'Test',
                        country: 'India',
                        postalCode: '110001'
                    }
                },
                paymentDetails: {
                    type: 'cod',
                    codAmount: 1500,
                    shippingCost: 60,
                    currency: 'INR'
                },
                currentStatus: 'delivered',
                remittance: {
                    included: true,
                    remittedAmount: 1200  // Different from settlement
                },
                weights: {
                    declared: { value: 1, unit: 'kg' },
                    verified: true
                }
            });

            const settlementPayload = {
                settlement_id: 'SETTLE-MISMATCH-123',
                settlement_date: new Date().toISOString(),
                total_amount: 1390,
                shipments: [
                    {
                        awb: 'TEST-AWB-MISMATCH',
                        cod_amount: 1500,
                        shipping_deduction: 60,
                        cod_charge: 30,
                        net_amount: 1410  // Different from recorded 1200
                    }
                ]
            };

            const result = await CODRemittanceService.handleSettlementWebhook(settlementPayload);

            expect(result.discrepancies.length).toBeGreaterThan(0);
            expect(result.discrepancies[0].awb).toBe('TEST-AWB-MISMATCH');
            expect(result.discrepancies[0].reason).toContain('Amount mismatch');

        }, 30000);

        it('should handle shipment not found in system', async () => {
            const settlementPayload = {
                settlement_id: 'SETTLE-NOTFOUND-123',
                settlement_date: new Date().toISOString(),
                total_amount: 500,
                shipments: [
                    {
                        awb: 'NONEXISTENT-AWB-999',
                        cod_amount: 500,
                        shipping_deduction: 25,
                        cod_charge: 10,
                        net_amount: 465
                    }
                ]
            };

            const result = await CODRemittanceService.handleSettlementWebhook(settlementPayload);

            expect(result.success).toBe(true);
            expect(result.discrepancies.length).toBe(1);
            expect(result.discrepancies[0].reason).toBe('Shipment not found in system');

        }, 30000);
    });
});
