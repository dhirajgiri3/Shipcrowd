import { apiClient, ApiError } from '../../config/client';
import { handleApiError, showSuccessToast } from '@/src/lib/error';
import {
    useQuery,
    useMutation,
    useQueryClient,
    UseQueryOptions,
    UseMutationOptions,
} from '@tanstack/react-query';

// Profile interfaces
export interface UserProfile {
    _id: string;
    name: string;
    email: string;
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

// Company interfaces
export interface Company {
    _id: string;
    name: string;
    address: {
        line1: string;
        line2?: string;
        city: string;
        state: string;
        country: string;
        postalCode: string;
    };
    billingInfo?: {
        gstin?: string;
        pan?: string;
        bankName?: string;
        accountNumber?: string;
        ifscCode?: string;
    };
}

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
        queryKey: ['profile'],
        queryFn: async () => {
            const response = await apiClient.get('/users/profile');
            return response.data.user;
        },
        staleTime: 60000,
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
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            showSuccessToast('Profile updated successfully');
        },
        onError: (error) => {
            handleApiError(error, 'Profile Update Failed');
        },
        ...options,
    });
};

/**
 * Get company details
 */
export const useCompany = (companyId: string, options?: UseQueryOptions<Company, ApiError>) => {
    return useQuery<Company, ApiError>({
        queryKey: ['company', companyId],
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
            const response = await apiClient.put(`/companies/${companyId}`, data);
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
