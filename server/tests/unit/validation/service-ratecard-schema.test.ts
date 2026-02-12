import { upsertServiceRateCardSchema } from '@/shared/validation/schemas';

describe('upsertServiceRateCardSchema codRule validation', () => {
    it('keeps slab codRule payload with slabs in validated output', () => {
        const parsed = upsertServiceRateCardSchema.parse({
            serviceId: 'service-1',
            cardType: 'sell',
            zoneRules: [
                {
                    zoneKey: 'zoneA',
                    slabs: [{ minKg: 0, maxKg: 0.5, charge: 50 }],
                    codRule: {
                        type: 'slab',
                        basis: 'orderValue',
                        slabs: [
                            { min: 0, max: 1000, value: 30, type: 'flat' },
                            { min: 1000, max: 5000, value: 2, type: 'percentage' },
                        ],
                    },
                },
            ],
        });

        expect(parsed.zoneRules[0].codRule).toMatchObject({
            type: 'slab',
            basis: 'orderValue',
        });
        if (!parsed.zoneRules[0].codRule || parsed.zoneRules[0].codRule.type !== 'slab') {
            throw new Error('Expected slab codRule to be present');
        }
        expect(parsed.zoneRules[0].codRule.slabs).toHaveLength(2);
    });

    it('rejects mixed codRule fields across discriminated variants', () => {
        expect(() =>
            upsertServiceRateCardSchema.parse({
                serviceId: 'service-1',
                cardType: 'sell',
                zoneRules: [
                    {
                        zoneKey: 'zoneA',
                        slabs: [{ minKg: 0, maxKg: 0.5, charge: 50 }],
                        codRule: {
                            type: 'slab',
                            slabs: [{ min: 0, max: 1000, value: 30, type: 'flat' }],
                            percentage: 2,
                        },
                    },
                ],
            })
        ).toThrow();
    });

    it('maps flat codRule amount to minCharge for runtime compatibility', () => {
        const parsed = upsertServiceRateCardSchema.parse({
            serviceId: 'service-1',
            cardType: 'sell',
            zoneRules: [
                {
                    zoneKey: 'zoneA',
                    slabs: [{ minKg: 0, maxKg: 0.5, charge: 50 }],
                    codRule: {
                        type: 'flat',
                        amount: 40,
                    },
                },
            ],
        });

        expect(parsed.zoneRules[0].codRule).toMatchObject({
            type: 'flat',
            minCharge: 40,
        });
    });
});

describe('upsertServiceRateCardSchema rtoRule validation', () => {
    it('maps legacy rtoRule payload without type to percentage variant', () => {
        const parsed = upsertServiceRateCardSchema.parse({
            serviceId: 'service-1',
            cardType: 'sell',
            zoneRules: [
                {
                    zoneKey: 'zoneA',
                    slabs: [{ minKg: 0, maxKg: 0.5, charge: 50 }],
                    rtoRule: {
                        percentage: 55,
                        minCharge: 30,
                        maxCharge: 120,
                    },
                },
            ],
        });

        expect(parsed.zoneRules[0].rtoRule).toMatchObject({
            type: 'percentage',
            percentage: 55,
            minCharge: 30,
            maxCharge: 120,
        });
    });

    it('rejects mixed rtoRule fields across discriminated variants', () => {
        expect(() =>
            upsertServiceRateCardSchema.parse({
                serviceId: 'service-1',
                cardType: 'sell',
                zoneRules: [
                    {
                        zoneKey: 'zoneA',
                        slabs: [{ minKg: 0, maxKg: 0.5, charge: 50 }],
                        rtoRule: {
                            type: 'flat',
                            amount: 50,
                            percentage: 10,
                        },
                    },
                ],
            })
        ).toThrow();
    });
});
