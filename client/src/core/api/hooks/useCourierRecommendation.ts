/**
 * Courier Recommendation Hooks
 * Hooks for AI-powered courier recommendations
 */

import { useQuery } from '@tanstack/react-query';
import {
    courierRecommendationApi,
    CourierRecommendationRequest
} from '@/src/core/api/clients/shipping/courierRecommendationApi';
import { RETRY_CONFIG } from '../config/cache.config';
import { ApiError } from '../http';

/**
 * Hook to get courier recommendations
 * Automatically fetches when all required params are provided
 */
export const useCourierRecommendations = (
    request: CourierRecommendationRequest | null,
    options?: { enabled?: boolean }
) => {
    return useQuery({
        queryKey: ['courier', 'recommendations', request],
        queryFn: () => {
            if (!request) throw new Error('Request parameters required');
            return courierRecommendationApi.getRecommendations(request);
        },
        enabled: options?.enabled !== false && !!request?.pickupPincode && !!request?.deliveryPincode && !!request?.weight,
        staleTime: 300000, // 5 minutes - recommendations don't change frequently
        retry: RETRY_CONFIG.DEFAULT,
    });
};

/**
 * Hook to check courier serviceability
 */
export const useCourierServiceability = (
    pickupPincode: string,
    deliveryPincode: string,
    options?: { enabled?: boolean }
) => {
    return useQuery({
        queryKey: ['courier', 'serviceability', pickupPincode, deliveryPincode],
        queryFn: () => courierRecommendationApi.checkServiceability(pickupPincode, deliveryPincode),
        enabled: options?.enabled !== false && !!pickupPincode && !!deliveryPincode,
        staleTime: 600000, // 10 minutes - serviceability is relatively stable
        retry: RETRY_CONFIG.DEFAULT,
    });
};
