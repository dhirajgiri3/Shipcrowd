import mongoose from 'mongoose';
import { CODAnalyticsService } from '../../../src/core/application/services/finance/cod-analytics.service';
import CODDiscrepancy from '../../../src/infrastructure/database/mongoose/models/finance/cod-discrepancy.model';
import Shipment from '../../../src/infrastructure/database/mongoose/models/logistics/shipping/core/shipment.model';

describe('COD Analytics Service', () => {
    let companyId: mongoose.Types.ObjectId;

    beforeAll(async () => {
        companyId = new mongoose.Types.ObjectId();
    });

    afterEach(async () => {
        await Shipment.deleteMany({});
        await CODDiscrepancy.deleteMany({});
    });

    async function createMockShipment(overrides: any = {}) {
        return await Shipment.create({
            companyId,
            orderId: new mongoose.Types.ObjectId(),
            trackingNumber: 'AWB-' + Math.random(),
            carrier: 'Velocity',
            serviceType: 'express',
            currentStatus: 'delivered',
            paymentDetails: {
                type: 'cod',
                codAmount: 1000,
                shippingCost: 100,
                collectionStatus: 'pending',
                ...overrides.paymentDetails
            },
            deliveryDetails: {
                recipientName: 'Test User',
                recipientPhone: '9999999999',
                address: {
                    line1: '123 Test St',
                    city: 'Test City',
                    state: 'Test State',
                    country: 'India',
                    postalCode: '110001'
                },
                ...overrides.deliveryDetails
            },
            packageDetails: {
                weight: 1,
                packageCount: 1,
                packageType: 'box',
                declaredValue: 1000,
                dimensions: { length: 10, width: 10, height: 10 },
                ...overrides.packageDetails
            },
            weights: {
                declared: { value: 1, unit: 'kg' },
                charged: { value: 1, unit: 'kg' }
            },
            ...overrides
        });
    }

    describe('getHealthMetrics', () => {
        it('should calculate accurate health metrics', async () => {
            const now = new Date();

            // 1. Successful Remitted
            await createMockShipment({
                trackingNumber: 'AWB-OK',
                currentStatus: 'delivered',
                createdAt: now,
                paymentDetails: {
                    type: 'cod',
                    codAmount: 1000,
                    shippingCost: 100,
                    collectionStatus: 'remitted'
                },
                remittance: { remittedAt: new Date(now.getTime() + 86400000) } // +1 day, ROOT LEVEL
            });

            // 2. RTO
            await createMockShipment({
                trackingNumber: 'AWB-RTO',
                currentStatus: 'rto',
                createdAt: now,
                paymentDetails: { type: 'cod', codAmount: 1000, shippingCost: 100 }
            });

            // 3. Disputed - Needs Shipment + Discrepancy
            await createMockShipment({
                trackingNumber: 'AWB-DISC',
                currentStatus: 'delivered',
                createdAt: now,
                paymentDetails: { type: 'cod', codAmount: 100, shippingCost: 50 }
            });

            await CODDiscrepancy.create({
                discrepancyNumber: 'DISC-YES',
                shipmentId: new mongoose.Types.ObjectId(),
                awb: 'AWB-DISC',
                companyId,
                carrier: 'Velocity',
                amounts: { expected: { cod: 100, total: 100 }, actual: { collected: 50, reported: 50, source: 'manual' }, difference: 50, percentage: 50 },
                type: 'amount_mismatch',
                severity: 'minor',
                createdAt: now
            });

            const metrics = await CODAnalyticsService.getHealthMetrics(companyId.toString(), new Date(now.getTime() - 10000), new Date(now.getTime() + 10000));

            expect(metrics.totalOrders).toBe(3);
            expect(metrics.rtoRate).toBe(33.33); // 1/3
            expect(metrics.disputeRate).toBe(33.33); // 1/3
            expect(metrics.averageRemittanceTime).toBeCloseTo(1.0, 1); // 1 day
        });
    });
});
