/**
 * Courier Recommendation API Service
 * Handles AI-powered courier recommendations
 */

import { apiClient } from '@/src/core/api/http';

// Types
export interface CourierRecommendationRequest {
    pickupPincode: string;
    deliveryPincode: string;
    weight: number;
    paymentMode: 'cod' | 'prepaid';
    dimensions?: {
        length: number;
        width: number;
        height: number;
    };
    declaredValue?: number;
}

export interface CourierOption {
    id: string;
    name: string;
    logo?: string;
    estimatedDelivery: string;
    price: number;
    rating: number;
    onTimeRate: number;
    recommended: boolean;
    features: string[];
    riskLevel?: 'low' | 'medium' | 'high';
    courierCode?: string;
    serviceType?: string;
}

export interface CourierRecommendationResponse {
    recommendations: CourierOption[];
    metadata: {
        requestedAt: string;
        processingTime: number;
        totalOptions: number;
    };
}

class CourierRecommendationApiService {
    /**
     * Get AI-powered courier recommendations
     */
    async getRecommendations(
        request: CourierRecommendationRequest
    ): Promise<CourierRecommendationResponse> {
        const response = await apiClient.post('/courier/recommendations', request);
        return response.data;
    }

    /**
     * Get courier serviceability check
     */
    async checkServiceability(
        pickupPincode: string,
        deliveryPincode: string
    ): Promise<{ serviceable: boolean; estimatedDays: number; availableCouriers: string[] }> {
        const response = await apiClient.get('/courier/serviceability', {
            params: { pickupPincode, deliveryPincode }
        });
        return response.data;
    }
}

export const courierRecommendationApi = new CourierRecommendationApiService();
export default courierRecommendationApi;
