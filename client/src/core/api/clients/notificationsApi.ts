/**
 * Notifications API Service
 * Handles user notifications and real-time updates
 */

import { apiClient } from '../http';

// Types
export interface Notification {
    id: string;
    type: 'order' | 'shipment' | 'payment' | 'system' | 'alert';
    title: string;
    message: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    read: boolean;
    actionUrl?: string;
    actionLabel?: string;
    metadata?: Record<string, any>;
    createdAt: string;
}

export interface NotificationsResponse {
    notifications: Notification[];
    unreadCount: number;
    total: number;
    page: number;
    limit: number;
}

export interface NotificationFilters {
    page?: number;
    limit?: number;
    read?: boolean;
    type?: string;
}

class NotificationsApiService {
    /**
     * Get user notifications
     */
    async getNotifications(filters?: NotificationFilters): Promise<NotificationsResponse> {
        const response = await apiClient.get('/notifications', { params: filters });
        return response.data;
    }

    /**
     * Mark notification as read
     */
    async markRead(notificationId: string): Promise<void> {
        await apiClient.post(`/notifications/${notificationId}/read`);
    }

    /**
     * Mark all notifications as read
     */
    async markAllRead(): Promise<void> {
        await apiClient.post('/notifications/mark-all-read');
    }

    /**
     * Delete notification
     */
    async deleteNotification(notificationId: string): Promise<void> {
        await apiClient.delete(`/notifications/${notificationId}`);
    }

    /**
     * Get unread count
     */
    async getUnreadCount(): Promise<number> {
        const response = await apiClient.get('/notifications/unread-count');
        return response.data.count;
    }
}

export const notificationsApi = new NotificationsApiService();
export default notificationsApi;
