import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../client';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';

export interface RateCard {
    _id: string;
    name: string;
    companyId: string;
    status: 'draft' | 'active' | 'inactive' | 'expired';
    baseRates: Array<{
        carrier: string;
        serviceType: string;
        baseRate: number;
    }>;
    weightRules: Array<{
        minWeight: number;
        maxWeight: number;
        ratePerKg: number;
    }>;
    zoneRules: Array<{
        zone: string;
        multiplier: number;
    }>;
    createdAt: string;
    updatedAt: string;
}

export interface RateCalculationPayload {
    weight: number;
    destinationPincode: string;
    carrier?: string;
    serviceType?: string;
}

export interface RateCalculationResponse {
    rate: number;
    carrier: string;
    zone: string;
    breakdown: {
        baseRate: number;
        weightCharge: number;
        zoneCharge: number;
        total: number;
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
            return response.data.rateCards;
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
            return response.data.rateCard;
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
        queryKey: queryKeys.rateCards.calculate(payload),
        queryFn: async () => {
            const response = await apiClient.post('/ratecards/calculate', payload);
            return response.data;
        },
        enabled: !!(payload.weight && payload.destinationPincode),
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};
