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

/**
 * Tracking API Service
 * Handles public shipment tracking functionality
 * Class-based pattern for consistency and maintainability
 */
class TrackingApiService {
    /**
     * Track a shipment by AWB/Tracking Number (Public)
     */
    async trackShipment(trackingNumber: string): Promise<PublicTrackingResponse> {
        const response = await apiClient.get<{ data: PublicTrackingResponse }>(
            `/shipments/public/track/${trackingNumber}`
        );
        return response.data.data;
    }
}

/**
 * Singleton instance
 */
export const trackingApi = new TrackingApiService();

export default trackingApi;
