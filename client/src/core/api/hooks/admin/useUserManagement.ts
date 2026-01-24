/**
 * User Management API Hooks
 *
 * React hooks for super admin user management operations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../client';

interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

interface PaginatedResponse<T> {
    users: T[];
    pagination: {
        currentPage: number;
        totalPages: number;
        totalUsers: number;
        limit: number;
    };
}

export interface UserListItem {
    _id: string;
    name: string;
    email: string;
    role: 'super_admin' | 'admin' | 'seller' | 'staff';
    companyId?: string;
    companyName?: string;
    createdAt: string;
    totalOrders?: number;
    canPromote: boolean;
    canDemote: boolean;
    isDualRole: boolean;
}

export interface UserListFilters {
    role?: 'all' | 'super_admin' | 'admin' | 'seller' | 'staff';
    search?: string;
    page?: number;
    limit?: number;
}

export interface RoleChangeAudit {
    performedBy: string;
    targetUser: string;
    action: 'promote' | 'demote';
    previousRole: string;
    newRole: string;
    reason?: string;
    retainedCompany: boolean;
}

/**
 * Fetch paginated list of users
 */
export function useUserList(filters: UserListFilters) {
    return useQuery({
        queryKey: ['admin', 'users', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.role && filters.role !== 'all') params.append('role', filters.role);
            if (filters.search) params.append('search', filters.search);
            if (filters.page) params.append('page', filters.page.toString());
            if (filters.limit) params.append('limit', filters.limit.toString());

            const response = await apiClient.get<ApiResponse<PaginatedResponse<UserListItem>>>(
                `/admin/users?${params.toString()}`
            );
            return response.data.data;
        },
        staleTime: 30000, // 30 seconds
    });
}

/**
 * Promote seller to admin
 */
export function usePromoteUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId, reason }: { userId: string; reason?: string }) => {
            const response = await apiClient.post<ApiResponse<{ audit: RoleChangeAudit }>>(
                `/admin/users/${userId}/promote`,
                { reason }
            );
            return response.data;
        },
        onSuccess: () => {
            // Invalidate user list to refresh
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
        },
    });
}

/**
 * Demote admin to seller
 */
export function useDemoteUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId, reason }: { userId: string; reason?: string }) => {
            const response = await apiClient.post<ApiResponse<{ audit: RoleChangeAudit }>>(
                `/admin/users/${userId}/demote`,
                { reason }
            );
            return response.data;
        },
        onSuccess: () => {
            // Invalidate user list to refresh
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
        },
    });
}

/**
 * Get detailed user information
 */
export function useUserDetails(userId: string | null) {
    return useQuery({
        queryKey: ['admin', 'users', userId],
        queryFn: async () => {
            if (!userId) return null;
            const response = await apiClient.get<ApiResponse<{ user: any }>>(
                `/admin/users/${userId}`
            );
            return response.data.data.user;
        },
        enabled: !!userId,
    });
}
