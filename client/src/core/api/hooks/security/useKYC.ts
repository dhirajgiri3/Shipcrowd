import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../client';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';

// KYC Types
export interface KYCDocument {
    _id: string;
    userId: string;
    companyId: string;
    status: 'pending' | 'verified' | 'rejected';
    documents: {
        pan?: {
            number: string;
            image: string;
            verified: boolean;
        };
        aadhaar?: {
            number: string;
            frontImage: string;
            backImage: string;
            verified: boolean;
        };
        gstin?: {
            number: string;
            verified: boolean;
        };
        bankAccount?: {
            accountNumber: string;
            ifscCode: string;
            accountHolderName: string;
            bankName: string;
            proofImage?: string;
            verified: boolean;
        };
    };
    rejectionReason?: string;
    createdAt: string;
    updatedAt: string;
}

export interface KYCFilters {
    status?: 'pending' | 'verified' | 'rejected';
    page?: number;
    limit?: number;
}

export interface KYCsResponse {
    kycs: KYCDocument[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        pages: number;
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
            return response.data;
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
            queryClient.invalidateQueries({ queryKey: queryKeys.kyc.all() });
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
            queryClient.invalidateQueries({ queryKey: ['kycs'] });
            showSuccessToast('KYC rejected');
        },
        onError: (error) => {
            handleApiError(error, 'KYC Rejection Failed');
        },
        ...options,
    });
};
