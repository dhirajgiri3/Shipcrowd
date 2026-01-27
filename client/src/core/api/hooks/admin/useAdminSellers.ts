/**
 * Admin Sellers Hooks
 * Extends existing company hooks with admin-specific functionality
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companyApi, Company, CreateCompanyData } from '../../clients/companyApi';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';
import { ApiError } from '../../http';

export interface AdminSellerListParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    kycStatus?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

/**
 * Get all companies/sellers (Admin only)
 */
export const useAdminSellers = (params?: AdminSellerListParams) => {
    return useQuery<{ companies: Company[]; total: number; pages: number }, ApiError>({
        queryKey: queryKeys.admin.sellers.list(params),
        queryFn: async () => await companyApi.getAllCompanies(params),
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
    });
};

/**
 * Get company stats (Admin only)
 */
export const useAdminCompanyStats = () => {
    return useQuery({
        queryKey: queryKeys.settings.companies(),
        queryFn: async () => await companyApi.getCompanyStats(),
        ...CACHE_TIMES.LONG,
    });
};

/**
 * Update company status (Approve/Reject/Suspend)
 */
export const useAdminCompanyAction = () => {
    const queryClient = useQueryClient();

    return useMutation<
        { message: string; company: Company },
        ApiError,
        { companyId: string; status: Company['status']; reason?: string }
    >({
        mutationFn: async ({ companyId, status, reason }) =>
            await companyApi.updateCompanyStatus(companyId, status, reason),
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.sellers.all() });
            queryClient.invalidateQueries({ queryKey: queryKeys.settings.companies() });
            showSuccessToast(response.message || 'Seller status updated successfully');
        },
        onError: (error) => {
            handleApiError(error, 'Failed to update seller status');
        },
    });
};
