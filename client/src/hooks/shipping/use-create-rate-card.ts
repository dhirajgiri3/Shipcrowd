
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/src/core';

interface ZoneRate {
    zone: string;
    price: number;
}

// Flexible input to match the complex component payload
export interface CreateRateCardInput {
    [key: string]: any;
}

export const useCreateRateCard = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateRateCardInput) => {
            const response = await apiClient.post('/rate-cards', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rate-cards'] });
        },
    });
};
