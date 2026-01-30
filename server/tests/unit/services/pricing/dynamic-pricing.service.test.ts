import { DynamicPricingService } from '@/core/application/services/pricing/dynamic-pricing.service';
import { RateCard, Zone } from '@/infrastructure/database/mongoose/models';
import PincodeLookupService from '@/core/application/services/logistics/pincode-lookup.service';
import GSTService from '@/core/application/services/finance/gst.service';
import { getCODChargeService } from '@/core/application/services/pricing/cod-charge.service';
import { getPricingCache } from '@/core/application/services/pricing/pricing-cache.service';
import PricingMetricsService from '@/core/application/services/metrics/pricing-metrics.service';

// Mock Dependencies
jest.mock('@/infrastructure/database/mongoose/models', () => ({
    RateCard: {
        findOne: jest.fn()
    },
    Zone: {
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

        // Default Mock Return for RateCard/Zone to avoid undefined errors
        (RateCard.findOne as jest.Mock).mockReturnValue({
            sort: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue(null)
        });
        (Zone.findOne as jest.Mock).mockReturnValue({
            select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(null)
            })
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
            carrier: 'velocity',
            serviceType: 'standard',
            baseRates: [
                { minWeight: 0, maxWeight: 5, basePrice: 100 } // zoneA match scenario logic mock
            ],
            zoneRules: [
                { zoneId: 'zoneId1', additionalPrice: 20 }
            ],
            zoneMultipliers: { zoneA: 1.0 },
            minimumCall: 0,
            fuelSurcharge: 0,
            remoteAreaSurcharge: 0,
            codSurcharges: [],
            version: 'v2'
        };

        it('should calculate basic prepaid pricing successfully', async () => {
            // Mock RateCard found
            (RateCard.findOne as jest.Mock).mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(mockRateCard)
            });

            // Mock Zone found
            (Zone.findOne as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue({ _id: 'zoneId1' })
                })
            });

            const result = await service.calculatePricing(defaultInput);

            expect(result).toBeDefined();
            expect(result.pricingProvider).toBe('internal');
            expect(result.metadata.zone).toBe('zoneA');
            expect(result.total).toBeGreaterThan(0);
            expect(PricingMetricsService.incrementRequestCount).toHaveBeenCalled();
            expect(PricingMetricsService.observeLatency).toHaveBeenCalled();
        });

        it('should prioritize externalZone if provided', async () => {
            // Mock RateCard found
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
                fuelSurcharge: 20 // 20%
            };
            (RateCard.findOne as jest.Mock).mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(fuelRateCard)
            });

            const result = await service.calculatePricing(defaultInput);

            // 100 base + 20% = 120 (approx) + GST
            // We verify fuelCharge metadata
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

        it('should enforce minimum call', async () => {
            const minCallRateCard = {
                ...mockRateCard,
                baseRates: [
                    { minWeight: 0, maxWeight: 5, basePrice: 10 } // Very low price
                ],
                minimumCall: 100
            };
            (RateCard.findOne as jest.Mock).mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(minCallRateCard)
            });

            const result = await service.calculatePricing(defaultInput);

            // Subtotal (before tax) should be at least 100
            // But logic says: if subTotal < minCall, subTotal = minCall.
            // With 10 base + 20% zone(2) = 12.
            // MinCall 100.
            // Subtotal -> 100.
            // Tax on 100 -> 18.
            // Total -> 118.
            expect(result.subtotal).toBe(100);
            expect(result.total).toBe(118);
        });
    });
});
