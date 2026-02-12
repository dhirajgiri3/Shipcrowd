/**
 * Integration Tests for Velocity Split Flow
 * 
 * End-to-end tests for:
 * - Complete split flow: createOrderOnly → getRates → assignCourier
 * - Reverse split flow: createReverseOrderOnly → assignReverseCourier
 * - Reports API integration
 */

import mongoose from 'mongoose';
import { VelocityShipfastProvider } from '../../../src/infrastructure/external/couriers/velocity/velocity-shipfast.provider';
import { CourierShipmentData, CourierRateRequest } from '../../../src/infrastructure/external/couriers/base/courier.adapter';
import Warehouse from '../../../src/infrastructure/database/mongoose/models/logistics/warehouse/structure/warehouse.model';
import { setupTestDatabase, teardownTestDatabase } from '../../setup/testDatabase';

describe('Velocity Split Flow Integration Tests', () => {
    let velocityProvider: VelocityShipfastProvider;
    let testCompanyId: mongoose.Types.ObjectId;
    let testWarehouseId: mongoose.Types.ObjectId;
    const hasVelocityCredentials = Boolean(process.env.VELOCITY_USERNAME && process.env.VELOCITY_PASSWORD);

    beforeAll(async () => {
        await setupTestDatabase();
    });

    afterAll(async () => {
        await teardownTestDatabase();
    });

    beforeEach(async () => {
        testCompanyId = new mongoose.Types.ObjectId();

        // Create test warehouse
        const warehouse = await Warehouse.create({
            companyId: testCompanyId,
            name: 'Test Warehouse',
            type: 'fulfillment',
            contactInfo: {
                name: 'Warehouse Manager',
                phone: '9876543210',
                email: 'warehouse@test.com'
            },
            address: {
                line1: '123 Test Street',
                city: 'Mumbai',
                state: 'Maharashtra',
                postalCode: '400001',
                country: 'India'
            },
            carrierDetails: {
                velocityWarehouseId: 'VEL-WH-TEST-123'
            },
            isActive: true
        });

        testWarehouseId = warehouse._id as mongoose.Types.ObjectId;
        velocityProvider = new VelocityShipfastProvider(testCompanyId, process.env.VELOCITY_BASE_URL);
    });

    describe('Complete Forward Split Flow', () => {
        it('should complete: createOrderOnly → getRates → assignCourier', async () => {
            if (!hasVelocityCredentials) {
                console.warn('⚠️  Skipping Velocity split-flow integration test - no credentials found');
                return;
            }
            // Step 1: Create order without courier assignment
            const shipmentData: CourierShipmentData & { warehouseId: string } = {
                origin: {
                    name: 'Test Warehouse',
                    phone: '9876543210',
                    address: '123 Test Street',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    pincode: '400001',
                    country: 'India'
                },
                destination: {
                    name: 'John Doe',
                    phone: '9123456789',
                    address: '456 Customer Avenue',
                    city: 'Delhi',
                    state: 'Delhi',
                    pincode: '110001',
                    country: 'India'
                },
                package: {
                    weight: 2,
                    length: 20,
                    width: 15,
                    height: 10,
                    declaredValue: 2000
                },
                orderNumber: `TEST-ORD-${Date.now()}`,
                paymentMode: 'cod',
                codAmount: 2000,
                warehouseId: testWarehouseId.toString()
            };

            const orderCreated = await velocityProvider.createForwardOrderOnly(shipmentData);

            expect(orderCreated.success).toBe(true);
            expect(orderCreated.shipmentId).toBeDefined();
            expect(orderCreated.orderId).toBeDefined();

            // Step 2: Get rates with zone and pricing
            const rateRequest: CourierRateRequest = {
                origin: { pincode: '400001' },
                destination: { pincode: '110001' },
                package: { weight: 2, length: 20, width: 15, height: 10 },
                paymentMode: 'cod',
                orderValue: 2000
            };

            const rates = await velocityProvider.getRates(rateRequest);

            expect(rates).toBeInstanceOf(Array);
            expect(rates.length).toBeGreaterThan(0);
            expect(rates[0]).toHaveProperty('carrierId');
            expect(rates[0]).toHaveProperty('zone');
            expect(rates[0]).toHaveProperty('total');

            // Verify sorted by price
            for (let i = 1; i < rates.length; i++) {
                expect(rates[i].total).toBeGreaterThanOrEqual(rates[i - 1].total);
            }

            // Step 3: Assign courier from rates
            const selectedCarrier = rates[0];  // Pick cheapest
            const assignedShipment = await velocityProvider.assignCourier(
                orderCreated.shipmentId,
                selectedCarrier.carrierId
            );

            expect(assignedShipment.trackingNumber).toBeDefined();
            expect(assignedShipment.labelUrl).toBeDefined();
            expect(assignedShipment.cost).toBeGreaterThan(0);

        }, 30000); // 30 second timeout for API calls
    });

    describe('Complete Reverse Split Flow', () => {
        it('should complete: createReverseOrderOnly → assignReverseCourier', async () => {
            if (!hasVelocityCredentials) {
                console.warn('⚠️  Skipping Velocity split-flow integration test - no credentials found');
                return;
            }
            // Step 1: Create reverse order
            const reverseData = {
                orderId: `TEST-RTO-${Date.now()}`,
                pickupAddress: {
                    name: 'Customer Name',
                    phone: '9123456789',
                    address: '456 Customer Avenue',
                    city: 'Delhi',
                    state: 'Delhi',
                    pincode: '110001',
                    country: 'India',
                    email: 'customer@test.com'
                },
                returnWarehouseId: testWarehouseId.toString(),
                package: {
                    weight: 1.5,
                    length: 15,
                    width: 15,
                    height: 10
                }
            };

            const reverseOrderCreated = await velocityProvider.createReverseOrderOnly(reverseData);

            expect(reverseOrderCreated.success).toBe(true);
            expect(reverseOrderCreated.returnId).toBeDefined();
            expect(reverseOrderCreated.orderId).toBeDefined();

            // Step 2: Assign courier to reverse order
            const assignedReverseShipment = await velocityProvider.assignCourierToReverseOrder(
                reverseOrderCreated.returnId,
                testWarehouseId.toString()
            );

            expect(assignedReverseShipment.trackingNumber).toBeDefined();
            expect(assignedReverseShipment.labelUrl).toBeDefined();
            expect(assignedReverseShipment.courierName).toBeDefined();

        }, 30000);
    });

    describe('Reports API Integration', () => {
        it('should fetch summary report for date range', async () => {
            if (!hasVelocityCredentials) {
                console.warn('⚠️  Skipping Velocity split-flow integration test - no credentials found');
                return;
            }
            const startDate = new Date('2026-01-01');
            const endDate = new Date('2026-02-01');

            const report = await velocityProvider.getSummaryReport(startDate, endDate, 'forward');

            expect(report).toBeDefined();
            expect(report.date_range).toBeDefined();
            expect(report.shipment_type).toBe('forward');
            expect(report.summary).toBeDefined();
            expect(typeof report.summary.total_shipments).toBe('number');

        }, 15000);
    });

    describe('Rate Calculation with Internal Pricing', () => {
        it('should return non-zero prices from internal rate cards', async () => {
            if (!hasVelocityCredentials) {
                console.warn('⚠️  Skipping Velocity split-flow integration test - no credentials found');
                return;
            }
            const rateRequest: CourierRateRequest = {
                origin: { pincode: '400001' },
                destination: { pincode: '560001' },  // Mumbai to Bangalore
                package: { weight: 1, length: 15, width: 15, height: 10 },
                paymentMode: 'prepaid'
            };

            const rates = await velocityProvider.getRates(rateRequest);

            expect(rates.length).toBeGreaterThan(0);
            
            // At least one rate should have pricing (unless all carriers fail)
            const hasNonZeroPrice = rates.some(rate => rate.total > 0);
            expect(hasNonZeroPrice).toBe(true);

            // All rates should have zone
            rates.forEach(rate => {
                expect(rate.zone).toBeDefined();
                expect(rate.carrierId).toBeDefined();
            });

        }, 15000);
    });
});
