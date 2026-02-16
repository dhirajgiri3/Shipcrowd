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

interface OperationalTotalsValidationResult {
    isValid: boolean;
    reason?: string;
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

    // Discount does not have a dedicated base field in the schema yet.
    // For non-INR orders with INR base totals, infer the operational discount.
    if (field === 'discount' && orderCurrency !== OPERATIONAL_CURRENCY) {
        const hasOperationalBase =
            baseCurrency === OPERATIONAL_CURRENCY &&
            Number.isFinite(Number(order.totals.baseCurrencySubtotal)) &&
            Number.isFinite(Number(order.totals.baseCurrencyTax)) &&
            Number.isFinite(Number(order.totals.baseCurrencyTotal));

        if (hasOperationalBase) {
            const baseSubtotal = toNumberOrZero(order.totals.baseCurrencySubtotal);
            const baseTax = toNumberOrZero(order.totals.baseCurrencyTax);
            const baseShipping = toNumberOrZero(order.totals.baseCurrencyShipping);
            const baseTotal = toNumberOrZero(order.totals.baseCurrencyTotal);
            return Math.max(0, baseSubtotal + baseTax + baseShipping - baseTotal);
        }
    }

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

export const validateOperationalBaseTotals = (
    order: CurrencyAwareOrderLike | null | undefined
): OperationalTotalsValidationResult => {
    if (!order?.totals) {
        return { isValid: false, reason: 'Order totals are missing' };
    }

    const orderCurrency = String(order.currency || OPERATIONAL_CURRENCY).toUpperCase();
    if (orderCurrency === OPERATIONAL_CURRENCY) {
        return { isValid: true };
    }

    const baseCurrency = String(order.totals.baseCurrency || '').toUpperCase();
    if (baseCurrency !== OPERATIONAL_CURRENCY) {
        return {
            isValid: false,
            reason: `Base currency must be ${OPERATIONAL_CURRENCY} for non-${OPERATIONAL_CURRENCY} orders`,
        };
    }

    if (!Number.isFinite(Number(order.totals.baseCurrencySubtotal))) {
        return { isValid: false, reason: 'Base currency subtotal is missing' };
    }

    if (!Number.isFinite(Number(order.totals.baseCurrencyTax))) {
        return { isValid: false, reason: 'Base currency tax is missing' };
    }

    if (!Number.isFinite(Number(order.totals.baseCurrencyTotal))) {
        return { isValid: false, reason: 'Base currency total is missing' };
    }

    return { isValid: true };
};

export const shouldPersistOperationalBaseTotals = (
    order: CurrencyAwareOrderLike | null | undefined
): boolean => {
    if (!order?.totals) return false;

    const orderCurrency = String(order.currency || OPERATIONAL_CURRENCY).toUpperCase();
    if (orderCurrency === OPERATIONAL_CURRENCY) return true;

    return validateOperationalBaseTotals(order).isValid;
};

export const operationalOrderTotalExpression = {
    $ifNull: ['$totals.baseCurrencyTotal', '$totals.total'],
};
