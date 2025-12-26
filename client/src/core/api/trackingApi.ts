import { apiClient, ApiError } from './client';

export interface TrackingTimelineEvent {
    status: string;
    timestamp: string;
    location?: string;
    description: string;
}

export interface PublicTrackingResponse {
    trackingNumber: string;
    carrier: string;
    serviceType: string;
    currentStatus: string;
    estimatedDelivery?: string;
    actualDelivery?: string;
    createdAt: string;
    recipient: {
        city: string;
        state: string;
    };
    timeline: TrackingTimelineEvent[];
}

export const trackingApi = {
    /**
     * Track a shipment by AWB/Tracking Number (Public)
     */
    trackShipment: async (trackingNumber: string): Promise<PublicTrackingResponse> => {
        const response = await apiClient.get<{ data: PublicTrackingResponse }>(
            `/shipments/public/track/${trackingNumber}`
        );
        return response.data.data;
    },
};
