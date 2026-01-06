import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';

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

// Mock data for development and testing
const mockSellerActions: SellerActionsResponse = {
    totalActions: 4,
    items: [
        {
            id: 'ndr-pending',
            type: 'ndr_pending',
            priority: 'critical',
            title: '3 NDR Cases Pending',
            description: 'Resolve failed deliveries urgently to avoid RTO charges',
            count: 3,
            actionLabel: 'Review & Respond',
            actionUrl: '/seller/ndr',
            dismissable: false,
        },
        {
            id: 'orders-ready',
            type: 'orders_ready',
            priority: 'high',
            title: '8 Orders Ready to Ship',
            description: 'Create shipping labels and schedule pickup for pending orders',
            count: 8,
            actionLabel: 'Create Labels',
            actionUrl: '/seller/orders?status=ready_to_ship',
            dismissable: false,
        },
        {
            id: 'low-wallet',
            type: 'low_wallet',
            priority: 'medium',
            title: 'Low Wallet Balance',
            description: 'Current balance: ₹850. Recharge to continue smooth shipping operations',
            actionLabel: 'Recharge Wallet',
            actionUrl: '/seller/wallet',
            dismissable: true,
        },
        {
            id: 'kyc-pending',
            type: 'kyc_pending',
            priority: 'high',
            title: 'KYC Verification Pending',
            description: 'Complete verification to unlock all platform features and higher limits',
            actionLabel: 'Complete KYC',
            actionUrl: '/seller/kyc',
            dismissable: false,
        },
    ],
};

/**
 * Hook to fetch seller actionable items
 * Uses mock data as fallback if API is unavailable
 */
export const useSellerActions = (options?: { useMockData?: boolean }) => {
    return useQuery<SellerActionsResponse>({
        queryKey: ['seller', 'actions'],
        queryFn: async () => {
            // In development, use mock data by default (backend endpoint may not exist)
            // This avoids noisy console errors during development
            const isDevelopment = process.env.NODE_ENV === 'development';

            if (options?.useMockData || isDevelopment) {
                return mockSellerActions;
            }

            // In production, try the API and fall back to mock data on error
            try {
                const response = await apiClient.get('/analytics/seller-actions');
                return response.data as SellerActionsResponse;
            } catch (error) {
                // Fallback to mock data if API fails
                return mockSellerActions;
            }
        },
        staleTime: 120000, // 2 minutes
        refetchInterval: 120000, // Auto-refresh every 2 minutes
        retry: 1,
    });
};

export default useSellerActions;
