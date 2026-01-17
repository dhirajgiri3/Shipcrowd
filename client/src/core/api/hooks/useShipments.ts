import { apiClient, ApiError } from '../config/client';
import { queryKeys } from '../config/queryKeys';
import { CACHE_TIMES, INVALIDATION_PATTERNS, RETRY_CONFIG } from '../config/cacheConfig';
import { handleApiError, showSuccessToast } from '@/src/lib/error-handler';
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
    search?: string;
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
 * Fetch paginated shipments list with filters
 * Uses medium cache time since shipments status changes frequently
 */
export const useShipments = (filters: ShipmentFilters = {}, options?: UseQueryOptions<ShipmentsResponse, ApiError>) => {
    return useQuery<ShipmentsResponse, ApiError>({
        queryKey: queryKeys.shipments.list(filters),
        queryFn: async () => {
            const response = await apiClient.get('/shipments', { params: filters });
            return response.data;
        },
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Fetch single shipment by ID
 * Real-time cache for accurate status display
 */
export const useShipment = (shipmentId: string, options?: UseQueryOptions<Shipment, ApiError>) => {
    return useQuery<Shipment, ApiError>({
        queryKey: queryKeys.shipments.detail(shipmentId),
        queryFn: async () => {
            const response = await apiClient.get(`/shipments/${shipmentId}`);
            return response.data.shipment;
        },
        enabled: !!shipmentId,
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Track shipment by AWB/tracking number
 * Real-time tracking data with aggressive refresh
 */
export const useTrackShipment = (trackingNumber: string, options?: UseQueryOptions<TrackingResponse, ApiError>) => {
    return useQuery<TrackingResponse, ApiError>({
        queryKey: queryKeys.shipments.tracking(trackingNumber),
        queryFn: async () => {
            const response = await apiClient.get(`/shipments/tracking/${trackingNumber}`);
            return response.data;
        },
        enabled: !!trackingNumber && trackingNumber.length > 0,
        ...CACHE_TIMES.REALTIME,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Create shipment from order (returns carrier alternatives)
 * Invalidates shipments list and related orders
 */
export const useCreateShipment = (options?: UseMutationOptions<CreateShipmentResponse, ApiError, CreateShipmentPayload>) => {
    const queryClient = useQueryClient();

    return useMutation<CreateShipmentResponse, ApiError, CreateShipmentPayload>({
        mutationFn: async (payload) => {
            const response = await apiClient.post('/shipments', payload);
            return response.data;
        },
        onSuccess: (data) => {
            // Invalidate related caches using centralized patterns
            INVALIDATION_PATTERNS.SHIPMENT_MUTATIONS.CREATE().forEach((pattern) => {
                queryClient.invalidateQueries(pattern);
            });
            showSuccessToast(`Shipment created with ${data.carrierSelection.selectedCarrier}`);
        },
        onError: (error) => {
            handleApiError(error, 'Create Shipment Failed');
        },
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Update shipment status with timeline update
 * Uses optimistic update for immediate UI feedback
 */
export const useUpdateShipmentStatus = (
    options?: UseMutationOptions<
        Shipment,
        ApiError,
        { shipmentId: string; status: string; location?: string; description?: string },
        { previousData: any; shipmentId: string } // Add context type
    >
) => {
    const queryClient = useQueryClient();

    return useMutation<
        Shipment,
        ApiError,
        { shipmentId: string; status: string; location?: string; description?: string },
        { previousData: any; shipmentId: string } // Add context type
    >({
        mutationFn: async ({ shipmentId, status, location, description }) => {
            const response = await apiClient.patch(`/shipments/${shipmentId}/status`, { status, location, description });
            return response.data.shipment;
        },
        // Optimistic update
        onMutate: async ({ shipmentId, status, location, description }) => {
            await queryClient.cancelQueries({ queryKey: queryKeys.shipments.detail(shipmentId) });
            const previousData = queryClient.getQueryData(queryKeys.shipments.detail(shipmentId));

            queryClient.setQueryData(queryKeys.shipments.detail(shipmentId), (old: any) => ({
                ...old,
                currentStatus: status,
                timeline: [...(old?.timeline || []), {
                    status,
                    timestamp: new Date().toISOString(),
                    location,
                    description,
                }]
            }));

            return { previousData, shipmentId };
        },
        onSuccess: (data, { shipmentId }) => {
            // Invalidate related caches
            INVALIDATION_PATTERNS.SHIPMENT_MUTATIONS.UPDATE().forEach((pattern) => {
                queryClient.invalidateQueries(pattern);
            });
            showSuccessToast('Shipment status updated');
        },
        onError: (error, variables, context) => {
            // Rollback on error
            if (context?.previousData) {
                queryClient.setQueryData(queryKeys.shipments.detail(variables.shipmentId), context.previousData);
            }
            handleApiError(error, 'Update Status Failed');
        },
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Delete shipment with cache cleanup
 */
export const useDeleteShipment = (options?: UseMutationOptions<void, ApiError, string>) => {
    const queryClient = useQueryClient();

    return useMutation<void, ApiError, string>({
        mutationFn: async (shipmentId) => {
            await apiClient.delete(`/shipments/${shipmentId}`);
        },
        onSuccess: (_, shipmentId) => {
            // Invalidate related caches
            INVALIDATION_PATTERNS.SHIPMENT_MUTATIONS.CANCEL().forEach((pattern) => {
                queryClient.invalidateQueries(pattern);
            });
            // Remove specific shipment from cache
            queryClient.removeQueries({ queryKey: queryKeys.shipments.detail(shipmentId) });
            showSuccessToast('Shipment deleted successfully');
        },
        onError: (error) => {
            handleApiError(error, 'Delete Shipment Failed');
        },
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};
