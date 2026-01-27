import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../http';
import { handleApiError, showSuccessToast } from '@/src/lib/error';

// Types
export interface WhatsAppMessagePayload {
    recipient: string;
    templateId: string;
    variables?: Record<string, string>;
}

export interface WhatsAppStatusPayload {
    shipmentId: string;
    status: string;
    recipient: string;
}

// Hooks

/**
 * Send generic WhatsApp message
 */
export function useSendWhatsAppMessage(
    options?: UseMutationOptions<void, ApiError, WhatsAppMessagePayload>
) {
    return useMutation<void, ApiError, WhatsAppMessagePayload>({
        mutationFn: async (payload) => {
            await apiClient.post('/whatsapp/message', payload);
        },
        onSuccess: () => {
            showSuccessToast('WhatsApp message sent');
        },
        onError: (error) => handleApiError(error),
        ...options,
    });
}

/**
 * Send shipment status update via WhatsApp
 */
export function useSendShipmentStatus(
    options?: UseMutationOptions<void, ApiError, WhatsAppStatusPayload>
) {
    return useMutation<void, ApiError, WhatsAppStatusPayload>({
        mutationFn: async (payload) => {
            await apiClient.post('/whatsapp/shipment-status', payload);
        },
        onSuccess: () => {
            showSuccessToast('Status update sent via WhatsApp');
        },
        onError: (error) => handleApiError(error),
        ...options,
    });
}

/**
 * Send welcome message via WhatsApp
 */
export function useSendWelcomeMessage(
    options?: UseMutationOptions<void, ApiError, { recipient: string; name: string }>
) {
    return useMutation<void, ApiError, { recipient: string; name: string }>({
        mutationFn: async (payload) => {
            await apiClient.post('/whatsapp/welcome', payload);
        },
        onSuccess: () => {
            showSuccessToast('Welcome message sent via WhatsApp');
        },
        onError: (error) => handleApiError(error),
        ...options,
    });
}

/**
 * Send delivery confirmation via WhatsApp
 */
export function useSendDeliveryConfirmation(
    options?: UseMutationOptions<void, ApiError, { shipmentId: string; recipient: string }>
) {
    return useMutation<void, ApiError, { shipmentId: string; recipient: string }>({
        mutationFn: async (payload) => {
            await apiClient.post('/whatsapp/delivery-confirmation', payload);
        },
        onSuccess: () => {
            showSuccessToast('Delivery confirmation sent via WhatsApp');
        },
        onError: (error) => handleApiError(error),
        ...options,
    });
}
