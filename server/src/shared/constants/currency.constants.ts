export const SUPPORTED_CURRENCIES = [
    'INR',
    'USD',
    'EUR',
    'GBP',
    'AUD',
    'CAD',
    'SGD',
    'AED',
    'JPY',
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: SupportedCurrency = 'INR';
export const OPERATIONAL_CURRENCY: SupportedCurrency = 'INR';

export const STATIC_INR_FALLBACK_RATES: Record<string, number> = {
    USD: 83.5,
    EUR: 91.0,
    GBP: 106.0,
    AUD: 55.0,
    CAD: 61.0,
    SGD: 62.0,
    AED: 22.7,
    JPY: 0.56,
};

