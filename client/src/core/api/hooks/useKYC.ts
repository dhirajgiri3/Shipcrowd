import { apiClient, ApiError } from '../client';
import { handleApiError, showSuccessToast } from '../errors/error-handler';
import {
    useQuery,
    useMutation,
    useQueryClient,
    UseQueryOptions,
    UseMutationOptions,
} from '@tanstack/react-query';

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
        queryKey: ['kycs', filters],
        queryFn: async () => {
            const response = await apiClient.get('/kyc/all', { params: filters });
            return response.data;
        },
        staleTime: 30000,
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
            queryClient.invalidateQueries({ queryKey: ['kycs'] });
            showSuccessToast('KYC verified successfully');
        },
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
