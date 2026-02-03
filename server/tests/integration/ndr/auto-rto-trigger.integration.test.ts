/**
 * Integration Tests for Auto-RTO Trigger
 * 
 * End-to-end tests for:
 * - NDR attempts exceed threshold → Auto-RTO triggered
 */

import mongoose from 'mongoose';
import { Shipment } from '../../../src/infrastructure/database/mongoose/models';
import NDREvent from '../../../src/infrastructure/database/mongoose/models/ndr/ndr-event.model';
import RTOService from '../../../src/core/application/services/rto/rto.service';
import AutoRTOService from '../../../src/core/application/services/rto/auto-rto.service';
import { setupTestDatabase, teardownTestDatabase } from '../../setup/testDatabase';
import Wallet from '../../../src/infrastructure/database/mongoose/models/finance/wallet/wallet.model';

describe('Auto-RTO Trigger Integration Tests', () => {
    let testCompanyId: mongoose.Types.ObjectId;

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
        await Shipment.deleteMany({ companyId: testCompanyId });
        await NDREvent.deleteMany({ companyId: testCompanyId });
        await Wallet.deleteMany({ companyId: testCompanyId });
    });

    it('should trigger RTO after 3 failed NDR attempts', async () => {
        // Create wallet with sufficient balance
        await Wallet.create({
            companyId: testCompanyId,
            balance: 10000,
            currency: 'INR',
            status: 'active'
        });

        // Create shipment
        const shipment = await Shipment.create({
            trackingNumber: 'AUTO-RTO-TEST-001',
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
                recipientEmail: 'test@test.com',
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
            currentStatus: 'ndr',
            ndrDetails: {
                ndrReason: 'Customer not available',
                ndrDate: new Date(),
                ndrStatus: 'pending',
                ndrAttempts: 3  // Already 3 attempts
            },
            weights: {
                declared: { value: 1, unit: 'kg' },
                verified: true
            }
        });

        // Create NDR event with 3 attempts
        const ndrEvent = await NDREvent.create({
            shipmentId: shipment._id,
            companyId: testCompanyId,
            awb: 'AUTO-RTO-TEST-001',
            ndrReason: 'Customer not available',
            ndrDate: new Date(),
            status: 'pending',
            attemptCount: 3,
            resolutionActions: []
        });

        // Trigger auto-RTO check
        const result = await AutoRTOService.checkAndTriggerAutoRTO(shipment._id.toString());

        expect(result.triggered).toBe(true);
        expect(result.reason).toContain('exceeded threshold');

        // Verify RTO event created
        const RTOEvent = (await import('../../../src/infrastructure/database/mongoose/models/rto/rto-event.model')).default;
        const rtoEvents = await RTOEvent.find({ shipmentId: shipment._id });

        expect(rtoEvents.length).toBeGreaterThan(0);
        expect(rtoEvents[0].returnStatus).toBe('initiated');

        // Verify wallet deducted
        const wallet = await Wallet.findOne({ companyId: testCompanyId });
        expect(wallet?.balance).toBeLessThan(10000);

    }, 30000);

    it('should not trigger RTO if attempts below threshold', async () => {
        const shipment = await Shipment.create({
            trackingNumber: 'NO-RTO-TEST-001',
            orderId: new mongoose.Types.ObjectId(),
            companyId: testCompanyId,
            carrier: 'Velocity',
            serviceType: 'standard',
            packageDetails: {
                weight: 1,
                dimensions: { length: 10, width: 10, height: 10 },
                packageCount: 1,
                packageType: 'box',
                declaredValue: 500
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
                type: 'prepaid',
                shippingCost: 40,
                currency: 'INR'
            },
            currentStatus: 'ndr',
            ndrDetails: {
                ndrAttempts: 1  // Only 1 attempt
            },
            weights: {
                declared: { value: 1, unit: 'kg' },
                verified: true
            }
        });

        const result = await AutoRTOService.checkAndTriggerAutoRTO(shipment._id.toString());

        expect(result.triggered).toBe(false);
        expect(result.reason).toContain('below threshold');

    }, 15000);
});
