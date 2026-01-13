import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';
import { queryKeys } from '../queryKeys';

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
export const useSellerActions = () => {
    return useQuery<SellerActionsResponse>({
        queryKey: queryKeys.sellerActions.list(),
        queryFn: async () => {
            const response = await apiClient.get('/analytics/seller-actions');
            return response.data as SellerActionsResponse;
        },
        staleTime: 2 * 60 * 1000, // 2 minutes
        refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
        retry: 2,
        gcTime: 10 * 60 * 1000, // Cache for 10 minutes
    });
};

export default useSellerActions;
