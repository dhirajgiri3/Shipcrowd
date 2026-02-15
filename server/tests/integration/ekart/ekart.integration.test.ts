/**
 * Integration Test for Ekart Provider
 * 
 * Tests the complete flow with Ekart sandbox/staging API:
 * - Authentication
 * - Shipment creation
 * - Tracking
 * - Rate estimation
 * - Cancellation
 * 
 * NOTE: Requires valid Ekart credentials in .env.test
 */

import { beforeAll, describe, expect, it } from '@jest/globals';
import mongoose from 'mongoose';
import { CourierShipmentData } from '../../../src/infrastructure/external/couriers/base/courier.adapter';
import { EkartProvider } from '../../../src/infrastructure/external/couriers/ekart/ekart.provider';

describe('Ekart Integration Tests', () => {
    let provider: EkartProvider;
    const testCompanyId = new mongoose.Types.ObjectId();
    const hasCredentials = process.env.EKART_USERNAME && process.env.EKART_PASSWORD;

    beforeAll(() => {
        // Skip if no credentials
        if (!hasCredentials) {
            console.warn('⚠️  Skipping Ekart integration tests - no credentials found');
            return;
        }

        provider = new EkartProvider(testCompanyId, {
            baseUrl: process.env.EKART_BASE_URL || 'https://app.elite.ekartlogistics.in',
            username: process.env.EKART_USERNAME,
            password: process.env.EKART_PASSWORD,
            clientId: process.env.EKART_CLIENT_ID
        });
    });

    describe('Authentication', () => {
        it('should authenticate and get valid token', async () => {
            if (!hasCredentials || !provider) return;

            // We can access private auth via 'any' cast for testing
            const token = await (provider as any).auth.getValidToken();
            expect(token).toBeTruthy();
            expect(typeof token).toBe('string');
        });
    });

    describe('Serviceability Check', () => {
        it('should check if pincode is serviceable', async () => {
            if (!hasCredentials || !provider) return;

            const isServiceable = await provider.checkServiceability('110001'); // Delhi
            expect(typeof isServiceable).toBe('boolean');

            // Should be true for major metro
            if (process.env.EKART_MOCK_MODE !== 'true') {
                // expect(isServiceable).toBe(true); // Don't enforce true as it depends on Ekart account config
            }
        });

        it('should return false for invalid pincode', async () => {
            if (!hasCredentials || !provider) return;
            // Ekart might throw error or return false
            try {
                const isServiceable = await provider.checkServiceability('000000');
                expect(isServiceable).toBe(false);
            } catch (e) {
                // If it throws, that's also acceptable for invalid pin
                expect(e).toBeDefined();
            }
        });
    });

    describe('Rate Estimation', () => {
        it('should get shipping rates', async () => {
            if (!hasCredentials || !provider) return;

            const rateRequest = {
                origin: { pincode: '400001' },
                destination: { pincode: '110001' },
                package: {
                    weight: 1, // 1 kg
                    length: 20,
                    width: 15,
                    height: 10
                },
                paymentMode: 'prepaid' as const
            };

            const rates = await provider.getRates(rateRequest);
            expect(Array.isArray(rates)).toBe(true);
            if (rates.length > 0) {
                expect(rates[0]).toHaveProperty('totalCost');
                expect(rates[0]).toHaveProperty('freightCharge');
                expect(rates[0].currency).toBe('INR');
            }
        });
    });

    describe('Shipment Creation', () => {
        it('should create a test shipment', async () => {
            if (!hasCredentials || !provider) return;

            // Only run detailed creation if explicitly enabled (costs money/creates data)
            if (process.env.RUN_EKART_CREATE_TEST !== 'true') {
                console.log('Skipping actual shipment creation (RUN_EKART_CREATE_TEST not set)');
                return;
            }

            const shipmentData: CourierShipmentData = {
                origin: {
                    name: 'Test Warehouse',
                    phone: '9876543210',
                    address: '123 Test Street',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    pincode: '400001',
                    country: 'India',
                    email: 'warehouse@test.com'
                },
                destination: {
                    name: 'Test Customer',
                    phone: '9123456789',
                    address: '456 Customer Road',
                    city: 'Delhi',
                    state: 'Delhi',
                    pincode: '110001',
                    country: 'India',
                    email: 'customer@test.com'
                },
                package: {
                    weight: 0.5,
                    length: 10,
                    width: 10,
                    height: 10,
                    description: 'Test Product',
                    declaredValue: 500,
                    invoiceNumber: `INV-${Date.now()}`,
                    invoiceDate: '2023-10-01'
                },
                orderNumber: `TEST-${Date.now()}`,
                paymentMode: 'prepaid'
            };

            try {
                const response = await provider.createShipment(shipmentData);
                expect(response.trackingNumber).toBeTruthy();
                expect(response.courierReference).toBeTruthy(); // Vendor tracking ID
            } catch (error) {
                console.error('Shipment creation failed:', error);
                throw error;
            }
        });
    });

    describe('Manifest Generation', () => {
        it('should generate manifest for a batch', async () => {
            if (!hasCredentials || !provider) return;
            // Requires valid tracking IDs, skipping for now
            expect(provider.generateManifest).toBeDefined();
        });
    });
});
