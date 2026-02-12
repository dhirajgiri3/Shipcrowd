import { AppError } from '@/shared/errors/app.error';
import { ServiceRateCardFormulaService } from '@/core/application/services/pricing/service-rate-card-formula.service';
import { ServiceRateCardFormulaInput } from '@/core/domain/types/service-level-pricing.types';

type MockedPincodeLookup = {
    getPincodeDetails: jest.Mock;
    getZoneFromPincodes: jest.Mock;
    isValidPincodeFormat: jest.Mock;
};

type MockedGSTService = {
    calculateGST: jest.Mock;
};

const createBaseCard = (): ServiceRateCardFormulaInput['serviceRateCard'] => ({
    cardType: 'sell',
    currency: 'INR',
    calculation: {
        weightBasis: 'max',
        roundingUnitKg: 0.5,
        roundingMode: 'ceil',
        dimDivisor: 5000,
    },
    zoneRules: [
        {
            zoneKey: 'zoneA',
            slabs: [
                { minKg: 0, maxKg: 1, charge: 100 },
                { minKg: 1.01, maxKg: 2, charge: 180 },
            ],
            additionalPerKg: 50,
            fuelSurcharge: { percentage: 10, base: 'freight' },
        },
        {
            zoneKey: 'zoneD',
            slabs: [{ minKg: 0, maxKg: 1, charge: 120 }],
            additionalPerKg: 60,
            fuelSurcharge: { percentage: 10, base: 'freight' },
        },
    ],
});

const createInput = (
    overrides: Partial<ServiceRateCardFormulaInput> = {}
): ServiceRateCardFormulaInput => ({
    serviceRateCard: createBaseCard(),
    weight: 0.8,
    dimensions: { length: 10, width: 10, height: 10 },
    zone: 'zoneA',
    paymentMode: 'prepaid',
    orderValue: 1000,
    provider: 'delhivery',
    fromPincode: '560001',
    toPincode: '560002',
    ...overrides,
});

