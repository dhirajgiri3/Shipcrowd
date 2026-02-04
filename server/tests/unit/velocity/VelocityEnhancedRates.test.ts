/**
 * Unit Tests for Velocity Enhanced getRates
 * 
 * Tests:
 * - getRates() with internal pricing integration
 */

import mongoose from 'mongoose';
import { VelocityShipfastProvider } from '../../../src/infrastructure/external/couriers/velocity/velocity-shipfast.provider';
import { CourierRateRequest } from '../../../src/infrastructure/external/couriers/base/courier.adapter';
import { DynamicPricingService } from '../../../src/core/application/services/pricing/dynamic-pricing.service';
import { VELOCITY_CARRIER_IDS } from '../../../src/infrastructure/external/couriers/velocity/velocity-carrier-ids';

jest.mock('../../../src/infrastructure/external/couriers/velocity/velocity.auth');
jest.mock('../../../src/core/application/services/pricing/dynamic-pricing.service');

describe('Velocity Enhanced getRates', () => {
    let velocityProvider: VelocityShipfastProvider;
    let mockCompanyId: mongoose.Types.ObjectId;

    beforeEach(() => {
        mockCompanyId = new mongoose.Types.ObjectId();
        velocityProvider = new VelocityShipfastProvider(mockCompanyId);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return actual prices from internal rate cards', async () => {
        const mockRateRequest: CourierRateRequest = {
            origin: { pincode: '400001' },
            destination: { pincode: '110001' },
            package: { weight: 2, length: 20, width: 15, height: 10 },
            paymentMode: 'cod',
            orderValue: 2000
        };

        // Mock serviceability response
        const mockHttpClient = (velocityProvider as any).httpClient;
        mockHttpClient.post = jest.fn().mockResolvedValue({
            data: {
                serviceability_results: [
                    { carrier_id: VELOCITY_CARRIER_IDS.BLUEDART_STANDARD, carrier_name: 'Bluedart' },
                    { carrier_id: VELOCITY_CARRIER_IDS.DELHIVERY_STANDARD, carrier_name: 'Delhivery' }
                ],
                zone: 'zone_b'
            }
        });

        // Mock pricing service
        const mockPricingService = DynamicPricingService as jest.MockedClass<typeof DynamicPricingService>;
        mockPricingService.prototype.calculatePricing = jest.fn()
            .mockResolvedValueOnce({
                shipping: 80,
                tax: { total: 14.4 },
                total: 94.4
            })
            .mockResolvedValueOnce({
                shipping: 70,
                tax: { total: 12.6 },
                total: 82.6
            });

        const result = await velocityProvider.getRates(mockRateRequest);

        expect(result).toHaveLength(2);
        expect(result[0].total).toBe(82.6); // Sorted by price
        expect(result[0].carrierId).toBe(VELOCITY_CARRIER_IDS.DELHIVERY_STANDARD);
        expect(result[0].zone).toBe('zone_b');
        expect(result[1].total).toBe(94.4);
        expect(result[1].carrierId).toBe(VELOCITY_CARRIER_IDS.BLUEDART_STANDARD);
    });

    it('should include carrier_id and zone in results', async () => {
        const mockHttpClient = (velocityProvider as any).httpClient;
        mockHttpClient.post = jest.fn().mockResolvedValue({
            data: {
                serviceability_results: [
                    { carrier_id: VELOCITY_CARRIER_IDS.EKART_STANDARD, carrier_name: 'Ekart' }
                ],
                zone: 'zone_a'
            }
        });

        const mockPricingService = DynamicPricingService as jest.MockedClass<typeof DynamicPricingService>;
        mockPricingService.prototype.calculatePricing = jest.fn().mockResolvedValue({
            shipping: 50,
            tax: { total: 9 },
            total: 59
        });

        const result = await velocityProvider.getRates({
            origin: { pincode: '400001' },
            destination: { pincode: '400002' },
            package: { weight: 1, length: 10, width: 10, height: 10 },
            paymentMode: 'prepaid'
        });

        expect(result[0].carrierId).toBe(VELOCITY_CARRIER_IDS.EKART_STANDARD);
        expect(result[0].zone).toBe('zone_a');
        expect(result[0].basePrice).toBe(50);
        expect(result[0].taxes).toBe(9);
        expect(result[0].total).toBe(59);
    });

    it('should fallback to 0 price on pricing calculation error', async () => {
        const mockHttpClient = (velocityProvider as any).httpClient;
        mockHttpClient.post = jest.fn().mockResolvedValue({
            data: {
                serviceability_results: [
                    { carrier_id: 'ERR-001', carrier_name: 'ErrorCarrier' }
                ],
                zone: 'zone_c'
            }
        });

        const mockPricingService = DynamicPricingService as jest.MockedClass<typeof DynamicPricingService>;
        mockPricingService.prototype.calculatePricing = jest.fn().mockRejectedValue(
            new Error('Rate card not found')
        );

        const result = await velocityProvider.getRates({
            origin: { pincode: '400001' },
            destination: { pincode: '999999' },
            package: { weight: 1, length: 10, width: 10, height: 10 },
            paymentMode: 'prepaid'
        });

        expect(result[0].total).toBe(0);
        expect(result[0].carrierId).toBe('ERR-001');
        expect(result[0].zone).toBe('zone_c');
    });

    it('should sort results by total price ascending', async () => {
        const mockHttpClient = (velocityProvider as any).httpClient;
        mockHttpClient.post = jest.fn().mockResolvedValue({
            data: {
                serviceability_results: [
                    { carrier_id: 'A-001', carrier_name: 'ExpensiveCourier' },
                    { carrier_id: 'B-001', carrier_name: 'CheapCourier' },
                    { carrier_id: 'C-001', carrier_name: 'MidCourier' }
                ],
                zone: 'zone_d'
            }
        });

        const mockPricingService = DynamicPricingService as jest.MockedClass<typeof DynamicPricingService>;
        mockPricingService.prototype.calculatePricing = jest.fn()
            .mockResolvedValueOnce({ shipping: 100, tax: { total: 18 }, total: 118 })
            .mockResolvedValueOnce({ shipping: 50, tax: { total: 9 }, total: 59 })
            .mockResolvedValueOnce({ shipping: 75, tax: { total: 13.5 }, total: 88.5 });

        const result = await velocityProvider.getRates({
            origin: { pincode: '400001' },
            destination: { pincode: '110001' },
            package: { weight: 1.5, length: 15, width: 15, height: 15 },
            paymentMode: 'prepaid'
        });

        expect(result).toHaveLength(3);
        expect(result[0].total).toBe(59);    // Cheapest first
        expect(result[1].total).toBe(88.5);  // Mid price
        expect(result[2].total).toBe(118);   // Most expensive last
    });
});
