import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../http';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';

export interface RateCard {
    _id: string;
    name: string;
    companyId: string;
    status: 'draft' | 'active' | 'inactive' | 'expired';
    zonePricing?: {
        zoneA?: { baseWeight: number; basePrice: number; additionalPricePerKg: number };
        zoneB?: { baseWeight: number; basePrice: number; additionalPricePerKg: number };
        zoneC?: { baseWeight: number; basePrice: number; additionalPricePerKg: number };
        zoneD?: { baseWeight: number; basePrice: number; additionalPricePerKg: number };
        zoneE?: { baseWeight: number; basePrice: number; additionalPricePerKg: number };
    };
    minimumFare?: number;
    minimumFareCalculatedOn?: 'freight' | 'freight_overhead';
    codPercentage?: number;
    codMinimumCharge?: number;
    zoneBType?: 'state' | 'distance';
    shipmentType?: 'forward' | 'reverse';
    rateCardCategory?: string;
    createdAt: string;
    updatedAt: string;
    // V2 Fields
    version?: string;
    fuelSurcharge?: number;
    fuelSurchargeBase?: 'freight' | 'freight_cod';
    isLocked?: boolean;
    codSurcharges?: any[];
}

import { RateCalculationPayload } from '../../clients/shipping/ratesApi';

import { PricingResolution } from '../../clients/shipping/ratesApi';

export interface RateCalculationResponse {
    rate: number;
    carrier: string;
    zone: string;
    breakdown: {
        baseRate: number;
        weightCharge: number;
        zoneCharge: number;
        total: number;
        resolution?: PricingResolution;
    };
}

/**
 * Fetch all rate cards
 */
export const useRateCards = (options?: UseQueryOptions<RateCard[], ApiError>) => {
    return useQuery<RateCard[], ApiError>({
        queryKey: queryKeys.rateCards.all(),
        queryFn: async () => {
            const response = await apiClient.get('/ratecards');
            return response.data.data;
        },
        ...CACHE_TIMES.LONG,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Fetch single rate card
 */
export const useRateCard = (rateCardId: string, options?: UseQueryOptions<RateCard, ApiError>) => {
    return useQuery<RateCard, ApiError>({
        queryKey: queryKeys.rateCards.detail(rateCardId),
        queryFn: async () => {
            const response = await apiClient.get(`/ratecards/${rateCardId}`);
            return response.data.data.rateCard;
        },
        enabled: !!rateCardId,
        ...CACHE_TIMES.LONG,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Calculate shipping rate
 */
export const useCalculateRate = (payload: RateCalculationPayload, options?: UseQueryOptions<RateCalculationResponse, ApiError>) => {
    return useQuery<RateCalculationResponse, ApiError>({
        queryKey: queryKeys.rateCards.calculate(payload as any),
        queryFn: async () => {
            const response = await apiClient.post('/ratecards/calculate', payload);
            return response.data.data;
        },
        enabled: !!(payload.weight && payload.destinationPincode),
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

// Note: create/update/delete/clone are admin-only. Use admin hooks for management actions.
