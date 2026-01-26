import { useQuery } from '@tanstack/react-query';
import { UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from '../../client';
import { ApiError } from '../../client';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { queryKeys } from '../../config/query-keys';
import { handleApiError, showSuccessToast } from '@/src/lib/error';

export interface SellerAction {
    id: string;
    type: 'orders_ready' | 'ndr_pending' | 'low_wallet' | 'kyc_pending' | 'weight_dispute';
    priority: 'critical' | 'high' | 'medium';
    title: string;
    description: string;
    count?: number;
    actionLabel: string;
    actionUrl: string;
    dismissable: boolean;
}

export interface SellerActionsResponse {
    totalActions: number;
    items: SellerAction[];
}

/**
 * Hook to fetch seller actionable items
 * Returns prioritized actions for the seller to take on the dashboard
 */
export const useSellerActions = (options?: UseQueryOptions<SellerActionsResponse, ApiError>) => {
    return useQuery<SellerActionsResponse, ApiError>({
        queryKey: queryKeys.sellerActions.list(),
        queryFn: async () => {
            try {
                const response = await apiClient.get('/analytics/seller-actions');
                return response.data as SellerActionsResponse;
            } catch (error: any) {
                // If no company (onboarding not complete), return empty data
                if (error?.code === 'AUTH_REQUIRED' || error?.message?.includes('not associated with any company')) {
                    return { totalActions: 0, items: [] };
                }
                throw error;
            }
        },
        ...CACHE_TIMES.SHORT,
        refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

export default useSellerActions;
