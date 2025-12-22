import { apiClient, ApiError } from '../lib/api/client';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';

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
        queryKey: ['ratecards'],
        queryFn: async () => {
            const response = await apiClient.get('/ratecards');
            return response.data.rateCards;
        },
        staleTime: 600000, // 10 minutes
        ...options,
    });
};

/**
 * Fetch single rate card
 */
export const useRateCard = (rateCardId: string, options?: UseQueryOptions<RateCard, ApiError>) => {
    return useQuery<RateCard, ApiError>({
        queryKey: ['ratecards', rateCardId],
        queryFn: async () => {
            const response = await apiClient.get(`/ratecards/${rateCardId}`);
            return response.data.rateCard;
        },
        enabled: !!rateCardId,
        staleTime: 600000,
        ...options,
    });
};

/**
 * Calculate shipping rate
 */
export const useCalculateRate = (payload: RateCalculationPayload, options?: UseQueryOptions<RateCalculationResponse, ApiError>) => {
    return useQuery<RateCalculationResponse, ApiError>({
        queryKey: ['ratecards', 'calculate', payload],
        queryFn: async () => {
            const response = await apiClient.post('/ratecards/calculate', payload);
            return response.data;
        },
        enabled: !!(payload.weight && payload.destinationPincode),
        staleTime: 300000, // 5 minutes
        ...options,
    });
};
