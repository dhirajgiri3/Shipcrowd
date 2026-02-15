const OPERATIONAL_CURRENCY = 'INR';

type OrderTotalKey = 'subtotal' | 'tax' | 'shipping' | 'discount' | 'total';

type BaseCurrencyOrderTotalKey =
    | 'baseCurrencySubtotal'
    | 'baseCurrencyTax'
    | 'baseCurrencyShipping'
    | 'baseCurrencyTotal';

interface CurrencyAwareTotals {
    subtotal?: number;
    tax?: number;
    shipping?: number;
    discount?: number;
    total?: number;
    baseCurrencySubtotal?: number;
    baseCurrencyTax?: number;
    baseCurrencyShipping?: number;
    baseCurrencyTotal?: number;
    baseCurrency?: string;
}

interface CurrencyAwareOrderLike {
    currency?: string;
    totals?: CurrencyAwareTotals;
}

const BASE_FIELD_BY_KEY: Record<Exclude<OrderTotalKey, 'discount'>, BaseCurrencyOrderTotalKey> = {
    subtotal: 'baseCurrencySubtotal',
    tax: 'baseCurrencyTax',
    shipping: 'baseCurrencyShipping',
    total: 'baseCurrencyTotal',
};

const toNumberOrZero = (value: unknown): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

export const getOperationalOrderAmount = (
    order: CurrencyAwareOrderLike | null | undefined,
    field: OrderTotalKey = 'total'
): number => {
    if (!order?.totals) return 0;

    const orderCurrency = String(order.currency || OPERATIONAL_CURRENCY).toUpperCase();
    const baseCurrency = String(order.totals.baseCurrency || OPERATIONAL_CURRENCY).toUpperCase();

    if (field !== 'discount') {
        const baseField = BASE_FIELD_BY_KEY[field];
        const baseAmount = order.totals[baseField];
        if (
            orderCurrency !== OPERATIONAL_CURRENCY &&
            baseCurrency === OPERATIONAL_CURRENCY &&
            Number.isFinite(Number(baseAmount))
        ) {
            return toNumberOrZero(baseAmount);
        }
    }

    return toNumberOrZero(order.totals[field]);
};

export const shouldPersistOperationalBaseTotals = (
    order: CurrencyAwareOrderLike | null | undefined
): boolean => {
    if (!order?.totals) return false;

    const orderCurrency = String(order.currency || OPERATIONAL_CURRENCY).toUpperCase();
    if (orderCurrency === OPERATIONAL_CURRENCY) return true;

    return Number.isFinite(Number(order.totals.baseCurrencyTotal));
};

export const operationalOrderTotalExpression = {
    $ifNull: ['$totals.baseCurrencyTotal', '$totals.total'],
};

