/**
 * Seller Rates Hooks
 * Hooks for rate calculation and serviceability checks
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { orderApi } from '@/src/core/api/clients/orders/orderApi';
import { queryKeys } from '../../config/query-keys';
import { QUERY_CONFIG } from '../../config/query-client';
import { apiClient } from '../../http';
import type { CourierRate } from '@/src/types/domain/order';

export interface RateCalculationPayload {
    originPincode: string;
    destinationPincode: string;
    weight: number;
    length?: number;
    width?: number;
    height?: number;
    paymentMode?: 'prepaid' | 'cod';
    orderValue?: number;
    isB2B?: boolean;
    quantity?: number;
    strict?: boolean;
}

/**
 * Hook to calculate shipping rates (B2C/B2B/Multi-carrier)
 */
export const useCalculateRates = () => {
    return useMutation({
        mutationFn: async (payload: RateCalculationPayload): Promise<{ success: boolean; data: CourierRate[] }> => {
            return orderApi.getCourierRates({
                fromPincode: payload.originPincode,
                toPincode: payload.destinationPincode,
                weight: payload.weight,
                paymentMode: payload.paymentMode,
                orderValue: payload.orderValue,
                length: payload.length,
                width: payload.width,
                height: payload.height,
            });
        },
    });
};

/**
 * Hook to check serviceability of a pincode
 */
export const useServiceability = (pincode: string | null) => {
    return useQuery({
        queryKey: queryKeys.address.serviceability(pincode || ''),
        queryFn: async () => {
            const response = await apiClient.get(`/serviceability/pincode/${pincode}/info`);
            return response.data?.data;
        },
        enabled: !!pincode && pincode.length === 6,
        staleTime: QUERY_CONFIG.staleTime.static, // Pincode serviceability rarely changes
    });
};
