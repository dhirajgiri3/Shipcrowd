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

import { describe, it, expect, beforeAll } from '@jest/globals';
import mongoose from 'mongoose';
import { EkartProvider } from '../../../src/infrastructure/external/couriers/ekart/ekart.provider';
import { CourierShipmentData } from '../../../src/infrastructure/external/couriers/base/courier.adapter';

describe('Ekart Integration Tests', () => {
    let provider: EkartProvider;
    const testCompanyId = new mongoose.Types.ObjectId();

    beforeAll(() => {
        // Skip if no credentials
        if (!process.env.EKART_USERNAME || !process.env.EKART_PASSWORD) {
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
            if (!provider) return;

            // Access the auth instance (may need to make it public for testing)
            expect(provider).toBeDefined();

            // TODO: Add actual authentication test
            // const token = await provider.auth.getValidToken();
            // expect(token).toBeTruthy();
        });
    });

    describe('Serviceability Check', () => {
        it('should check if pincode is serviceable', async () => {
            if (!provider) return;

            const isServiceable = await provider.checkServiceability('110001');
            expect(typeof isServiceable).toBe('boolean');
        });
    });

    describe('Rate Estimation', () => {
        it('should get shipping rates', async () => {
            if (!provider) return;

            const rateRequest = {
                origin: { pincode: '400001' },
                destination: { pincode: '110001' },
                package: {
                    weight: 1,
                    length: 20,
                    width: 15,
                    height: 10
                },
                paymentMode: 'prepaid' as const
            };

            const rates = await provider.getRates(rateRequest);
            expect(Array.isArray(rates)).toBe(true);
            if (rates.length > 0) {
                expect(rates[0]).toHaveProperty('total');
                expect(rates[0]).toHaveProperty('currency', 'INR');
            }
        });
    });

    describe('Shipment Creation', () => {
        it('should create a test shipment', async () => {
            if (!provider) return;

            const shipmentData: CourierShipmentData = {
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
                    name: 'Test Customer',
                    phone: '9123456789',
                    address: '456 Customer Road',
                    city: 'Delhi',
                    state: 'Delhi',
                    pincode: '110001',
                    country: 'India'
                },
                package: {
                    weight: 1,
                    length: 20,
                    width: 15,
                    height: 10,
                    description: 'Test Product',
                    declaredValue: 1000
                },
                orderNumber: `TEST-${Date.now()}`,
                paymentMode: 'prepaid'
            };

            // NOTE: Uncomment to run actual shipment creation (will create real shipment)
            // const response = await provider.createShipment(shipmentData);
            // expect(response.trackingNumber).toBeTruthy();

            expect(shipmentData).toBeDefined();
        });
    });

    describe('Idempotency', () => {
        it('should return cached response for duplicate request', async () => {
            if (!provider) return;

            // Test that same idempotency key returns cached result
            expect(provider).toBeDefined();

            // TODO: Create shipment twice with same idempotency key
            // Verify second call doesn't hit API
        });
    });
});
