
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/src/core';

interface ZoneRate {
    zone: string;
    price: number;
}

interface CreateRateCardInput {
    courierProviderId: string;
    courierServiceId: string;
    rateCardCategory: string;
    shipmentType: 'forward' | 'reverse';
    gst: number;
    minimumFare: number;
    minimumFareCalculatedOn: 'freight' | 'freight_overhead';
    zoneBType: 'state' | 'region';
    isWeightConstraint: boolean;
    minWeight?: number;
    maxWeight?: number;
    status: 'active' | 'inactive';
    baseWeight: number; // in grams
    baseRates: ZoneRate[];
    additionalWeight: number; // in grams
    additionalRates: ZoneRate[];
    codPercentage: number;
    codMinimumCharge: number;
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
