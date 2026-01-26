import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/src/core';

interface MultiCarrierInput {
    originPincode: string;
    destinationPincode: string;
    weight: number;
    dimensions?: {
        length: number;
        width: number;
        height: number;
    };
    paymentMode: 'prepaid' | 'cod';
    orderValue?: number;
}

interface CarrierRate {
    carrier: string;
    serviceType: string;
    rate: number;
    breakdown: {
        base: number;
        weightCharge: number;
        zoneCharge: number;
        tax: number;
        codCharge?: number;
    };
    zone: string;
    eta: {
        minDays: number;
        maxDays: number;
    };
    recommended: boolean;
}

interface MultiCarrierResponse {
    status: string;
    data: {
        rates: CarrierRate[];
        cheapest: CarrierRate;
        fastest: CarrierRate;
    };
    message: string;
}

export const useMultiCarrierRates = () => {
    return useMutation({
        mutationFn: async (data: MultiCarrierInput) => {
            const response = await apiClient.post<MultiCarrierResponse>('/rate-cards/compare', data);
            return response.data;
        },
    });
};
