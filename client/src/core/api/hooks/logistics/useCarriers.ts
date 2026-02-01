import { useQuery } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../http';

export interface Carrier {
    id: string;
    name: string;
    code: string;
    logo: string;
    status: 'active' | 'inactive';
    services: string[];
    zones: string[];
    apiIntegrated: boolean;
    pickupEnabled: boolean;
    codEnabled: boolean;
    trackingEnabled: boolean;
    codLimit: number;
    weightLimit: number;
    totalShipments?: number; // Optional as it might come from analytics later
    avgDeliveryTime?: string;
    successRate?: number;
}

interface CarriersResponse {
    success: boolean;
    data: Carrier[];
}

export const useCarriers = () => {
    return useQuery<Carrier[], Error>({
        queryKey: ['carriers'],
        queryFn: async () => {
            const { data } = await apiClient.get<CarriersResponse>('/admin/carriers');
            return data.data;
        },
    });
};
