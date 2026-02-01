/**
 * Seller Rates Hooks
 * Hooks for rate calculation and serviceability checks
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { ratesApi, RateCalculationPayload, RateResponse } from '../../clients/ratesApi';
import { queryKeys } from '../../config/query-keys';
import { QUERY_CONFIG } from '../../config/query-client';

/**
 * Hook to calculate shipping rates (B2C/B2B/Multi-carrier)
 */
export const useCalculateRates = () => {
    return useMutation({
        mutationFn: (payload: RateCalculationPayload) => ratesApi.calculateRates(payload),
    });
};

/**
 * Hook to check serviceability of a pincode
 */
export const useServiceability = (pincode: string | null) => {
    return useQuery({
        queryKey: queryKeys.address.serviceability(pincode || ''),
        queryFn: () => ratesApi.checkServiceability(pincode!),
        enabled: !!pincode && pincode.length === 6,
        staleTime: QUERY_CONFIG.staleTime.static, // Pincode serviceability rarely changes
    });
};
