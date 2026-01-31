import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../http';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';

export interface RateCard {
    _id: string;
    name: string;
    companyId: string;
    status: 'draft' | 'active' | 'inactive' | 'expired';
    baseRates: Array<{
        carrier?: string;
        serviceType?: string;
        baseRate: number;
        minWeight: number;
        maxWeight: number;
    }>;
    weightRules: Array<{
        minWeight: number;
        maxWeight: number;
        ratePerKg: number;
        carrier?: string;
        serviceType?: string;
    }>;
    zoneRules: Array<{
        zoneId?: string; // Changed from zone string to zoneId often used
        zone?: string;
        multiplier?: number;
        additionalPrice?: number;
        carrier?: string;
        serviceType?: string;
    }>;
    createdAt: string;
    updatedAt: string;
    // V2 Fields
    version?: string;
    fuelSurcharge?: number;
    fuelSurchargeBase?: 'freight' | 'total';
    minimumCall?: number;
    isLocked?: boolean;
    codSurcharges?: any[];
}

export interface RateCalculationPayload {
    weight: number;
    destinationPincode: string;
    originPincode?: string;
    carrier?: string;
    serviceType?: string;
    strict?: boolean;
}

export interface PricingResolution {
    matchedLevel: 'EXACT' | 'CARRIER_DEFAULT' | 'GENERIC';
    matchedCarrier?: string;
    matchedServiceType?: string;
    rateCardId?: string;
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
        queryKey: queryKeys.rateCards.calculate(payload as any),
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

/**
 * Clone a rate card
 */
export const useCloneRateCard = (options?: UseMutationOptions<RateCard, ApiError, string>) => {
    const queryClient = useQueryClient();
    return useMutation<RateCard, ApiError, string>({
        mutationFn: async (rateCardId) => {
            const response = await apiClient.post(`/ratecards/${rateCardId}/clone`);
            return response.data.rateCard;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.rateCards.all() });
        },
        ...options
    });
};

/**
 * Delete a rate card
 */
export const useDeleteRateCard = (options?: UseMutationOptions<{ id: string }, ApiError, string>) => {
    const queryClient = useQueryClient();
    return useMutation<{ id: string }, ApiError, string>({
        mutationFn: async (rateCardId) => {
            const response = await apiClient.delete(`/ratecards/${rateCardId}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.rateCards.all() });
        },
        ...options
    });
};
