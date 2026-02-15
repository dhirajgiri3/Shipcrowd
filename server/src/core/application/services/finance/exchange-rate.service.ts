import axios from 'axios';
import CacheService from '../../../../infrastructure/utilities/cache.service';
import {
    OPERATIONAL_CURRENCY,
    STATIC_INR_FALLBACK_RATES,
    SUPPORTED_CURRENCIES,
} from '../../../../shared/constants/currency.constants';
import logger from '../../../../shared/logger/winston.logger';

interface OrderTotalsInput {
    subtotal: number;
    tax: number;
    shipping: number;
    discount: number;
    total: number;
}

export interface OperationalTotalsPatch {
    baseCurrencySubtotal?: number;
    baseCurrencyTax?: number;
    baseCurrencyShipping?: number;
    baseCurrencyTotal?: number;
    baseCurrency?: string;
    exchangeRate?: number;
    exchangeRateDate?: Date;
}

const EXCHANGE_RATE_TTL_SECONDS = 4 * 60 * 60;
const LAST_KNOWN_RATE_TTL_SECONDS = 30 * 24 * 60 * 60;
const FALLBACK_RATE_DATE = new Date('2026-01-01T00:00:00.000Z');

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

const normalizeCurrency = (currency?: string): string => String(currency || OPERATIONAL_CURRENCY).trim().toUpperCase();

const isSupportedCurrency = (currency: string): boolean => {
    return (SUPPORTED_CURRENCIES as readonly string[]).includes(currency);
};

export default class ExchangeRateService {
    private static latestRateKey(fromCurrency: string, toCurrency: string): string {
        return `fx:latest:${fromCurrency}:${toCurrency}`;
    }

    private static lastKnownRateKey(fromCurrency: string, toCurrency: string): string {
        return `fx:last-known:${fromCurrency}:${toCurrency}`;
    }

    private static fallbackRateFor(fromCurrency: string, toCurrency: string): number | null {
        if (toCurrency !== OPERATIONAL_CURRENCY) return null;
        return STATIC_INR_FALLBACK_RATES[fromCurrency] ?? null;
    }

    private static async fetchLiveRate(fromCurrency: string, toCurrency: string): Promise<number> {
        const baseUrl = process.env.EXCHANGE_RATE_API_URL || 'https://open.er-api.com/v6/latest';
        const endpoint = `${baseUrl}/${fromCurrency}`;
        const response = await axios.get(endpoint, { timeout: 6000 });
        const rates = response.data?.rates as Record<string, number> | undefined;
        const rate = rates?.[toCurrency];

        if (!Number.isFinite(Number(rate)) || Number(rate) <= 0) {
            throw new Error(`Invalid FX rate payload for ${fromCurrency}/${toCurrency}`);
        }

        return Number(rate);
    }

    static async getRate(fromCurrencyRaw: string, toCurrencyRaw: string): Promise<{ rate: number; rateDate: Date; source: string }> {
        const fromCurrency = normalizeCurrency(fromCurrencyRaw);
        const toCurrency = normalizeCurrency(toCurrencyRaw);

        if (fromCurrency === toCurrency) {
            return { rate: 1, rateDate: new Date(), source: 'identity' };
        }

        if (!isSupportedCurrency(fromCurrency) || !isSupportedCurrency(toCurrency)) {
            throw new Error(`Unsupported currency pair ${fromCurrency}/${toCurrency}`);
        }

        const latestKey = this.latestRateKey(fromCurrency, toCurrency);
        const lastKnownKey = this.lastKnownRateKey(fromCurrency, toCurrency);

        const cachedLatest = await CacheService.get<{ rate: number; rateDate: string }>(latestKey);
        if (cachedLatest && Number.isFinite(Number(cachedLatest.rate)) && Number(cachedLatest.rate) > 0) {
            return {
                rate: Number(cachedLatest.rate),
                rateDate: new Date(cachedLatest.rateDate || new Date().toISOString()),
                source: 'cache',
            };
        }

        try {
            const liveRate = await this.fetchLiveRate(fromCurrency, toCurrency);
            const payload = { rate: liveRate, rateDate: new Date().toISOString() };
            await CacheService.set(latestKey, payload, EXCHANGE_RATE_TTL_SECONDS);
            await CacheService.set(lastKnownKey, payload, LAST_KNOWN_RATE_TTL_SECONDS);

            return {
                rate: liveRate,
                rateDate: new Date(payload.rateDate),
                source: 'live',
            };
        } catch (error: any) {
            logger.warn('Live exchange-rate fetch failed, attempting fallback', {
                fromCurrency,
                toCurrency,
                error: error?.message,
            });
        }

        const lastKnown = await CacheService.get<{ rate: number; rateDate: string }>(lastKnownKey);
        if (lastKnown && Number.isFinite(Number(lastKnown.rate)) && Number(lastKnown.rate) > 0) {
            return {
                rate: Number(lastKnown.rate),
                rateDate: new Date(lastKnown.rateDate || new Date().toISOString()),
                source: 'last-known',
            };
        }

        const staticFallback = this.fallbackRateFor(fromCurrency, toCurrency);
        if (staticFallback) {
            return {
                rate: staticFallback,
                rateDate: FALLBACK_RATE_DATE,
                source: 'static-fallback',
            };
        }

        throw new Error(`Unable to resolve exchange rate for ${fromCurrency}/${toCurrency}`);
    }

    static async buildOperationalTotalsPatch(
        totals: OrderTotalsInput,
        sourceCurrencyRaw?: string
    ): Promise<OperationalTotalsPatch> {
        const sourceCurrency = normalizeCurrency(sourceCurrencyRaw);

        if (sourceCurrency === OPERATIONAL_CURRENCY) {
            return {};
        }

        const { rate, rateDate, source } = await this.getRate(sourceCurrency, OPERATIONAL_CURRENCY);
        const patch: OperationalTotalsPatch = {
            baseCurrencySubtotal: round2(Number(totals.subtotal || 0) * rate),
            baseCurrencyTax: round2(Number(totals.tax || 0) * rate),
            baseCurrencyShipping: round2(Number(totals.shipping || 0) * rate),
            baseCurrencyTotal: round2(Number(totals.total || 0) * rate),
            baseCurrency: OPERATIONAL_CURRENCY,
            exchangeRate: rate,
            exchangeRateDate: rateDate,
        };

        logger.debug('Applied order totals conversion to operational currency', {
            sourceCurrency,
            operationalCurrency: OPERATIONAL_CURRENCY,
            rate,
            source,
        });

        return patch;
    }
}
