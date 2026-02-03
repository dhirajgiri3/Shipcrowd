/**
 * Rates API Service
 * Handles rate calculations for B2B, B2C, and Multi-carrier comparisons.
 */

import { apiClient } from '@/src/core/api/http';

// Types
export interface RateCalculationPayload {
    originPincode: string;
    destinationPincode: string;
    weight: number;
    length?: number;
    width?: number;
    height?: number;
    paymentMode?: 'prepaid' | 'cod';
    orderValue?: number;
    isB2B?: boolean;
    quantity?: number; // For B2B bulk
    strict?: boolean;
}

export interface RateBreakdown {
    base: number;
    weightCharge: number;
    zoneCharge: number;
    codCharge?: number;
    fuelSurcharge?: number;
    docketCharge?: number; // B2B specific
    handlingCharge?: number; // B2B specific
    tax: number;
}

export interface PricingResolution {
    matchedRefId: string;
    matchType: 'EXACT' | 'CARRIER_DEFAULT' | 'GENERIC';
    matchedCarrier: string; // Changed from appliedCarrier to match backend
    matchedServiceType: string; // Changed from appliedService to match backend
}

export interface CourierRate {
    courier: string;
    courierName: string;
    courierLogo?: string;
    serviceType: string;
    rate: number;
    breakdown: RateBreakdown;
    eta: {
        minDays: number;
        maxDays: number;
        text: string;
    };
    zone: string;
    rating?: number;
    recommended?: boolean;
    features?: string[];
    pricingResolution?: PricingResolution;
}

export interface RateResponse {
    rates: CourierRate[];
    cheapest: CourierRate;
    fastest: CourierRate;
    bestValue?: CourierRate;
}

export interface ServiceabilityResponse {
    serviceable: boolean;
    city?: string;
    state?: string;
    tier?: string;
    prepaid: boolean;
    cod: boolean;
    couriers?: string[]; // List of serviceable couriers
}

export interface SmartRateInput {
    originPincode: string;
    destinationPincode: string;
    weight: number;
    dimensions?: {
        length: number;
        width: number;
        height: number;
    };
    paymentMode: 'prepaid' | 'cod';
    orderValue: number;
    preferredCarriers?: string[];
    excludedCarriers?: string[];
    scoringWeights?: {
        price: number;
        speed: number;
        reliability: number;
        performance: number;
    };
    strict?: boolean;
}

export interface CourierRateOption {
    courierId: string;
    courierName: string;
    serviceType: string;
    baseRate: number;
    weightCharge: number;
    zoneCharge: number;
    codCharge: number;
    gstAmount: number;
    totalAmount: number;
    estimatedDeliveryDays: number;
    estimatedDeliveryDate: string;
    zone: string;
    pickupSuccessRate: number;
    deliverySuccessRate: number;
    rtoRate: number;
    onTimeDeliveryRate: number;
    rating: number;
    scores: {
        priceScore: number;
        speedScore: number;
        reliabilityScore: number;
        performanceScore: number;
        overallScore: number;
    };
    tags: Array<'CHEAPEST' | 'FASTEST' | 'BEST_RATED' | 'RECOMMENDED'>;
    serviceable: boolean;
    failureReason?: string;
    pricingResolution?: PricingResolution;
}

export interface SmartRateResponse {
    recommendation: string;
    totalOptions: number;
    rates: CourierRateOption[];
    metadata: {
        calculatedAt: string;
        scoringWeights: {
            price: number;
            speed: number;
            reliability: number;
            performance: number;
        };
    };
}

class RatesApiService {
    /**
     * Calculate Rates provided shipment details
     * Supports both B2C and B2B via `isB2B` flag in payload
     */
    async calculateRates(payload: RateCalculationPayload): Promise<RateResponse> {
        const endpoint = payload.isB2B ? '/rates/calculate-b2b' : '/rates/calculate';
        const response = await apiClient.post<RateResponse>(endpoint, payload);
        return response.data;
    }

    /**
     * Check serviceability for a pincode
     */
    async checkServiceability(pincode: string): Promise<ServiceabilityResponse> {
        const response = await apiClient.get<ServiceabilityResponse>(`/rates/serviceability/${pincode}`);
        return response.data;
    }

    /**
     * Calculate Smart Rates with AI scoring
     */
    async smartCalculate(payload: SmartRateInput): Promise<SmartRateResponse> {
        const response = await apiClient.post<{ success: boolean; data: SmartRateResponse }>('/ratecards/smart-calculate', payload);
        return response.data.data;
    }
}

export const ratesApi = new RatesApiService();
export default ratesApi;
