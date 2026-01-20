import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../client';
import { queryKeys } from '../../config/query-keys';
import { showSuccessToast } from '@/src/lib/error';
import { handleApiError } from '@/src/lib/error';
import type { TeamMember, InviteTeamMemberPayload, UpdateMemberRolePayload } from '@/src/types/api/settings';

/**
 * Fetch team members for current company
 */
export const useTeamMembers = () => {
    return useQuery({
        queryKey: queryKeys.team.members(),
        queryFn: async () => {
            const response = await apiClient.get<{ data: { members: TeamMember[] } }>('/team/members');
            return response.data.data.members;
        },
    });
};

/**
 * Invite a new team member
 */
export const useInviteTeamMember = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: InviteTeamMemberPayload) => {
            const response = await apiClient.post('/team/invite', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.team.members() });
            showSuccessToast('Team member invited successfully');
        },
        onError: (error: any) => {
            handleApiError(error, 'Failed to invite team member');
        },
    });
};

/**
 * Update team member role
 */
export const useUpdateMemberRole = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ memberId, teamRole }: UpdateMemberRolePayload) => {
            const response = await apiClient.patch(`/team/members/${memberId}/role`, { teamRole });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.team.members() });
            showSuccessToast('Member role updated successfully');
        },
        onError: (error: any) => {
            handleApiError(error, 'Failed to update member role');
        },
    });
};

/**
 * Remove team member
 */
export const useRemoveTeamMember = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (memberId: string) => {
            const response = await apiClient.delete(`/team/members/${memberId}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.team.members() });
            showSuccessToast('Team member removed successfully');
        },
        onError: (error: any) => {
            handleApiError(error, 'Failed to remove team member');
        },
    });
};
