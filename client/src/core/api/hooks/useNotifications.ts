/**
 * Notifications Hooks
 * Hooks for managing user notifications
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi, NotificationFilters } from '@/src/core/api/clients/general/notificationsApi';
import { queryKeys } from '../config/query-keys';
import { RETRY_CONFIG } from '../config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';
import { ApiError } from '../http';

/**
 * Hook to fetch notifications
 * Polls every 30 seconds for new notifications
 */
export const useNotifications = (filters?: NotificationFilters) => {
    return useQuery({
        queryKey: ['notifications', filters],
        queryFn: () => notificationsApi.getNotifications(filters),
        staleTime: 20000, // 20 seconds
        refetchInterval: 30000, // Poll every 30 seconds
        retry: RETRY_CONFIG.NO_RETRY,
    });
};

/**
 * Hook to get unread notification count
 */
export const useUnreadCount = () => {
    return useQuery({
        queryKey: ['notifications', 'unread-count'],
        queryFn: () => notificationsApi.getUnreadCount(),
        staleTime: 10000, // 10 seconds
        refetchInterval: 30000, // Poll every 30 seconds
        retry: RETRY_CONFIG.NO_RETRY,
    });
};

/**
 * Hook to mark notification as read
 */
export const useMarkNotificationRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (notificationId: string) => notificationsApi.markRead(notificationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
        onError: (error: ApiError) => {
            handleApiError(error, 'Failed to mark notification as read');
        },
    });
};

/**
 * Hook to mark all notifications as read
 */
export const useMarkAllRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => notificationsApi.markAllRead(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            showSuccessToast('All notifications marked as read');
        },
        onError: (error: ApiError) => {
            handleApiError(error, 'Failed to mark all as read');
        },
    });
};

/**
 * Hook to delete notification
 */
export const useDeleteNotification = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (notificationId: string) => notificationsApi.deleteNotification(notificationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
        onError: (error: ApiError) => {
            handleApiError(error, 'Failed to delete notification');
        },
    });
};
