import { apiClient, ApiError } from '../client';
import { handleApiError, showSuccessToast } from '../errors/error-handler';
import {
    useQuery,
    useMutation,
    useQueryClient,
    UseQueryOptions,
    UseMutationOptions,
} from '@tanstack/react-query';

export interface Shipment {
    _id: string;
    trackingNumber: string;
    orderId: string;
    companyId: string;
    carrier: 'Delhivery' | 'DTDC' | 'Xpressbees';
    serviceType: 'express' | 'standard';
    currentStatus: 'created' | 'picked' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'ndr' | 'rto';
    estimatedDelivery: string;
    createdAt: string;
    timeline?: Array<{
        status: string;
        timestamp: string;
        location?: string;
        description?: string;
    }>;
}

export interface ShipmentFilters {
    page?: number;
    limit?: number;
    status?: string;
    carrier?: string;
    sortBy?: string;
}

export interface ShipmentsResponse {
    shipments: Shipment[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}

export interface CreateShipmentPayload {
    orderId: string;
    serviceType?: 'express' | 'standard';
    carrierOverride?: string;
}

export interface CarrierOption {
    carrier: string;
    rate: number;
    deliveryTime: number;
    score: number;
    serviceType: string;
}

export interface CreateShipmentResponse {
    message: string;
    shipment: Shipment;
    carrierSelection: {
        selectedCarrier: string;
        selectedRate: number;
        alternativeOptions: CarrierOption[];
    };
}

export interface TrackingResponse {
    trackingNumber: string;
    carrier: string;
    currentStatus: string;
    timeline: Array<{
        status: string;
        timestamp: string;
        location?: string;
        description?: string;
    }>;
}

/**
 * Fetch paginated shipments list
 */
export const useShipments = (filters: ShipmentFilters = {}, options?: UseQueryOptions<ShipmentsResponse, ApiError>) => {
    return useQuery<ShipmentsResponse, ApiError>({
        queryKey: ['shipments', filters],
        queryFn: async () => {
            const response = await apiClient.get('/shipments', { params: filters });
            return response.data;
        },
        staleTime: 30000,
        ...options,
    });
};

/**
 * Fetch single shipment by ID
 */
export const useShipment = (shipmentId: string, options?: UseQueryOptions<Shipment, ApiError>) => {
    return useQuery<Shipment, ApiError>({
        queryKey: ['shipments', shipmentId],
        queryFn: async () => {
            const response = await apiClient.get(`/shipments/${shipmentId}`);
            return response.data.shipment;
        },
        enabled: !!shipmentId,
        staleTime: 30000,
        ...options,
    });
};

/**
 * Track shipment by AWB/tracking number
 */
export const useTrackShipment = (trackingNumber: string, options?: UseQueryOptions<TrackingResponse, ApiError>) => {
    return useQuery<TrackingResponse, ApiError>({
        queryKey: ['shipments', 'tracking', trackingNumber],
        queryFn: async () => {
            const response = await apiClient.get(`/shipments/tracking/${trackingNumber}`);
            return response.data;
        },
        enabled: !!trackingNumber && trackingNumber.length > 0,
        staleTime: 60000, // 1 minute for tracking data
        ...options,
    });
};

/**
 * Create shipment from order (returns carrier alternatives)
 */
export const useCreateShipment = (options?: UseMutationOptions<CreateShipmentResponse, ApiError, CreateShipmentPayload>) => {
    const queryClient = useQueryClient();

    return useMutation<CreateShipmentResponse, ApiError, CreateShipmentPayload>({
        mutationFn: async (payload) => {
            const response = await apiClient.post('/shipments', payload);
            return response.data;
        },
        onSuccess: (data) => {
            // Invalidate shipments list and related order
            queryClient.invalidateQueries({ queryKey: ['shipments'] });
            queryClient.invalidateQueries({ queryKey: ['orders', data.shipment.orderId] });
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            showSuccessToast(`Shipment created with ${data.carrierSelection.selectedCarrier}`);
        },
        onError: (error) => {
            handleApiError(error, 'Create Shipment Failed');
        },
        ...options,
    });
};

/**
 * Update shipment status with timeline update
 */
export const useUpdateShipmentStatus = (
    options?: UseMutationOptions<Shipment, ApiError, { shipmentId: string; status: string; location?: string; description?: string }>
) => {
    const queryClient = useQueryClient();

    return useMutation<Shipment, ApiError, { shipmentId: string; status: string; location?: string; description?: string }>({
        mutationFn: async ({ shipmentId, status, location, description }) => {
            const response = await apiClient.patch(`/shipments/${shipmentId}/status`, { status, location, description });
            return response.data.shipment;
        },
        onSuccess: (data, { shipmentId }) => {
            queryClient.invalidateQueries({ queryKey: ['shipments', shipmentId] });
            queryClient.invalidateQueries({ queryKey: ['shipments'] });
            showSuccessToast('Shipment status updated');
        },
        onError: (error) => {
            handleApiError(error, 'Update Status Failed');
        },
        ...options,
    });
};

/**
 * Delete shipment
 */
export const useDeleteShipment = (options?: UseMutationOptions<void, ApiError, string>) => {
    const queryClient = useQueryClient();

    return useMutation<void, ApiError, string>({
        mutationFn: async (shipmentId) => {
            await apiClient.delete(`/shipments/${shipmentId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shipments'] });
            showSuccessToast('Shipment deleted successfully');
        },
        onError: (error) => {
            handleApiError(error, 'Delete Shipment Failed');
        },
        ...options,
    });
};
