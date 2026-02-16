import {
    getOperationalOrderAmount,
    shouldPersistOperationalBaseTotals,
    validateOperationalBaseTotals,
} from '../../../../src/shared/utils/order-currency.util';

describe('order-currency util', () => {
    it('returns INR totals for INR orders', () => {
        const order = {
            currency: 'INR',
            totals: {
                subtotal: 1000,
                tax: 180,
                shipping: 60,
                discount: 40,
                total: 1200,
            },
        };

        expect(getOperationalOrderAmount(order, 'total')).toBe(1200);
        expect(getOperationalOrderAmount(order, 'discount')).toBe(40);
        expect(validateOperationalBaseTotals(order).isValid).toBe(true);
        expect(shouldPersistOperationalBaseTotals(order)).toBe(true);
    });

    it('uses base INR totals for non-INR orders', () => {
        const order = {
            currency: 'USD',
            totals: {
                subtotal: 100,
                tax: 5,
                shipping: 0,
                discount: 0,
                total: 105,
                baseCurrency: 'INR',
                baseCurrencySubtotal: 8300,
                baseCurrencyTax: 415,
                baseCurrencyShipping: 0,
                baseCurrencyTotal: 8715,
            },
        };

        expect(getOperationalOrderAmount(order, 'subtotal')).toBe(8300);
        expect(getOperationalOrderAmount(order, 'tax')).toBe(415);
        expect(getOperationalOrderAmount(order, 'total')).toBe(8715);
        expect(getOperationalOrderAmount(order, 'discount')).toBe(0);
        expect(validateOperationalBaseTotals(order).isValid).toBe(true);
        expect(shouldPersistOperationalBaseTotals(order)).toBe(true);
    });

    it('infers operational discount from base totals for non-INR orders', () => {
        const order = {
            currency: 'EUR',
            totals: {
                subtotal: 100,
                tax: 20,
                shipping: 10,
                discount: 5, // source-currency value should not be used
                total: 110,
                baseCurrency: 'INR',
                baseCurrencySubtotal: 9000,
                baseCurrencyTax: 1800,
                baseCurrencyShipping: 900,
                baseCurrencyTotal: 9900, // inferred discount = 1800
            },
        };

        expect(getOperationalOrderAmount(order, 'discount')).toBe(1800);
    });

    it('invalidates non-INR orders when base INR totals are missing', () => {
        const order = {
            currency: 'USD',
            totals: {
                subtotal: 100,
                tax: 5,
                shipping: 0,
                discount: 0,
                total: 105,
            },
        };

        const validation = validateOperationalBaseTotals(order);
        expect(validation.isValid).toBe(false);
        expect(validation.reason).toContain('Base currency');
        expect(shouldPersistOperationalBaseTotals(order)).toBe(false);
    });
});
