import { useQuery } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../http';
import { queryKeys } from '../../config/query-keys';

// Using default cache config/retry if not exported, or just hardcoding for now since I can't confirm exports
const STALE_TIME = 1000 * 60 * 5; // 5 minutes

export interface RTOTrackResult {
    orderNumber: string | null;
    forwardAwb: string | null;
    reverseAwb: string | null;
    status: string;
    statusLabel: string;
    initiatedAt: string;
    expectedReturnDate: string | null;
    reverseTracking: {
        reverseAwb?: string;
        originalAwb?: string;
        status?: string;
        currentLocation?: string;
        trackingHistory?: Array<{ timestamp?: string; status?: string; location?: string }>;
        estimatedDelivery?: string;
        message?: string;
    } | null;
    refundStatus: string;
}

export function useRTOTracking() {
    const useTrackByAWB = (awb: string, enabled: boolean = true) => {
        return useQuery<RTOTrackResult, ApiError>({
            queryKey: queryKeys.tracking.rtoByAwb(awb),
            queryFn: async () => {
                const res = await apiClient.get<{ success: boolean; data: RTOTrackResult }>(
                    '/public/rto/track',
                    { params: { awb } }
                );
                return res.data.data;
            },
            enabled: enabled && !!awb.trim(),
            staleTime: STALE_TIME,
            retry: 1,
        });
    };

    const useTrackByOrder = (orderNumber: string, phone: string, enabled: boolean = true) => {
        return useQuery<RTOTrackResult, ApiError>({
            queryKey: queryKeys.tracking.rtoByOrder(orderNumber, phone),
            queryFn: async () => {
                const res = await apiClient.get<{ success: boolean; data: RTOTrackResult }>(
                    '/public/rto/track',
                    { params: { orderNumber, phone } }
                );
                return res.data.data;
            },
            enabled: enabled && !!orderNumber.trim() && !!phone.trim(),
            staleTime: STALE_TIME,
            retry: 1,
        });
    };

    return { useTrackByAWB, useTrackByOrder };
}
