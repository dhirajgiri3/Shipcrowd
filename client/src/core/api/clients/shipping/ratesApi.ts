/**
 * Rates API Service
 * Handles rate calculations for B2B, B2C, and Multi-carrier comparisons.
 */

import { apiClient } from '@/src/core/api/http';
import { orderApi } from '@/src/core/api/clients/orders/orderApi';

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
        const quoteResponse = await orderApi.getCourierRates({
            fromPincode: payload.originPincode,
            toPincode: payload.destinationPincode,
            weight: payload.weight,
            paymentMode: payload.paymentMode,
            orderValue: payload.orderValue,
            length: payload.length,
            width: payload.width,
            height: payload.height,
        });

        const rates: CourierRate[] = quoteResponse.data.map((rate) => ({
            courier: rate.provider || rate.courierId,
            courierName: rate.courierName,
            serviceType: rate.serviceType,
            rate: rate.rate,
            breakdown: {
                base: rate.sellBreakdown?.baseCharge || 0,
                weightCharge: rate.sellBreakdown?.weightCharge || 0,
                zoneCharge: 0,
                codCharge: rate.sellBreakdown?.codCharge,
                fuelSurcharge: rate.sellBreakdown?.fuelCharge,
                tax: rate.sellBreakdown?.gst || 0,
            },
            eta: {
                minDays: rate.estimatedDeliveryDays || 0,
                maxDays: rate.estimatedDeliveryDays || 0,
                text: `${rate.estimatedDeliveryDays || 0} days`,
            },
            zone: rate.zone || '',
            recommended: rate.isRecommended,
            features: rate.tags,
        }));

        const sortedByPrice = [...rates].sort((a, b) => a.rate - b.rate);
        const sortedByEta = [...rates].sort((a, b) => a.eta.maxDays - b.eta.maxDays);

        return {
            rates,
            cheapest: sortedByPrice[0] || ({} as CourierRate),
            fastest: sortedByEta[0] || ({} as CourierRate),
            bestValue: sortedByPrice[0],
        };
    }

    /**
     * Check serviceability for a pincode
     */
    async checkServiceability(pincode: string): Promise<ServiceabilityResponse> {
        const response = await apiClient.get<{ data: { city: string; state: string; pincode: string } }>(
            `/serviceability/pincode/${pincode}/info`
        );
        return {
            serviceable: true,
            city: response.data.data?.city,
            state: response.data.data?.state,
            prepaid: true,
            cod: true,
            couriers: [],
        };
    }

    /**
     * Calculate Smart Rates with AI scoring
     */
    async smartCalculate(payload: SmartRateInput): Promise<SmartRateResponse> {
        const quoteResponse = await orderApi.getCourierRates({
            fromPincode: payload.originPincode,
            toPincode: payload.destinationPincode,
            weight: payload.weight,
            paymentMode: payload.paymentMode,
            orderValue: payload.orderValue,
            length: payload.dimensions?.length,
            width: payload.dimensions?.width,
            height: payload.dimensions?.height,
        });

        const rates: CourierRateOption[] = quoteResponse.data.map((rate) => ({
            courierId: rate.courierId,
            courierName: rate.courierName,
            serviceType: rate.serviceType,
            baseRate: rate.sellBreakdown?.baseCharge || 0,
            weightCharge: rate.sellBreakdown?.weightCharge || 0,
            zoneCharge: 0,
            codCharge: rate.sellBreakdown?.codCharge || 0,
            gstAmount: rate.sellBreakdown?.gst || 0,
            totalAmount: rate.rate,
            estimatedDeliveryDays: rate.estimatedDeliveryDays || 0,
            estimatedDeliveryDate: '',
            zone: rate.zone || '',
            pickupSuccessRate: 0,
            deliverySuccessRate: 0,
            rtoRate: 0,
            onTimeDeliveryRate: 0,
            rating: 0,
            scores: {
                priceScore: 0,
                speedScore: 0,
                reliabilityScore: 0,
                performanceScore: 0,
                overallScore: 0,
            },
            tags: (rate.tags || []) as CourierRateOption['tags'],
            serviceable: true,
        }));

        return {
            recommendation: quoteResponse.data.find((rate) => rate.isRecommended)?.courierName || rates[0]?.courierName || '',
            totalOptions: rates.length,
            rates,
            metadata: {
                calculatedAt: new Date().toISOString(),
                scoringWeights: payload.scoringWeights || {
                    price: 40,
                    speed: 30,
                    reliability: 15,
                    performance: 15,
                },
            },
        };
    }
}

export const ratesApi = new RatesApiService();
export default ratesApi;
