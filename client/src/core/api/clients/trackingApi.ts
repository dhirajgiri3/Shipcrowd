import { apiClient } from '../http';

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


export const trackingApi = {
    /**
     * Get tracking information by AWB or Order ID
     */
    trackShipment: async (awb: string): Promise<NormalizedTrackingData> => {
        // Assuming the backend endpoint is /shipments/track/{awb}
        const response = await apiClient.get<any>(`/shipments/track/${awb}`);

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
        return trackingApi.trackShipment(awb);
    }
};
