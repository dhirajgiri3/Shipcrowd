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
            const { data } = await apiClient.get('/auth/me');
            return data.data.user;
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
            const { data } = await apiClient.patch('/users/profile', {
                name: payload.name,
                profile: {
                    phone: payload.phone,
                },
            });
            return data.data.user;
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
            const { data } = await apiClient.patch('/users/profile', {
                profile: payload,
            });
            return data.data.user;
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
