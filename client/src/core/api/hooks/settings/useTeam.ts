import { useMutation, useQuery, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../http';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { showSuccessToast, handleApiError } from '@/src/lib/error';
import type { TeamMember, InviteTeamMemberPayload, UpdateMemberRolePayload } from '@/src/types/api/settings';

/**
 * Fetch team members for current company
 */
export const useTeamMembers = (options?: UseQueryOptions<TeamMember[], ApiError>) => {
    return useQuery<TeamMember[], ApiError>({
        queryKey: queryKeys.team.members(),
        queryFn: async () => {
            const response = await apiClient.get<{ data: { members: TeamMember[] } }>('/team/members');
            return response.data.data.members;
        },
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Invite a new team member
 */
export const useInviteTeamMember = (options?: UseMutationOptions<any, ApiError, InviteTeamMemberPayload>) => {
    const queryClient = useQueryClient();

    return useMutation<any, ApiError, InviteTeamMemberPayload>({
        mutationFn: async (data: InviteTeamMemberPayload) => {
            const response = await apiClient.post('/team/invite', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.team.members() });
            showSuccessToast('Team member invited successfully');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Update team member role
 */
export const useUpdateMemberRole = (options?: UseMutationOptions<any, ApiError, UpdateMemberRolePayload>) => {
    const queryClient = useQueryClient();

    return useMutation<any, ApiError, UpdateMemberRolePayload>({
        mutationFn: async ({ memberId, teamRole }: UpdateMemberRolePayload) => {
            const response = await apiClient.patch(`/team/members/${memberId}/role`, { teamRole });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.team.members() });
            showSuccessToast('Member role updated successfully');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Remove team member
 */
export const useRemoveTeamMember = (options?: UseMutationOptions<any, ApiError, string>) => {
    const queryClient = useQueryClient();

    return useMutation<any, ApiError, string>({
        mutationFn: async (memberId: string) => {
            const response = await apiClient.delete(`/team/members/${memberId}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.team.members() });
            showSuccessToast('Team member removed successfully');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};
