import { useMutation, useQuery, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../client';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import type {
    PlatformSettings,
    FeatureFlags,
    UpdatePlatformSettingsRequest,
    ToggleFeatureRequest,
    TestIntegrationRequest,
    TestIntegrationResponse,
    PlatformSettingsResponse,
    FeatureFlagsResponse,
    Webhook,
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

export const useTestIntegration = (options?: UseMutationOptions<TestIntegrationResponse, ApiError, TestIntegrationRequest>) => {
    return useMutation<TestIntegrationResponse, ApiError, TestIntegrationRequest>({
        mutationFn: async (request: TestIntegrationRequest) => {
            const response = await apiClient.post<TestIntegrationResponse>(
                '/admin/settings/test-integration',
                request
            );
            return response.data;
        },
        onSuccess: (data) => {
            if (data.success) {
                showSuccessToast(data.message || 'Integration test successful');
            }
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.NO_RETRY,
        ...options,
    });
};

// ==================== FEATURE FLAGS ====================

/**
 * Fetch feature flags
 */
export const useFeatureFlags = (options?: UseQueryOptions<FeatureFlags, ApiError>) => {
    return useQuery<FeatureFlags, ApiError>({
        queryKey: queryKeys.settings.featureFlags(),
        queryFn: async () => {
            const response = await apiClient.get<FeatureFlagsResponse>('/admin/settings/features');
            return response.data.data;
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
            const response = await apiClient.post<FeatureFlagsResponse>(
                '/admin/settings/features/toggle',
                request
            );
            return response.data.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.settings.featureFlags() });
            showSuccessToast(
                `${variables.feature} ${variables.enabled ? 'enabled' : 'disabled'} successfully`
            );
        },
        onError: (error: any) => {
            handleApiError(error, 'Failed to toggle feature');
        },
    });
};

export const useBulkUpdateFeatures = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (features: Partial<FeatureFlags>) => {
            const response = await apiClient.put<FeatureFlagsResponse>(
                '/admin/settings/features',
                features
            );
            return response.data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.settings.featureFlags() });
            showSuccessToast('Feature flags updated successfully');
        },
        onError: (error: any) => {
            handleApiError(error, 'Failed to update feature flags');
        },
    });
};

// ==================== RE-EXPORTS ====================
// Export hooks from other files for backward compatibility
// Note: Some re-exports removed to avoid circular dependencies and duplicates
// Import directly from specific domains if needed

export { useTeamMembers, useInviteTeamMember, useUpdateMemberRole, useRemoveTeamMember } from './useTeam';
