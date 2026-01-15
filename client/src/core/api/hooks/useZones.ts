import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import { queryKeys } from '../queryKeys';
import type {
    Zone,
    CreateZoneRequest,
    UpdateZoneRequest,
    AddPincodesToZoneRequest,
    RemovePincodesFromZoneRequest,
    ZoneListFilters,
    ZoneListResponse,
    ZoneDetailResponse,
    PincodeValidationResult,
} from '@/src/types/api/zones.types';
import { toast } from 'sonner';

// ==================== QUERIES ====================

/**
 * Fetch list of zones with optional filters
 */
export const useZones = (filters?: ZoneListFilters) => {
    return useQuery({
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
    });
};

/**
 * Fetch single zone by ID
 */
export const useZone = (id: string | undefined) => {
    return useQuery({
        queryKey: queryKeys.zones.detail(id!),
        queryFn: async () => {
            const response = await apiClient.get<ZoneDetailResponse>(`/admin/zones/${id}`);
            return response.data.data;
        },
        enabled: !!id,
    });
};

// ==================== MUTATIONS ====================

/**
 * Create new zone
 */
export const useCreateZone = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateZoneRequest) => {
            const response = await apiClient.post<ZoneDetailResponse>('/admin/zones', data);
            return response.data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.zones.all });
            toast.success('Zone created successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to create zone');
        },
    });
};

/**
 * Update existing zone
 */
export const useUpdateZone = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: UpdateZoneRequest }) => {
            const response = await apiClient.put<ZoneDetailResponse>(`/admin/zones/${id}`, data);
            return response.data.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.zones.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.zones.detail(variables.id) });
            toast.success('Zone updated successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to update zone');
        },
    });
};

/**
 * Delete zone
 */
export const useDeleteZone = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/admin/zones/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.zones.all });
            toast.success('Zone deleted successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to delete zone');
        },
    });
};

/**
 * Add pincodes to zone
 */
export const useAddPincodesToZone = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: AddPincodesToZoneRequest }) => {
            const response = await apiClient.post<{ success: boolean; data: PincodeValidationResult }>(
                `/admin/zones/${id}/pincodes`,
                data
            );
            return response.data.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.zones.detail(variables.id) });
            toast.success('Pincodes added successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to add pincodes');
        },
    });
};

/**
 * Remove pincodes from zone
 */
export const useRemovePincodesFromZone = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: RemovePincodesFromZoneRequest }) => {
            await apiClient.request({
                method: 'DELETE',
                url: `/admin/zones/${id}/pincodes`,
                data,
            });
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.zones.detail(variables.id) });
            toast.success('Pincodes removed successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to remove pincodes');
        },
    });
};

/**
 * Validate pincodes for bulk upload
 */
export const useValidatePincodes = () => {
    return useMutation({
        mutationFn: async (pincodes: string[]) => {
            const response = await apiClient.post<{ success: boolean; data: PincodeValidationResult }>(
                '/admin/zones/validate-pincodes',
                { pincodes }
            );
            return response.data.data;
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to validate pincodes');
        },
    });
};
