import { apiClient, ApiError } from '../config/client';
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
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 600));

            // Mock data based on UI requirements
            return {
                settlements: [
                    {
                        id: 'set_1',
                        date: '2025-12-15',
                        amount: 45230,
                        ordersCount: 52,
                        status: 'scheduled',
                    },
                    {
                        id: 'set_2',
                        date: '2025-12-18',
                        amount: 32100,
                        ordersCount: 38,
                        status: 'processing',
                    }
                ],
                summary: {
                    totalSettled: 1250000,
                    pendingSettlement: 77330,
                    nextSettlementDate: '2025-12-20'
                }
            };

            // TODO: Uncomment when backend is ready
            // const response = await apiClient.get('/finance/settlements');
            // return response.data;
        },
        staleTime: 300000, // 5 mins
        ...options,
    });
};
