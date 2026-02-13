/**
 * Rates API Service
 * Handles rate calculations for B2B, B2C, and Multi-carrier comparisons.
 */

import { apiClient } from '@/src/core/api/http';
import { orderApi } from '@/src/core/api/clients/orders/orderApi';
import { applyScoring, computeEstimatedDeliveryDate, DEFAULT_SCORING_WEIGHTS } from './smartScoringEngine';

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
    subtotal: number;
    codCharge?: number;
    fuelSurcharge?: number;
    rtoCharge?: number;
    tax: number;
    total: number;
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
    codCharge: number;
    fuelCharge: number;
    rtoCharge: number;
    gstAmount: number;
    totalAmount: number;
    estimatedDeliveryDays: number;
    estimatedDeliveryDate: string;
    zone: string;
    chargeableWeight: number;
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
    confidence?: 'high' | 'medium' | 'low';
    pricingSource?: 'live' | 'table' | 'hybrid';
    optionId?: string;
    sessionId?: string;
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
                subtotal: (rate.sellBreakdown?.baseCharge || 0) + (rate.sellBreakdown?.weightCharge || 0),
                codCharge: rate.sellBreakdown?.codCharge,
                fuelSurcharge: rate.sellBreakdown?.fuelCharge,
                tax: rate.sellBreakdown?.gst || 0,
                total: rate.rate,
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
        try {
            const response = await apiClient.get<{ data: { city: string; state: string; pincode: string } }>(
                `/serviceability/pincode/${pincode}/info`
            );

            const data = response.data.data;

            // If we got valid data, pincode is serviceable
            const serviceable = Boolean(data?.city && data?.state);

            return {
                serviceable,
                city: data?.city,
                state: data?.state,
                prepaid: serviceable, // All valid pincodes support prepaid
                cod: serviceable, // Assume COD available if serviceable
                couriers: [], // No courier-specific data from this endpoint
            };
        } catch (error) {
            // If API fails, pincode is likely invalid or not serviceable
            return {
                serviceable: false,
                prepaid: false,
                cod: false,
                couriers: [],
            };
        }
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

        // Apply real AI scoring using the scoring engine
        const scoringWeights = payload.scoringWeights || DEFAULT_SCORING_WEIGHTS;
        const scoredRates = applyScoring(quoteResponse.data, scoringWeights);

        // Map to CourierRateOption with all fields populated
        const rates: CourierRateOption[] = scoredRates.map((rate) => ({
            courierId: rate.courierId,
            courierName: rate.courierName,
            serviceType: rate.serviceType,
            baseRate: rate.sellBreakdown?.baseCharge || 0,
            weightCharge: rate.sellBreakdown?.weightCharge || 0,
            codCharge: rate.sellBreakdown?.codCharge || 0,
            fuelCharge: rate.sellBreakdown?.fuelCharge || 0,
            rtoCharge: rate.sellBreakdown?.rtoCharge || 0,
            gstAmount: rate.sellBreakdown?.gst || 0,
            totalAmount: rate.rate,
            estimatedDeliveryDays: rate.estimatedDeliveryDays || 0,
            estimatedDeliveryDate: computeEstimatedDeliveryDate(rate.estimatedDeliveryDays || 0),
            zone: rate.zone || '',
            chargeableWeight: rate.chargeableWeight || payload.weight,
            pickupSuccessRate: rate.performanceMetrics.pickupSuccessRate,
            deliverySuccessRate: rate.performanceMetrics.deliverySuccessRate,
            rtoRate: rate.performanceMetrics.rtoRate,
            onTimeDeliveryRate: rate.performanceMetrics.onTimeDeliveryRate,
            rating: rate.performanceMetrics.rating,
            scores: rate.scores,
            tags: (rate.tags || []) as CourierRateOption['tags'],
            serviceable: true,
            pricingResolution: rate.pricingSource ? {
                matchedRefId: rate.optionId || '',
                matchType: rate.pricingSource === 'live' ? 'EXACT' as const
                    : rate.pricingSource === 'table' ? 'CARRIER_DEFAULT' as const
                        : 'GENERIC' as const,
                matchedCarrier: rate.provider || rate.courierId,
                matchedServiceType: rate.serviceType,
            } : undefined,
            confidence: rate.confidence,
            pricingSource: rate.pricingSource,
            optionId: rate.optionId,
            sessionId: rate.sessionId,
        }));

        // Find the recommended option (already sorted by overallScore)
        const recommendedOption = rates.find(r => r.tags.includes('RECOMMENDED')) || rates[0];

        return {
            recommendation: recommendedOption?.courierName || '',
            totalOptions: rates.length,
            rates,
            metadata: {
                calculatedAt: new Date().toISOString(),
                scoringWeights,
            },
        };
    }
}

export const ratesApi = new RatesApiService();
export default ratesApi;
