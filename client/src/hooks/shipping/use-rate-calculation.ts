import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/src/core'; // Assuming standard API client wrapper exists

interface CalculateRateInput {
    originPincode: string;
    destinationPincode: string;
    weight: number;
    carrier?: string;
    serviceType?: string;
}

interface RateBreakdown {
    base: number;
    weightCharge: number;
    zoneCharge: number;
    tax: number;
}

interface CalculateRateResponse {
    status: string;
    data: {
        rate: number;
        carrier: string;
        serviceType: string;
        weight: number;
        zone: string;
        rateCardName: string;
        breakdown: RateBreakdown;
    };
    message: string;
}

export const useRateCalculation = () => {
    return useMutation({
        mutationFn: async (data: CalculateRateInput) => {
            const response = await apiClient.post<CalculateRateResponse>('/rate-cards/calculate', data);
            return response.data;
        },
    });
};
