/**
 * Rates API Service
 * Handles rate calculations for B2B, B2C, and Multi-carrier comparisons.
 */

import { apiClient } from '../http';

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
}

export const ratesApi = new RatesApiService();
export default ratesApi;
