/**
 * Communication Notifications API Hooks
 *
 * React Query hooks for email, SMS, WhatsApp and in-app notifications
 * Backend: POST /api/v1/communication/*
 */

import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../client';
import { queryKeys } from '../../config/query-keys';
import { handleApiError, showSuccessToast } from '@/src/lib/error';

export interface EmailNotificationPayload {
    recipient: string;
    subject: string;
    template?: string;
    data?: Record<string, any>;
    attachments?: Array<{
        filename: string;
        url: string;
    }>;
}

export interface SMSNotificationPayload {
    phoneNumber: string;
    message: string;
    priority?: 'high' | 'normal' | 'low';
}

export interface WhatsAppNotificationPayload {
    phoneNumber: string;
    template?: string;
    message?: string;
    data?: Record<string, any>;
}

export interface ShipmentStatusNotificationPayload {
    shipmentId: string;
    notificationChannels: ('email' | 'sms' | 'whatsapp')[];
    includeTrackingLink?: boolean;
}

export interface NotificationResponse {
    success: boolean;
    notificationId: string;
    status: string;
    message?: string;
}

/**
 * Send email notification
 * POST /communication/notification/email
 */
export const useSendEmailNotification = (options?: UseMutationOptions<NotificationResponse, ApiError, EmailNotificationPayload>) => {
    return useMutation<NotificationResponse, ApiError, EmailNotificationPayload>({
        mutationFn: async (payload: EmailNotificationPayload) => {
            const response = await apiClient.post<{ data: NotificationResponse }>(
                '/communication/notification/email',
                payload
            );
            return response.data.data;
        },
        onSuccess: () => {
            showSuccessToast('Email sent successfully');
        },
        onError: (error) => handleApiError(error),
        ...options,
    });
};

/**
 * Send SMS notification
 * POST /communication/notification/sms
 */
export const useSendSMSNotification = (options?: UseMutationOptions<NotificationResponse, ApiError, SMSNotificationPayload>) => {
    return useMutation<NotificationResponse, ApiError, SMSNotificationPayload>({
        mutationFn: async (payload: SMSNotificationPayload) => {
            const response = await apiClient.post<{ data: NotificationResponse }>(
                '/communication/notification/sms',
                payload
            );
            return response.data.data;
        },
        onSuccess: () => {
            showSuccessToast('SMS sent successfully');
        },
        onError: (error) => handleApiError(error),
        ...options,
    });
};

/**
 * Send WhatsApp notification
 * POST /communication/whatsapp/message
 */
export const useSendWhatsAppNotification = (options?: UseMutationOptions<NotificationResponse, ApiError, WhatsAppNotificationPayload>) => {
    return useMutation<NotificationResponse, ApiError, WhatsAppNotificationPayload>({
        mutationFn: async (payload: WhatsAppNotificationPayload) => {
            const response = await apiClient.post<{ data: NotificationResponse }>(
                '/communication/whatsapp/message',
                payload
            );
            return response.data.data;
        },
        onSuccess: () => {
            showSuccessToast('WhatsApp message sent successfully');
        },
        onError: (error) => handleApiError(error),
        ...options,
    });
};

/**
 * Send shipment status notification to customer
 * POST /communication/notification/shipment-status
 */
export const useSendShipmentStatusNotification = (options?: UseMutationOptions<NotificationResponse, ApiError, ShipmentStatusNotificationPayload>) => {
    const queryClient = useQueryClient();

    return useMutation<NotificationResponse, ApiError, ShipmentStatusNotificationPayload>({
        mutationFn: async (payload: ShipmentStatusNotificationPayload) => {
            const response = await apiClient.post<{ data: NotificationResponse }>(
                '/communication/notification/shipment-status',
                payload
            );
            return response.data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.shipments.all() });
            showSuccessToast('Shipment status notification sent successfully');
        },
        onError: (error) => handleApiError(error),
        ...options,
    });
};

/**
 * Notify about NDR event
 * POST /ndr-communication/:id/notify
 */
export const useSendNDRNotification = (options?: UseMutationOptions<NotificationResponse, ApiError, { ndrId: string; payload: any }>) => {
    const queryClient = useQueryClient();

    return useMutation<NotificationResponse, ApiError, { ndrId: string; payload: any }>({
        mutationFn: async ({ ndrId, payload }: { ndrId: string; payload: any }) => {
            const response = await apiClient.post<{ data: NotificationResponse }>(
                `/ndr-communication/${ndrId}/notify`,
                payload
            );
            return response.data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.ndr.all() });
            showSuccessToast('NDR notification sent successfully');
        },
        onError: (error) => handleApiError(error),
        ...options,
    });
};
