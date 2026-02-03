import { useQueries } from '@tanstack/react-query';
import { orderApi } from '../../clients';
import { ndrApi } from '../../clients/shipping/ndrApi';

interface UrgentActionsData {
    pendingPickupCount: number;
    rtoCount: number;
    ndrActionRequiredCount: number;
    isLoading: boolean;
    isError: boolean;
}

/**
 * Hook to fetch counts for urgent actions (Needs Attention)
 * Uses parallel queries with limit=1 for orders and dedicated stat endpoint for NDR
 */
export const useUrgentActions = (): UrgentActionsData => {
    // We run three parallel queries:
    // 1. Pending Pickups (pending + ready_to_ship)
    // 2. RTO Warning (rto + rto_initiated + rto_in_transit + rto_delivered)
    // 3. NDR Stats (action_required)

    const results = useQueries({
        queries: [
            {
                // Query 1: Pending Pickups
                queryKey: ['orders', 'count', 'pending_pickup'],
                queryFn: async () => await orderApi.getOrders({
                    limit: 1,
                    status: 'pending,pending_pickup,ready_to_ship'
                }),
                staleTime: 60 * 1000,
            },
            {
                // Query 2: RTO Risks
                queryKey: ['orders', 'count', 'rto'],
                queryFn: async () => await orderApi.getOrders({
                    limit: 1,
                    status: 'rto,rto_initiated,rto_in_transit,rto_delivered,rto_triggered'
                }),
                staleTime: 60 * 1000,
            },
            {
                // Query 3: NDR Stats
                queryKey: ['ndr', 'stats'],
                queryFn: async () => await ndrApi.getStats(),
                staleTime: 60 * 1000,
            }
        ]
    });

    const pendingPickupQuery = results[0];
    const rtoQuery = results[1];
    const ndrQuery = results[2];

    const isLoading = pendingPickupQuery.isLoading || rtoQuery.isLoading || ndrQuery.isLoading;
    const isError = pendingPickupQuery.isError || rtoQuery.isError || ndrQuery.isError;

    // Extract total counts from pagination metadata and stat response
    const pendingPickupCount = pendingPickupQuery.data?.pagination?.total || 0;
    const rtoCount = rtoQuery.data?.pagination?.total || 0;
    const ndrActionRequiredCount = (ndrQuery.data as any)?.actionRequired || 0;

    return {
        pendingPickupCount,
        rtoCount,
        ndrActionRequiredCount,
        isLoading,
        isError
    };
};
