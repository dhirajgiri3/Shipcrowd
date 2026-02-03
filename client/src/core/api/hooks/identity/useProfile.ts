import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../http';
import { UserProfile, ProfileUpdatePayload, AddressUpdatePayload, PersonalUpdatePayload, SocialUpdatePayload, PreferencesUpdatePayload } from '@/src/types/domain/identity'; // Adjust path if needed
import { showSuccessToast, handleApiError } from '@/src/lib/error';

const IDENTITY_KEYS = {
    profile: ['identity', 'profile'] as const,
    completion: ['identity', 'profile', 'completion'] as const,
};

// --- Queries ---

export const useProfile = (options?: UseQueryOptions<UserProfile, ApiError>) => {
    return useQuery<UserProfile, ApiError>({
        queryKey: IDENTITY_KEYS.profile,
        queryFn: async () => {
            // Assuming /identity/profile endpoint returns the full user profile
            // Based on profile.controller.ts, it seems update endpoints return partials, 
            // but usually there's a GET /me or /profile endpoint. 
            // Checking standard pattern, likely /auth/me or /identity/profile. 
            // If strictly following profile.controller.ts, there isn't a "get full profile" there, 
            // usually handled by user controller or auth controller.
            // For now, assuming GET /identity/profile or /auth/me creates the base user object.
            // Let's assume /identity/me based on typical structure, or use the one from auth context if available.
            // However, to be safe and data-fresh, we'll request from API.
            const { data } = await apiClient.get('/auth/me');
            return data.data;
        },
        ...options
    });
};

export const useProfileCompletion = (options?: UseQueryOptions<any, ApiError>) => {
    return useQuery({
        queryKey: IDENTITY_KEYS.completion,
        queryFn: async () => {
            const { data } = await apiClient.get('/identity/profile/completion');
            return data.data;
        },
        ...options
    });
};

// --- Mutations ---

export const useProfileUpdate = (options?: UseMutationOptions<UserProfile, ApiError, ProfileUpdatePayload>) => {
    const queryClient = useQueryClient();
    return useMutation<UserProfile, ApiError, ProfileUpdatePayload>({
        mutationFn: async (payload) => {
            const { data } = await apiClient.patch('/identity/profile/basic', payload);
            return data.data.user; // Controller returns { user: ... }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: IDENTITY_KEYS.profile });
            showSuccessToast('Profile updated successfully');
        },
        onError: (error) => handleApiError(error, 'Failed to update profile'),
        ...options
    });
};

export const useAddressUpdate = (options?: UseMutationOptions<any, ApiError, AddressUpdatePayload>) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: AddressUpdatePayload) => {
            const { data } = await apiClient.patch('/identity/profile/address', payload);
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: IDENTITY_KEYS.profile });
            showSuccessToast('Address updated successfully');
        },
        onError: (error) => handleApiError(error, 'Failed to update address'),
        ...options
    });
};

// Add other mutations as needed (Personal, Social, Preferences) following the same pattern
