import { DynamicPricingService } from '@/core/application/services/pricing/dynamic-pricing.service';
import { RateCard } from '@/infrastructure/database/mongoose/models';
import PincodeLookupService from '@/core/application/services/logistics/pincode-lookup.service';
import GSTService from '@/core/application/services/finance/gst.service';
import { getCODChargeService } from '@/core/application/services/pricing/cod-charge.service';
import { getPricingCache } from '@/core/application/services/pricing/pricing-cache.service';
import PricingMetricsService from '@/core/application/services/metrics/pricing-metrics.service';

// Mock Dependencies
jest.mock('@/infrastructure/database/mongoose/models', () => ({
    RateCard: {
        findOne: jest.fn()
    }
}));

jest.mock('@/core/application/services/logistics/pincode-lookup.service');
jest.mock('@/core/application/services/finance/gst.service');
jest.mock('@/core/application/services/pricing/cod-charge.service');
jest.mock('@/core/application/services/pricing/pricing-cache.service');
jest.mock('@/core/application/services/metrics/pricing-metrics.service');
jest.mock('@/shared/logger/winston.logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
}));

describe('DynamicPricingService', () => {
    let service: DynamicPricingService;
    let mockCacheService: any;
    let mockCODService: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup Cache Mock
        mockCacheService = {
            getZone: jest.fn(),
            cacheZone: jest.fn(),
            getRateCardById: jest.fn(),
            cacheRateCardById: jest.fn(),
            getDefaultRateCard: jest.fn(),
            cacheDefaultRateCard: jest.fn()
        };
        (getPricingCache as jest.Mock).mockReturnValue(mockCacheService);

        // Setup COD Service Mock
        mockCODService = {
            calculateCODCharge: jest.fn().mockReturnValue(50) // Default 50rs
        };
        (getCODChargeService as jest.Mock).mockReturnValue(mockCODService);

        // Setup GST Mock
        (GSTService.calculateGST as jest.Mock).mockReturnValue({
            cgst: 9,
            sgst: 9,
            igst: 0,
            totalGST: 18
        });

        // Setup Pincode Mock
        (PincodeLookupService.getZoneFromPincodes as jest.Mock).mockReturnValue({
            zone: 'zoneA',
            isSameCity: true,
            isSameState: true
        });
        (PincodeLookupService.getPincodeDetails as jest.Mock).mockReturnValue({
            state: 'Delhi',
            city: 'New Delhi'
        });

        // Default Mock Return for RateCard
        (RateCard.findOne as jest.Mock).mockReturnValue({
            sort: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue(null)
        });

        service = new DynamicPricingService();
    });

    describe('calculatePricing', () => {
        const defaultInput = {
            companyId: 'company123',
            fromPincode: '110001',
            toPincode: '400001',
            weight: 1.5,
            paymentMode: 'prepaid' as const,
            orderValue: 1000,
            carrier: 'velocity',
            serviceType: 'standard'
        };

        const mockRateCard = {
            _id: 'rc123',
            name: 'Standard Card',
            zonePricing: {
                zoneA: { baseWeight: 0.5, basePrice: 100, additionalPricePerKg: 20 },
                zoneB: { baseWeight: 0.5, basePrice: 120, additionalPricePerKg: 25 },
                zoneC: { baseWeight: 0.5, basePrice: 140, additionalPricePerKg: 30 },
                zoneD: { baseWeight: 0.5, basePrice: 160, additionalPricePerKg: 35 },
                zoneE: { baseWeight: 0.5, basePrice: 180, additionalPricePerKg: 40 }
            },
            minimumFare: 0,
            fuelSurcharge: 0,
            remoteAreaSurcharge: 0,
            codSurcharges: [],
            version: 'v2'
        };

        it('should calculate basic prepaid pricing successfully', async () => {
            (RateCard.findOne as jest.Mock).mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(mockRateCard)
            });

            const result = await service.calculatePricing(defaultInput);

            expect(result).toBeDefined();
            expect(result.pricingProvider).toBe('internal');
            expect(result.metadata.zone).toBe('zoneA');
            expect(result.metadata.breakdown?.baseCharge).toBe(100);
            expect(result.metadata.breakdown?.weightCharge).toBe(20); // (1.5 - 0.5) * 20
            expect(result.total).toBeGreaterThan(0);
            expect(PricingMetricsService.incrementRequestCount).toHaveBeenCalled();
            expect(PricingMetricsService.observeLatency).toHaveBeenCalled();
        });

        it('should prioritize externalZone if provided', async () => {
            (RateCard.findOne as jest.Mock).mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(mockRateCard)
            });

            const result = await service.calculatePricing({
                ...defaultInput,
                externalZone: 'zoneE'
            });

            expect(result.metadata.zone).toBe('zoneE');
            expect(result.metadata.zoneSource).toBe('external_velocity');
        });

        it('should apply fuel surcharge correctly', async () => {
            const fuelRateCard = {
                ...mockRateCard,
                fuelSurcharge: 20
            };
            (RateCard.findOne as jest.Mock).mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(fuelRateCard)
            });

            const result = await service.calculatePricing(defaultInput);

            expect(result.metadata.breakdown?.fuelCharge).toBeGreaterThan(0);
        });

        it('should apply COD surcharge from slabs correctly', async () => {
            const codRateCard = {
                ...mockRateCard,
                codSurcharges: [
                    { min: 0, max: 2000, value: 50, type: 'flat' }
                ]
            };
            (RateCard.findOne as jest.Mock).mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(codRateCard)
            });

            const result = await service.calculatePricing({
                ...defaultInput,
                paymentMode: 'cod',
                orderValue: 1500
            });

            expect(result.codCharge).toBe(50);
        });

        it('should enforce minimum fare', async () => {
            const minFareRateCard = {
                ...mockRateCard,
                zonePricing: {
                    zoneA: { baseWeight: 0.5, basePrice: 10, additionalPricePerKg: 5 },
                    zoneB: { baseWeight: 0.5, basePrice: 10, additionalPricePerKg: 5 },
                    zoneC: { baseWeight: 0.5, basePrice: 10, additionalPricePerKg: 5 },
                    zoneD: { baseWeight: 0.5, basePrice: 10, additionalPricePerKg: 5 },
                    zoneE: { baseWeight: 0.5, basePrice: 10, additionalPricePerKg: 5 }
                },
                minimumFare: 100,
                minimumFareCalculatedOn: 'freight_overhead'
            };
            (RateCard.findOne as jest.Mock).mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(minFareRateCard)
            });

            const result = await service.calculatePricing(defaultInput);

            expect(result.subtotal).toBe(100);
            expect(result.total).toBe(118);
        });
    });
});
