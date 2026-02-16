import { useMutation, useQuery, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../http';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import type {
    PlatformSettings,
    FeatureFlagItem,
    UpdatePlatformSettingsRequest,
    ToggleFeatureRequest,
    PlatformSettingsResponse,
    FeatureFlagsResponse,
} from '@/src/types/api/settings';
import { showSuccessToast, handleApiError } from '@/src/lib/error';

// ==================== PLATFORM SETTINGS ====================

/**
 * Fetch platform settings
 */
export const usePlatformSettings = (options?: UseQueryOptions<PlatformSettings, ApiError>) => {
    return useQuery<PlatformSettings, ApiError>({
        queryKey: queryKeys.settings.platform(),
        queryFn: async () => {
            const response = await apiClient.get<PlatformSettingsResponse>('/admin/settings/platform');
            return response.data.data;
        },
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Update platform settings
 */
export const useUpdatePlatformSettings = (options?: UseMutationOptions<PlatformSettings, ApiError, UpdatePlatformSettingsRequest>) => {
    const queryClient = useQueryClient();

    return useMutation<PlatformSettings, ApiError, UpdatePlatformSettingsRequest>({
        mutationFn: async (data: UpdatePlatformSettingsRequest) => {
            const response = await apiClient.put<PlatformSettingsResponse>(
                '/admin/settings/platform',
                data
            );
            return response.data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.settings.platform() });
            showSuccessToast('Platform settings updated successfully');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

// ==================== FEATURE FLAGS ====================

/**
 * Fetch feature flags
 */
export const useFeatureFlags = (options?: UseQueryOptions<FeatureFlagItem[], ApiError>) => {
    return useQuery<FeatureFlagItem[], ApiError>({
        queryKey: queryKeys.settings.featureFlags(),
        queryFn: async () => {
            const response = await apiClient.get<FeatureFlagsResponse>('/admin/feature-flags');
            return response.data.data.flags || [];
        },
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Toggle a feature flag
 */
export const useToggleFeature = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (request: ToggleFeatureRequest) => {
            const response = await apiClient.post<{ success: boolean; data: { flag: FeatureFlagItem } }>(
                `/admin/feature-flags/${request.key}/toggle`,
                { isEnabled: request.isEnabled }
            );
            return response.data.data.flag;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.settings.featureFlags() });
            showSuccessToast(
                `${variables.key} ${variables.isEnabled ? 'enabled' : 'disabled'} successfully`
            );
        },
        onError: (error: any) => {
            handleApiError(error, 'Failed to toggle feature');
        },
    });
};

// ==================== RE-EXPORTS ====================
// Export hooks from other files for backward compatibility
// Note: Some re-exports removed to avoid circular dependencies and duplicates
// Import directly from specific domains if needed

export { useTeamMembers, useInviteTeamMember, useUpdateMemberRole, useRemoveTeamMember } from './useTeam';
