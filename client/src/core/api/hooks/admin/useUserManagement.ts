/**
 * User Management API Hooks
 *
 * React hooks for super admin user management operations
 */

import { useMutation, useQuery, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient } from '../../client';
import { ApiError } from '../../client';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { queryKeys } from '../../config/query-keys';
import { handleApiError, showSuccessToast } from '@/src/lib/error';

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
    stats: {
        totalUsers: number;
        superAdmins: number;
        admins: number;
        sellers: number;
        staff: number;
        users: number;
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
export function useUserList(filters: UserListFilters, options?: UseQueryOptions<PaginatedResponse<UserListItem>, ApiError>) {
    return useQuery<PaginatedResponse<UserListItem>, ApiError>({
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
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

/**
 * Promote seller to admin
 */
export function usePromoteUser(options?: UseMutationOptions<ApiResponse<{ audit: RoleChangeAudit }>, ApiError, { userId: string; reason?: string }>) {
    const queryClient = useQueryClient();

    return useMutation<ApiResponse<{ audit: RoleChangeAudit }>, ApiError, { userId: string; reason?: string }>({
        mutationFn: async ({ userId, reason }: { userId: string; reason?: string }) => {
            const response = await apiClient.post<ApiResponse<{ audit: RoleChangeAudit }>>(
                `/admin/users/${userId}/promote`,
                { reason }
            );
            return response.data;
        },
        onSuccess: () => {
            showSuccessToast('User promoted successfully');
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
        },
        onError: (error) => {
            handleApiError(error);
        },
        ...options,
    });
}

/**
 * Demote admin to seller
 */
export function useDemoteUser(options?: UseMutationOptions<ApiResponse<{ audit: RoleChangeAudit }>, ApiError, { userId: string; reason?: string }>) {
    const queryClient = useQueryClient();

    return useMutation<ApiResponse<{ audit: RoleChangeAudit }>, ApiError, { userId: string; reason?: string }>({
        mutationFn: async ({ userId, reason }: { userId: string; reason?: string }) => {
            const response = await apiClient.post<ApiResponse<{ audit: RoleChangeAudit }>>(
                `/admin/users/${userId}/demote`,
                { reason }
            );
            return response.data;
        },
        onSuccess: () => {
            showSuccessToast('User demoted successfully');
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
        },
        onError: (error) => {
            handleApiError(error);
        },
        ...options,
    });
}

/**
 * Get detailed user information
 */
export function useUserDetails(userId: string | null, options?: UseQueryOptions<any | null, ApiError>) {
    return useQuery<any | null, ApiError>({
        queryKey: ['admin', 'users', userId],
        queryFn: async () => {
            if (!userId) return null;
            const response = await apiClient.get<ApiResponse<{ user: any }>>(
                `/admin/users/${userId}`
            );
            return response.data.data.user;
        },
        enabled: !!userId,
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}
