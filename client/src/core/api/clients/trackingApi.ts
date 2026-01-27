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
}

export interface NormalizedTrackingData {
    awb: string;
    status: string;
    estimatedDelivery: string;
    origin: string;
    destination: string;
    courier: string;
    history: NormalizedTrackingEvent[];
}


export const trackingApi = {
    /**
     * Get tracking information by AWB or Order ID
     */
    getTrackingInfo: async (awb: string): Promise<NormalizedTrackingData> => {
        // Assuming the backend endpoint is /shipments/track/{awb}
        const response = await apiClient.get<any>(`/shipments/track/${awb}`);

        const data = response.data?.data || response.data;

        // Mapping logic (adjust according to actual API response structure)
        const history = (data.activities || []).map((activity: any, index: number) => ({
            status: activity.status || activity.activity,
            location: activity.location,
            timestamp: activity.date || activity.timestamp,
            completed: true, // simplified
            current: index === 0 // assuming sorted desc
        }));

        return {
            awb: data.awb || awb,
            status: data.current_status || 'Unknown',
            estimatedDelivery: data.expected_date || 'N/A',
            origin: data.origin || 'N/A',
            destination: data.destination || 'N/A',
            courier: data.courier_name || 'N/A',
            history: history
        };
    }
};
