/**
 * Shipment API Layer
 * Handles shipment-specific operations like tracking and label generation
 */

import { apiClient } from '../http';

export interface ShipmentDetails {
    awbNumber: string;
    orderId: string;
    courier: string;
    service: string;
    weight: string;
    dimensions: string;
    paymentMode: 'COD' | 'Prepaid';
    codAmount: number;
    createdAt: string;
    shipperDetails: {
        name: string;
        address: string;
        city: string;
        state: string;
        pincode: string;
        phone: string;
    };
    consigneeDetails: {
        name: string;
        address: string;
        city: string;
        state: string;
        pincode: string;
        phone: string;
    };
    productDetails: {
        name: string;
        sku: string;
        quantity: number;
    };
}

export const shipmentApi = {
    /**
     * Get shipment details by AWB
     */
    getShipmentByAwb: async (awb: string): Promise<ShipmentDetails> => {
        // Encode the AWB to ensure special characters don't break the URL
        const response = await apiClient.get<ShipmentDetails>(`/shipments/awb/${encodeURIComponent(awb)}`);
        return response.data;
    },

    /**
     * Generate label for a shipment
     * Returns: Label HTML content or URL
     */
    generateLabel: async (awb: string): Promise<{ labelUrl: string; htmlContent?: string }> => {
        const response = await apiClient.post(`/shipments/${encodeURIComponent(awb)}/label`);
        return response.data;
    }
};
