import { apiClient, ApiError } from '../../http';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';

export interface Settlement {
    id: string;
    date: string;
    amount: number;
    ordersCount: number;
    status: 'processed' | 'processing' | 'scheduled' | 'failed';
    referenceId?: string;
}

export interface SettlementsResponse {
    settlements: Settlement[];
    summary: {
        totalSettled: number;
        pendingSettlement: number;
        nextSettlementDate: string;
    };
}

/**
 * Fetch COD settlements
 */
export const useSettlements = (options?: UseQueryOptions<SettlementsResponse, ApiError>) => {
    return useQuery<SettlementsResponse, ApiError>({
        queryKey: ['settlements'],
        // Mocking the API response for now
        queryFn: async () => {
            const response = await apiClient.get('/finance/settlements');
            return response.data;
        },
        staleTime: 300000, // 5 mins
        ...options,
    });
};
