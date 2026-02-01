import { useMutation, useQuery, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../http';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import type {
    ShippingZone as Zone,
    CreateZoneRequest,
    UpdateZoneRequest,
    AddPincodesToZoneRequest,
    RemovePincodesFromZoneRequest,
    ZoneListFilters,
    ZoneListResponse,
    ZoneDetailResponse,
    PincodeValidationResult,
} from '@/src/types/api/logistics';
import { showSuccessToast, handleApiError } from '@/src/lib/error';

// ==================== QUERIES ====================

/**
 * Fetch list of zones with optional filters
 */
export const useZones = (filters?: ZoneListFilters, options?: UseQueryOptions<ZoneListResponse, ApiError>) => {
    return useQuery<ZoneListResponse, ApiError>({
        queryKey: queryKeys.zones.list(filters),
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters?.type) params.append('type', filters.type);
            if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
            if (filters?.search) params.append('search', filters.search);
            if (filters?.page) params.append('page', String(filters.page));
            if (filters?.limit) params.append('limit', String(filters.limit));

            const response = await apiClient.get<ZoneListResponse>(
                `/admin/zones?${params.toString()}`
            );
            return response.data;
        },
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Fetch single zone by ID
 */
export const useZone = (id: string | undefined, options?: UseQueryOptions<Zone, ApiError>) => {
    return useQuery<Zone, ApiError>({
        queryKey: queryKeys.zones.detail(id!),
        queryFn: async () => {
            const response = await apiClient.get<ZoneDetailResponse>(`/admin/zones/${id}`);
            return response.data.data;
        },
        enabled: !!id,
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

// ==================== MUTATIONS ====================

/**
 * Create new zone
 */
export const useCreateZone = (options?: UseMutationOptions<Zone, ApiError, CreateZoneRequest>) => {
    const queryClient = useQueryClient();

    return useMutation<Zone, ApiError, CreateZoneRequest>({
        mutationFn: async (data: CreateZoneRequest) => {
            const response = await apiClient.post<ZoneDetailResponse>('/admin/zones', data);
            return response.data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.zones.all() });
            showSuccessToast('Zone created successfully');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Update existing zone
 */
export const useUpdateZone = (options?: UseMutationOptions<Zone, ApiError, { id: string; data: UpdateZoneRequest }>) => {
    const queryClient = useQueryClient();

    return useMutation<Zone, ApiError, { id: string; data: UpdateZoneRequest }>({
        mutationFn: async ({ id, data }: { id: string; data: UpdateZoneRequest }) => {
            const response = await apiClient.put<ZoneDetailResponse>(`/admin/zones/${id}`, data);
            return response.data.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.zones.all() });
            queryClient.invalidateQueries({ queryKey: queryKeys.zones.detail(variables.id) });
            showSuccessToast('Zone updated successfully');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Delete zone
 */
export const useDeleteZone = (options?: UseMutationOptions<void, ApiError, string>) => {
    const queryClient = useQueryClient();

    return useMutation<void, ApiError, string>({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/admin/zones/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.zones.all() });
            showSuccessToast('Zone deleted successfully');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Add pincodes to zone
 */
export const useAddPincodesToZone = (options?: UseMutationOptions<PincodeValidationResult, ApiError, { id: string; data: AddPincodesToZoneRequest }>) => {
    const queryClient = useQueryClient();

    return useMutation<PincodeValidationResult, ApiError, { id: string; data: AddPincodesToZoneRequest }>({
        mutationFn: async ({ id, data }: { id: string; data: AddPincodesToZoneRequest }) => {
            const response = await apiClient.post<{ success: boolean; data: PincodeValidationResult }>(
                `/admin/zones/${id}/pincodes`,
                data
            );
            return response.data.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.zones.detail(variables.id) });
            showSuccessToast('Pincodes added successfully');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Remove pincodes from zone
 */
export const useRemovePincodesFromZone = (options?: UseMutationOptions<void, ApiError, { id: string; data: RemovePincodesFromZoneRequest }>) => {
    const queryClient = useQueryClient();

    return useMutation<void, ApiError, { id: string; data: RemovePincodesFromZoneRequest }>({
        mutationFn: async ({ id, data }: { id: string; data: RemovePincodesFromZoneRequest }) => {
            await apiClient.request({
                method: 'DELETE',
                url: `/admin/zones/${id}/pincodes`,
                data,
            });
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.zones.detail(variables.id) });
            showSuccessToast('Pincodes removed successfully');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Validate pincodes for bulk upload
 */
export const useValidatePincodes = (options?: UseMutationOptions<PincodeValidationResult, ApiError, string[]>) => {
    return useMutation<PincodeValidationResult, ApiError, string[]>({
        mutationFn: async (pincodes: string[]) => {
            const response = await apiClient.post<{ success: boolean; data: PincodeValidationResult }>(
                '/admin/zones/validate-pincodes',
                { pincodes }
            );
            return response.data.data;
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};
