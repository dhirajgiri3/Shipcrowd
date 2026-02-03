import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../http';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';

// Profile interfaces
export interface UserProfile {
    _id: string;
    name: string;
    email: string;
    companyId?: string;
    createdAt?: string;
    phone?: string;
    avatar?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
}

export interface UpdateProfilePayload {
    name?: string;
    phone?: string;
    avatar?: string;
}

import { Company } from '../../clients/general/companyApi';
export type { Company };

export interface UpdateCompanyPayload {
    name?: string;
    address?: Company['address'];
    billingInfo?: Company['billingInfo'];
}

/**
 * Get current user profile
 */
export const useProfile = (options?: UseQueryOptions<UserProfile, ApiError>) => {
    return useQuery<UserProfile, ApiError>({
        queryKey: queryKeys.settings.profile(),
        queryFn: async () => {
            const response = await apiClient.get('/users/profile');
            return response.data.user;
        },
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Update user profile
 */
export const useUpdateProfile = (options?: UseMutationOptions<UserProfile, ApiError, UpdateProfilePayload>) => {
    const queryClient = useQueryClient();

    return useMutation<UserProfile, ApiError, UpdateProfilePayload>({
        mutationFn: async (payload) => {
            const response = await apiClient.patch('/profile/basic', payload);
            return response.data.user;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.settings.profile() });
            showSuccessToast('Profile updated successfully');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Get company details
 */
export const useCompany = (companyId: string, options?: UseQueryOptions<Company, ApiError>) => {
    return useQuery<Company, ApiError>({
        queryKey: queryKeys.settings.company(companyId),
        queryFn: async () => {
            const response = await apiClient.get(`/companies/${companyId}`);
            return response.data.company;
        },
        enabled: !!companyId,
        staleTime: 60000,
        ...options,
    });
};

/**
 * Update company details
 */
export const useUpdateCompany = (options?: UseMutationOptions<Company, ApiError, { companyId: string; data: UpdateCompanyPayload }>) => {
    const queryClient = useQueryClient();

    return useMutation<Company, ApiError, { companyId: string; data: UpdateCompanyPayload }>({
        mutationFn: async ({ companyId, data }) => {
            const response = await apiClient.patch(`/companies/${companyId}`, data);
            return response.data.company;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['company', variables.companyId] });
            showSuccessToast('Company details updated successfully');
        },
        onError: (error) => {
            handleApiError(error, 'Company Update Failed');
        },
        ...options,
    });
};
