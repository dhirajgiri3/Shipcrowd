import { apiClient } from '../client';
import { ApiResponse, Shipment, PaginatedResponse } from '@/src/types';

export interface CreateShipmentData {
    orderId: string;
    carrierId: string;
    origin: {
        line1: string;
        line2?: string;
        city: string;
        state: string;
        pincode: string;
        country: string;
    };
    destination: {
        line1: string;
        line2?: string;
        city: string;
        state: string;
        pincode: string;
        country: string;
    };
    package: {
        weight: number;
        dimensions: {
            length: number;
            width: number;
            height: number;
        };
        description?: string;
        declaredValue?: number;
    };
}

export interface ShipmentFilters {
    status?: string;
    carrier?: string;
    page?: number;
    limit?: number;
}

export const shipmentService = {
    /**
     * Get all shipments with optional filters
     */
    async getShipments(filters?: ShipmentFilters): Promise<ApiResponse<PaginatedResponse<Shipment>>> {
        const params = new URLSearchParams(filters as any);
        return apiClient.get(`/shipments?${params}`);
    },

    /**
     * Get shipment by ID
     */
    async getShipment(id: string): Promise<ApiResponse<Shipment>> {
        return apiClient.get(`/shipments/${id}`);
    },

    /**
     * Create new shipment
     */
    async createShipment(data: CreateShipmentData): Promise<ApiResponse<Shipment>> {
        return apiClient.post('/shipments', data);
    },

    /**
     * Track shipment by tracking number
     */
    async trackShipment(trackingNumber: string): Promise<ApiResponse<Shipment>> {
        return apiClient.get(`/shipments/track/${trackingNumber}`);
    },

    /**
     * Cancel shipment
     */
    async cancelShipment(id: string): Promise<ApiResponse<Shipment>> {
        return apiClient.post(`/shipments/${id}/cancel`);
    },

    /**
     * Download shipment label
     */
    async downloadLabel(id: string): Promise<Blob> {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/shipments/${id}/label`, {
            credentials: 'include',
        });
        return response.blob();
    },
};
