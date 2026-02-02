/**
 * Admin Companies Hooks
 * Centralized hooks for managing companies in the admin panel
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companyApi, Company, CreateCompanyData, InviteOwnerData } from '@/src/core/api/clients/companyApi';
import { queryKeys } from '@/src/core/api/config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '@/src/core/api/config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';
import { ApiError } from '@/src/core/api/http';

export interface CompanyListParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
}

/**
 * Get all companies with pagination and filtering
 */
export const useAdminCompanies = (params: CompanyListParams = {}) => {
    return useQuery({
        queryKey: queryKeys.admin.companies.list(params),
        queryFn: async () => await companyApi.getAllCompanies(params),
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
    });
};

/**
 * Get company statistics
 */
export const useAdminCompanyStats = () => {
    return useQuery({
        queryKey: queryKeys.admin.companies.stats(),
        queryFn: async () => await companyApi.getCompanyStats(),
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
    });
};

/**
 * Create a new company
 */
export const useCreateCompany = () => {
    const queryClient = useQueryClient();

    return useMutation<
        { message: string; company: Company },
        ApiError,
        CreateCompanyData
    >({
        mutationFn: async (data) => await companyApi.createCompany(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.companies.all() });
            showSuccessToast('Company created successfully');
        },
        onError: (error) => {
            handleApiError(error, 'Failed to create company');
        },
    });
};

/**
 * Update company status
 */
export const useUpdateCompanyStatus = () => {
    const queryClient = useQueryClient();

    return useMutation<
        { message: string; company: Company },
        ApiError,
        { companyId: string; status: Company['status']; reason?: string }
    >({
        mutationFn: async ({ companyId, status, reason }) =>
            await companyApi.updateCompanyStatus(companyId, status, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.companies.all() });
            showSuccessToast('Company status updated successfully');
        },
        onError: (error) => {
            handleApiError(error, 'Failed to update company status');
        },
    });
};

/**
 * Invite owner to company
 */
export const useInviteOwner = () => {
    return useMutation<
        { message: string },
        ApiError,
        { companyId: string; data: InviteOwnerData }
    >({
        mutationFn: async ({ companyId, data }) => await companyApi.inviteOwner(companyId, data),
        onSuccess: () => {
            showSuccessToast('Owner invitation sent successfully');
        },
        onError: (error) => {
            handleApiError(error, 'Failed to send invitation');
        },
    });
};
