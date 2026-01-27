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

export interface TrackingActivity {
    date: string;
    status: string;
    activity: string;
    location: string;
    'sr-status': string;
    'sr-status-label': string;
}

export interface TrackingInfo {
    track_status: number;
    shipment_status: number;
    shipment_track: Array<{
        id: number;
        awb_code: string;
        courier_shipment_id: string;
        shipment_id: number;
        status: string;
        added_on: string;
        delivered_date: string;
        expected_date: string;
        current_status: string;
        courier_name: string;
        order_id: string;
        qc_status?: string; // Added to handle qc_response if needed
    }>;
    shipment_track_activities: Array<TrackingActivity>;
    track_url: string;
    qc_response?: any;
}

export interface NormalizedTrackingEvent {
    status: string;
    location: string;
    timestamp: string;
    completed: boolean;
    current: boolean;
    description?: string;
}

export interface RecipientInfo {
    name?: string;
    city: string;
    state: string;
}

export interface NormalizedTrackingData {
    awb: string;
    trackingNumber: string;
    currentStatus: string;
    status: string; // Keep for backward compatibility if needed, mirror currentStatus
    createdAt?: string;
    estimatedDelivery: string;
    actualDelivery?: string;
    origin: string;
    destination: string;
    recipient: RecipientInfo;
    carrier: string;
    courier: string; // Alias for backward compatibility
    serviceType: string;
    timeline: NormalizedTrackingEvent[];
    history: NormalizedTrackingEvent[]; // Alias for backward compatibility
}

export type PublicTrackingResponse = NormalizedTrackingData;

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
    },

    /**
     * Get tracking information by AWB or Order ID
     */
    trackShipment: async (awb: string): Promise<NormalizedTrackingData> => {
        // Backend route: /api/v1/shipments/public/track/{awb}
        const response = await apiClient.get<any>(`/shipments/public/track/${awb}`);

        const data = response.data?.data || response.data;

        // Mapping logic (adjust according to actual API response structure)
        const timeline = (data.activities || []).map((activity: any, index: number) => ({
            status: activity.status || activity.activity,
            location: activity.location,
            timestamp: activity.date || activity.timestamp,
            description: activity.description,
            completed: true, // simplified
            current: index === 0 // assuming sorted desc
        }));

        return {
            awb: data.awb || awb,
            trackingNumber: data.awb || awb,
            currentStatus: data.current_status || 'Unknown',
            status: data.current_status || 'Unknown',
            estimatedDelivery: data.expected_date || 'N/A',
            actualDelivery: data.delivered_date,
            origin: data.origin || 'N/A',
            destination: data.destination || 'N/A',
            recipient: {
                name: data.consignee_name,
                city: data.destination, // Approximation if city not separate
                state: ''
            },
            carrier: data.courier_name || 'N/A',
            courier: data.courier_name || 'N/A',
            serviceType: data.service_type || 'Standard',
            timeline: timeline,
            history: timeline
        };
    },

    // Alias for backward compatibility if used elsewhere
    getTrackingInfo: async (awb: string): Promise<NormalizedTrackingData> => {
        return shipmentApi.trackShipment(awb);
    }
};
