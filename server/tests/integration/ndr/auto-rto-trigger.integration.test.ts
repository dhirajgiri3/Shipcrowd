/**
 * Integration Tests for Auto-RTO Trigger
 * 
 * End-to-end tests for:
 * - NDR attempts exceed threshold → Auto-RTO triggered
 */

import mongoose from 'mongoose';
import { Shipment, Company } from '../../../src/infrastructure/database/mongoose/models';
import NDREvent from '../../../src/infrastructure/database/mongoose/models/logistics/shipping/exceptions/ndr-event.model';
import { AutoRTOService } from '../../../src/core/application/services/logistics/auto-rto.service';
import RTOEvent from '../../../src/infrastructure/database/mongoose/models/logistics/shipping/exceptions/rto-event.model';
import { setupTestDatabase, teardownTestDatabase } from '../../setup/testDatabase';

jest.mock('../../../src/core/application/services/rto/rto.service', () => ({
    __esModule: true,
    default: {
        triggerRTO: jest.fn().mockResolvedValue({ success: true }),
    },
}));

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
        // Create company with wallet balance
        await Company.create({
            _id: testCompanyId,
            name: 'Auto RTO Test Company',
            email: 'test@example.com',
            wallet: {
                balance: 10000,
                currency: 'INR',
                status: 'active'
            },
            status: 'approved',
            isActive: true
        });
    });

    afterEach(async () => {
        await Shipment.deleteMany({ companyId: testCompanyId });
        await NDREvent.deleteMany({ companyId: testCompanyId });
        await Company.deleteMany({ _id: testCompanyId });
    });

    it('should trigger RTO after 3 failed NDR attempts', async () => {
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
            currentStatus: 'ndr_pending',
            ndrDetails: {
                ndrReason: 'Customer not available',
                ndrDate: new Date(),
                ndrStatus: 'pending',
                ndrAttempts: 3,
            },
            weights: {
                declared: { value: 1, unit: 'kg' },
                verified: true
            }
        });

        // Trigger auto-RTO check (service uses shipment.ndrDetails.ndrAttempts >= threshold)
        const result = await AutoRTOService.checkAndInitiateAutoRTO((shipment as any)._id.toString());

        expect(result.shouldRTO).toBe(true);
        expect(result.reason).toContain('exceeded threshold');

        // With mocked RTOService, no real RTO event is created; verify result
        expect(result.reason).toBeDefined();

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
            currentStatus: 'ndr_pending',
            ndrDetails: {
                attempts: [
                    { attemptNo: 1, attemptDate: new Date(), status: 'failed', remark: 'Failed 1' }
                ]
            },
            weights: {
                declared: { value: 1, unit: 'kg' },
                verified: true
            }
        });

        const result = await AutoRTOService.checkAndInitiateAutoRTO((shipment as any)._id.toString());

        expect(result.shouldRTO).toBe(false);

    }, 15000);
});
