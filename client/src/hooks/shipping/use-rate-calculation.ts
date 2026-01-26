import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';

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

export interface RateCalculationResult {
    rate: number;
    carrier: string;
    serviceType: string;
    weight: number;
    zone: string;
    rateCardName: string;
    breakdown: RateBreakdown;
}

interface CalculateRateResponse {
    status: string;
    data: RateCalculationResult;
    message: string;
}

export const useRateCalculation = () => {
    return useMutation<RateCalculationResult, Error, CalculateRateInput>({
        mutationFn: async (data: CalculateRateInput) => {
            const response = await apiClient.post<CalculateRateResponse>('/rate-cards/calculate', data);
            return response.data.data;
        },
    });
};