describe('ServiceRateCardFormulaService', () => {
    let pincodeLookup: MockedPincodeLookup;
    let gstService: MockedGSTService;
    let service: ServiceRateCardFormulaService;
    const originalRtoFlag = process.env.SERVICE_LEVEL_RTO_PRICING_ENABLED;

    beforeEach(() => {
        pincodeLookup = {
            getPincodeDetails: jest.fn().mockImplementation((pincode: string) => {
                if (pincode.startsWith('56')) return { state: 'KARNATAKA' };
                if (pincode.startsWith('11')) return { state: 'DELHI' };
                return null;
            }),
            getZoneFromPincodes: jest.fn().mockReturnValue({ zone: 'zoneD' }),
            isValidPincodeFormat: jest.fn().mockReturnValue(true),
        };

        gstService = {
            calculateGST: jest
                .fn()
                .mockImplementation((taxableAmount: number, sellerCode: string, buyerCode: string) => {
                    const isInterState = sellerCode !== buyerCode;
                    if (isInterState) {
                        return { cgst: 0, sgst: 0, igst: taxableAmount * 0.18, totalGST: taxableAmount * 0.18 };
                    }
                    const half = taxableAmount * 0.09;
                    return { cgst: half, sgst: half, igst: 0, totalGST: taxableAmount * 0.18 };
                }),
        };

        service = new ServiceRateCardFormulaService(pincodeLookup, gstService);
    });

    afterEach(() => {
        if (originalRtoFlag === undefined) {
            delete process.env.SERVICE_LEVEL_RTO_PRICING_ENABLED;
        } else {
            process.env.SERVICE_LEVEL_RTO_PRICING_ENABLED = originalRtoFlag;
        }
    });

    it('uses actual weight when actual is higher than volumetric', () => {
        const result = service.calculatePricing(createInput());

        expect(result.chargeableWeight).toBe(0.8);
        expect(result.breakdown.weight.chargedBy).toBe('actual');
        expect(result.baseCharge).toBe(100);
    });

    it('uses volumetric weight when volumetric is higher than actual', () => {
        const result = service.calculatePricing(
            createInput({
                weight: 0.2,
                dimensions: { length: 40, width: 30, height: 20 },
            })
        );

        expect(result.chargeableWeight).toBe(4.8);
        expect(result.breakdown.weight.chargedBy).toBe('volumetric');
        expect(result.weightCharge).toBe(150);
    });

    it('respects weightBasis override when set to actual', () => {
        const card = createBaseCard();
        card.calculation.weightBasis = 'actual';
        const result = service.calculatePricing(
            createInput({
                serviceRateCard: card,
                weight: 0.2,
                dimensions: { length: 40, width: 30, height: 20 },
            })
        );

        expect(result.chargeableWeight).toBe(0.2);
        expect(result.breakdown.weight.weightBasisUsed).toBe('actual');
        expect(result.weightCharge).toBe(0);
    });

    it('normalizes input zone variants like A and route_a', () => {
        const resultA = service.calculatePricing(createInput({ zone: 'A' }));
        const resultRoute = service.calculatePricing(createInput({ zone: 'route_a' }));

        expect(resultA.breakdown.zone.resolvedZone).toBe('zonea');
        expect(resultA.breakdown.zone.source).toBe('input');
        expect(resultA.breakdown.zone.matchedZoneRule).toBe('zoneA');

        expect(resultRoute.breakdown.zone.resolvedZone).toBe('zonea');
        expect(resultRoute.breakdown.zone.source).toBe('input');
    });

    it('falls back to pincode lookup zone when input zone is invalid', () => {
        const result = service.calculatePricing(createInput({ zone: 'invalid_zone' }));

        expect(result.breakdown.zone.source).toBe('pincode_lookup');
        expect(result.breakdown.zone.resolvedZone).toBe('zoned');
        expect(pincodeLookup.getZoneFromPincodes).toHaveBeenCalledWith('560001', '560002');
    });

    it('applies slab charge when chargeable weight falls within slab', () => {
        const result = service.calculatePricing(createInput({ weight: 0.9 }));
        expect(result.baseCharge).toBe(100);
        expect(result.weightCharge).toBe(0);
        expect(result.subtotal).toBe(100);
    });

    it('applies beyond-slab weight charge with ceil rounding', () => {
        const card = createBaseCard();
        card.zoneRules[0].slabs = [{ minKg: 0, maxKg: 1, charge: 100 }];
        card.zoneRules[0].additionalPerKg = 50;
        card.calculation.roundingMode = 'ceil';
        card.calculation.roundingUnitKg = 0.5;

        const result = service.calculatePricing(createInput({ serviceRateCard: card, weight: 1.2 }));

        expect(result.baseCharge).toBe(100);
        expect(result.weightCharge).toBe(25);
        expect(result.breakdown.slab.beyondMaxSlab).toBe(true);
    });

    it('applies floor and nearest rounding modes correctly beyond max slab', () => {
        const cardFloor = createBaseCard();
        cardFloor.zoneRules[0].slabs = [{ minKg: 0, maxKg: 1, charge: 100 }];
        cardFloor.zoneRules[0].additionalPerKg = 50;
        cardFloor.calculation.roundingMode = 'floor';
        cardFloor.calculation.roundingUnitKg = 0.5;

        const floorResult = service.calculatePricing(createInput({ serviceRateCard: cardFloor, weight: 1.2 }));
        expect(floorResult.weightCharge).toBe(0);

        const cardNearest = createBaseCard();
        cardNearest.zoneRules[0].slabs = [{ minKg: 0, maxKg: 1, charge: 100 }];
        cardNearest.zoneRules[0].additionalPerKg = 50;
        cardNearest.calculation.roundingMode = 'nearest';
        cardNearest.calculation.roundingUnitKg = 0.5;

        const nearestResult = service.calculatePricing(
            createInput({ serviceRateCard: cardNearest, weight: 1.3 })
        );
        expect(nearestResult.weightCharge).toBe(25);
    });

    it('calculates COD using flat and percentage rule types', () => {
        const flatCard = createBaseCard();
        flatCard.zoneRules[0].codRule = { type: 'flat', minCharge: 45 };
        const flatResult = service.calculatePricing(
            createInput({ serviceRateCard: flatCard, paymentMode: 'cod', orderValue: 1200 })
        );
        expect(flatResult.codCharge).toBe(45);
        expect(flatResult.breakdown.cod.ruleType).toBe('flat');

        const pctCard = createBaseCard();
        pctCard.zoneRules[0].codRule = { type: 'percentage', percentage: 2, minCharge: 30, maxCharge: 60 };
        const pctResult = service.calculatePricing(
            createInput({ serviceRateCard: pctCard, paymentMode: 'cod', orderValue: 2500 })
        );
        expect(pctResult.codCharge).toBe(50);
        expect(pctResult.breakdown.cod.ruleType).toBe('percentage');
    });

    it('calculates COD using slab rule and falls back when slab does not match', () => {
        const slabCard = createBaseCard();
        slabCard.zoneRules[0].codRule = {
            type: 'slab',
            slabs: [
                { min: 0, max: 1000, value: 30, type: 'flat' },
                { min: 1001, max: 5000, value: 1.5, type: 'percentage' },
            ],
        };
        const slabResult = service.calculatePricing(
            createInput({ serviceRateCard: slabCard, paymentMode: 'cod', orderValue: 2000 })
        );
        expect(slabResult.codCharge).toBe(30);
        expect(slabResult.breakdown.cod.ruleType).toBe('slab');

        const fallbackCard = createBaseCard();
        fallbackCard.zoneRules[0].codRule = {
            type: 'slab',
            slabs: [{ min: 0, max: 100, value: 20, type: 'flat' }],
        };
        const fallbackResult = service.calculatePricing(
            createInput({ serviceRateCard: fallbackCard, paymentMode: 'cod', orderValue: 2000 })
        );
        expect(fallbackResult.codCharge).toBe(40);
        expect(fallbackResult.breakdown.cod.ruleType).toBe('fallback');
    });

    it('uses fallback COD when codRule is missing and ignores COD for prepaid', () => {
        const fallbackCard = createBaseCard();
        delete fallbackCard.zoneRules[0].codRule;
        const codResult = service.calculatePricing(
            createInput({ serviceRateCard: fallbackCard, paymentMode: 'cod', orderValue: 1000 })
        );
        expect(codResult.codCharge).toBe(30);

        const prepaidResult = service.calculatePricing(
            createInput({ serviceRateCard: fallbackCard, paymentMode: 'prepaid' })
        );
        expect(prepaidResult.codCharge).toBe(0);
        expect(prepaidResult.breakdown.cod.ruleType).toBe('not_applicable');
    });

    it('calculates fuel surcharge for freight and freight_cod modes', () => {
        const freightCard = createBaseCard();
        freightCard.zoneRules[0].fuelSurcharge = { percentage: 10, base: 'freight' };
        const freightResult = service.calculatePricing(
            createInput({ serviceRateCard: freightCard, paymentMode: 'cod', orderValue: 1000 })
        );
        expect(freightResult.fuelCharge).toBe(10);

        const freightCodCard = createBaseCard();
        freightCodCard.zoneRules[0].fuelSurcharge = { percentage: 10, base: 'freight_cod' };
        const freightCodResult = service.calculatePricing(
            createInput({ serviceRateCard: freightCodCard, paymentMode: 'cod', orderValue: 1000 })
        );
        expect(freightCodResult.fuelCharge).toBe(13); // subtotal(100) + cod(30)
    });

    it('applies forward_mirror fallback RTO when rtoRule is missing', () => {
        const card = createBaseCard();
        delete card.zoneRules[0].rtoRule;

        const result = service.calculatePricing(createInput({ serviceRateCard: card }));

        expect(result.rtoCharge).toBe(100);
        expect(result.breakdown.rto.calculationMode).toBe('forward_mirror');
        expect(result.breakdown.rto.fallbackApplied).toBe(true);
    });

    it('applies flat RTO rule over forward_mirror fallback', () => {
        const card = createBaseCard();
        card.zoneRules[0].rtoRule = { type: 'flat', amount: 45 };

        const result = service.calculatePricing(createInput({ serviceRateCard: card }));

        expect(result.rtoCharge).toBe(45);
        expect(result.breakdown.rto.calculationMode).toBe('flat');
        expect(result.breakdown.rto.fallbackApplied).toBe(false);
    });

    it('applies percentage RTO with min/max clamps', () => {
        const cardMin = createBaseCard();
        cardMin.zoneRules[0].rtoRule = { type: 'percentage', percentage: 10, minCharge: 20, maxCharge: 30 };
        cardMin.zoneRules[0].slabs = [{ minKg: 0, maxKg: 1, charge: 100 }];

        const minResult = service.calculatePricing(createInput({ serviceRateCard: cardMin }));
        expect(minResult.rtoCharge).toBe(20);

        const cardMax = createBaseCard();
        cardMax.zoneRules[0].rtoRule = { type: 'percentage', percentage: 50, minCharge: 10, maxCharge: 30 };
        cardMax.zoneRules[0].slabs = [{ minKg: 0, maxKg: 1, charge: 100 }];

        const maxResult = service.calculatePricing(createInput({ serviceRateCard: cardMax }));
        expect(maxResult.rtoCharge).toBe(30);
        expect(maxResult.breakdown.rto.calculationMode).toBe('percentage');
    });

    it('excludes RTO from taxable total when SERVICE_LEVEL_RTO_PRICING_ENABLED is false', () => {
        process.env.SERVICE_LEVEL_RTO_PRICING_ENABLED = 'false';

        const card = createBaseCard();
        card.zoneRules[0].rtoRule = { type: 'flat', amount: 20 };
        card.zoneRules[0].fuelSurcharge = { percentage: 0, base: 'freight' };
        delete card.zoneRules[0].codRule;
        card.zoneRules[0].slabs = [{ minKg: 0, maxKg: 1, charge: 100 }];

        const result = service.calculatePricing(createInput({ serviceRateCard: card, paymentMode: 'prepaid' }));

        expect(result.rtoCharge).toBe(20);
        expect(result.breakdown.rto.includedInQuoteTotal).toBe(false);
        expect(result.breakdown.gst.taxableAmount).toBe(100);
        expect(result.totalAmount).toBe(118);
    });

    it('calculates GST as intra-state and inter-state correctly', () => {
        const intraResult = service.calculatePricing(createInput({ fromPincode: '560001', toPincode: '560002' }));
        expect(intraResult.gstBreakdown.cgst).toBeGreaterThan(0);
        expect(intraResult.gstBreakdown.sgst).toBeGreaterThan(0);
        expect(intraResult.gstBreakdown.igst).toBe(0);

        const interResult = service.calculatePricing(createInput({ fromPincode: '560001', toPincode: '110001' }));
        expect(interResult.gstBreakdown.cgst).toBe(0);
        expect(interResult.gstBreakdown.sgst).toBe(0);
        expect(interResult.gstBreakdown.igst).toBeGreaterThan(0);
    });

    it('applies provider default dim divisor when card dimDivisor is absent', () => {
        const card = createBaseCard();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (card.calculation as any).dimDivisor;

        const resultEkart = service.calculatePricing(
            createInput({
                serviceRateCard: card,
                provider: 'ekart',
                weight: 1,
                dimensions: { length: 95, width: 95, height: 95 },
            })
        );
        const expectedVolWeight = Math.round(((95 * 95 * 95) / 4750) * 1000) / 1000;
        expect(resultEkart.breakdown.weight.dimDivisorUsed).toBe(4750);
        expect(resultEkart.breakdown.weight.volumetricWeight).toBe(expectedVolWeight);
    });

    it('throws validation errors for invalid inputs and unresolved configuration', () => {
        expect(() => service.calculatePricing(createInput({ weight: 0 }))).toThrow(AppError);
        expect(() => service.calculatePricing(createInput({ dimensions: { length: 0, width: 1, height: 1 } }))).toThrow(
            AppError
        );
        expect(() => service.calculatePricing(createInput({ fromPincode: '000111' }))).toThrow(AppError);

        const noSlabCard = createBaseCard();
        noSlabCard.zoneRules[0].slabs = [];
        expect(() => service.calculatePricing(createInput({ serviceRateCard: noSlabCard }))).toThrow(AppError);

        pincodeLookup.getZoneFromPincodes.mockReturnValueOnce({ zone: '' });
        expect(() => service.calculatePricing(createInput({ zone: 'unknown' }))).toThrow(AppError);

        pincodeLookup.getPincodeDetails.mockReturnValueOnce({ state: 'UNKNOWN_STATE' });
        expect(() => service.calculatePricing(createInput())).toThrow(AppError);
    });

    it('rounds money values to 2 decimals consistently', () => {
        const card = createBaseCard();
        card.zoneRules[0].slabs = [{ minKg: 0, maxKg: 1, charge: 99.999 }];
        card.zoneRules[0].fuelSurcharge = { percentage: 12.5, base: 'freight' };
        card.zoneRules[0].codRule = { type: 'percentage', percentage: 1.25 };

        const result = service.calculatePricing(
            createInput({ serviceRateCard: card, paymentMode: 'cod', orderValue: 1234.56 })
        );
        expect(result.totalAmount).toBeCloseTo(Number(result.totalAmount.toFixed(2)), 2);
        expect(result.subtotal).toBeCloseTo(Number(result.subtotal.toFixed(2)), 2);
        expect(result.codCharge).toBeCloseTo(Number(result.codCharge.toFixed(2)), 2);
        expect(result.fuelCharge).toBeCloseTo(Number(result.fuelCharge.toFixed(2)), 2);
    });
});
