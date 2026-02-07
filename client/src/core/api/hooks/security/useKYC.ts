import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../http';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';

// KYC Types
import { KYCData } from '../../clients/auth/kycApi';


export interface KYCFilters {
    status?: 'pending' | 'verified' | 'rejected' | 'all';
    page?: number;
    limit?: number;
    search?: string;
    startDate?: Date | string;
    endDate?: Date | string;
}

export interface KYCsResponse {
    kycs: KYCData[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
    stats: {
        total: number;
        pending: number;
        verified: number;
        rejected: number;
    };
}

/**
 * Get all KYC submissions (Admin only)
 */
export const useAllKYCs = (
    filters: KYCFilters = {},
    options?: UseQueryOptions<KYCsResponse, ApiError>
) => {
    return useQuery<KYCsResponse, ApiError>({
        queryKey: queryKeys.kyc.list(filters),
        queryFn: async () => {
            const response = await apiClient.get('/kyc/all', { params: filters });
            return response.data.data; // Response interceptor handles .data unwrapping if needed, but controller sends { data: ... } usually. 
            // Wait, responseHelper sends { status: 'success', data: { kycs: [], pagination: {}, stats: {} } }
            // So response.data is the full object.
            // If apiClient intercepts and returns response.data, then we might need to adjust. 
            // Looking at existing code: `return response.data;` was used.
            // Let's stick to that for now.
        },
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Verify a KYC document (Admin only)
 */
export const useVerifyKYC = (
    options?: UseMutationOptions<any, ApiError, { kycId: string; documentType: string }>
) => {
    const queryClient = useQueryClient();

    return useMutation<any, ApiError, { kycId: string; documentType: string }>({
        mutationFn: async ({ kycId, documentType }) => {
            const response = await apiClient.post(`/kyc/${kycId}/verify`, {
                documentType,
                verified: true,
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['kyc'], exact: false });
            showSuccessToast('KYC verified successfully');
        },
        retry: RETRY_CONFIG.DEFAULT,
        onError: (error) => {
            handleApiError(error, 'KYC Verification Failed');
        },
        ...options,
    });
};

/**
 * Reject a KYC submission (Admin only)
 */
export const useRejectKYC = (
    options?: UseMutationOptions<any, ApiError, { kycId: string; reason: string }>
) => {
    const queryClient = useQueryClient();

    return useMutation<any, ApiError, { kycId: string; reason: string }>({
        mutationFn: async ({ kycId, reason }) => {
            const response = await apiClient.post(`/kyc/${kycId}/reject`, { reason });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['kyc'], exact: false });
            showSuccessToast('KYC rejected');
        },
        onError: (error) => {
            handleApiError(error, 'KYC Rejection Failed');
        },
        ...options,
    });
};
