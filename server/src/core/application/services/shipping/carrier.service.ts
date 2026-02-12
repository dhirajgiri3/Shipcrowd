/**
 * Carrier Service (Service-Level Pricing Native)
 *
 * Uses QuoteEngineService as the single source of truth for carrier options.
 * Falls back to lightweight stub estimates when quote generation fails.
 */

import QuoteEngineService from '../pricing/quote-engine.service';
import { getDelhiveryStub } from '../../../../infrastructure/external/couriers/delhivery/delhivery-stub.adapter';
import { getEkartStub } from '../../../../infrastructure/external/couriers/ekart/ekart-stub.adapter';
import { getIndiaPostStub } from '../../../../infrastructure/external/couriers/india-post/india-post-stub.adapter';

export interface CarrierOption {
    carrier: string;
    rate: number;
    deliveryTime: number;
    score: number;
    serviceType: string;
    isRecommended?: boolean;
    isStub?: boolean;
    message?: string;
    provider?: string;
    optionId?: string;
    serviceId?: string;
    serviceName?: string;
    quoteSessionId?: string;
    quoteExpiresAt?: Date;
    chargeableWeight?: number;
    zone?: string;
    pricingSource?: 'live' | 'table' | 'hybrid';
    confidence?: 'high' | 'medium' | 'low';
    costAmount?: number;
    estimatedMargin?: number;
    estimatedMarginPercent?: number;
    sellBreakdown?: Record<string, unknown>;
    costBreakdown?: Record<string, unknown>;
}

export interface CarrierSelectionResult {
    selectedCarrier: string;
    selectedRate: number;
    selectedDeliveryTime: number;
    selectedServiceType: string;
    alternativeOptions: CarrierOption[];
}

export interface GetRatesInput {
    companyId: string;
    sellerId?: string;
    fromPincode: string;
    toPincode: string;
    weight: number;
    paymentMode: 'cod' | 'prepaid';
    orderValue?: number;
    serviceType?: 'standard' | 'express';
    dimensions?: { length: number; width: number; height: number };
    strict?: boolean;
}

export class CarrierService {
    private delhiveryStub = getDelhiveryStub();
    private ekartStub = getEkartStub();
    private indiaPostStub = getIndiaPostStub();

    async getAllRates(input: GetRatesInput): Promise<CarrierOption[]> {
        const dimensions = input.dimensions || { length: 20, width: 15, height: 10 };

        try {
            const quoteResult = await QuoteEngineService.generateQuotes({
                companyId: input.companyId,
                // Some internal flows do not carry a seller user id; companyId fallback preserves compatibility.
                sellerId: input.sellerId || input.companyId,
                fromPincode: input.fromPincode,
                toPincode: input.toPincode,
                weight: input.weight,
                dimensions,
                paymentMode: input.paymentMode,
                orderValue: Number(input.orderValue || 0),
                shipmentType: 'forward',
            });

            const options: CarrierOption[] = quoteResult.options.map((option) => {
                const normalizedService = String(option.serviceName || '').toLowerCase();
                const serviceType =
                    normalizedService.includes('express') || normalizedService.includes('air')
                        ? 'express'
                        : 'standard';

                return {
                    carrier: option.provider,
                    rate: Number(option.quotedAmount || 0),
                    deliveryTime: Number(option.eta?.maxDays || option.eta?.minDays || 5),
                    score: Number(option.rankScore || 0),
                    serviceType,
                    isRecommended: option.optionId === quoteResult.recommendation,
                    provider: option.provider,
                    optionId: option.optionId,
                    serviceId: option.serviceId ? String(option.serviceId) : undefined,
                    serviceName: option.serviceName,
                    quoteSessionId: quoteResult.sessionId,
                    quoteExpiresAt: quoteResult.expiresAt,
                    chargeableWeight: option.chargeableWeight,
                    zone: option.zone,
                    pricingSource: option.pricingSource,
                    confidence: option.confidence,
                    costAmount: option.costAmount,
                    estimatedMargin: option.estimatedMargin,
                    estimatedMarginPercent: option.estimatedMarginPercent,
                    sellBreakdown: option.sellBreakdown as Record<string, unknown> | undefined,
                    costBreakdown: option.costBreakdown as Record<string, unknown> | undefined,
                };
            });

            if (options.length > 0) {
                return options.sort((a, b) => a.rate - b.rate);
            }
        } catch (error) {
            console.warn('[CarrierService] Service-level quote generation failed, using fallback rates:', error);
        }

        return this.getFallbackRates(input);
    }

    async selectBestCarrier(
        input: GetRatesInput,
        strict: boolean = false
    ): Promise<CarrierSelectionResult> {
        const ratesInput: GetRatesInput = { ...input, strict: input.strict || strict };
        const allRates = await this.getAllRates(ratesInput);

        if (allRates.length === 0) {
            throw new Error('No carriers available for this route');
        }

        let selectedOption = allRates.find((option) => option.isRecommended) || allRates[0];

        if ((input as { carrierOverride?: string }).carrierOverride) {
            const overrideCarrier = String((input as { carrierOverride?: string }).carrierOverride);
            const overrideOption = allRates.find(
                (option) => option.carrier.toLowerCase() === overrideCarrier.toLowerCase()
            );

            if (overrideOption) {
                selectedOption = overrideOption;
            } else if (ratesInput.strict) {
                throw new Error(`Requested carrier '${overrideCarrier}' not available for this route`);
            }
        }

        return {
            selectedCarrier: selectedOption.carrier,
            selectedRate: selectedOption.rate,
            selectedDeliveryTime: selectedOption.deliveryTime,
            selectedServiceType: selectedOption.serviceType,
            // Keep all options so downstream selection can pick explicit override safely.
            alternativeOptions: allRates,
        };
    }

    private async getFallbackRates(input: GetRatesInput): Promise<CarrierOption[]> {
        const serviceType = input.serviceType || 'standard';
        const fallback: CarrierOption[] = [];

        const velocityFallback = Math.max(50, Number(input.weight || 0) * 20);
        fallback.push({
            carrier: 'velocity',
            rate: Number(velocityFallback.toFixed(2)),
            deliveryTime: serviceType === 'express' ? 2 : 4,
            score: 50,
            serviceType,
            isStub: true,
            message: 'Fallback estimated rate (quote engine unavailable)',
        });

        try {
            const delhiveryRate = await this.delhiveryStub.getRates(
                input.fromPincode,
                input.toPincode,
                input.weight,
                serviceType
            );

            fallback.push({
                carrier: 'delhivery',
                rate: delhiveryRate.total,
                deliveryTime: delhiveryRate.estimatedDays,
                score: 45,
                serviceType,
                isStub: true,
                message: delhiveryRate.message,
            });
        } catch (error) {
            console.warn('[CarrierService] Delhivery fallback stub failed:', error);
        }

        try {
            const ekartRate = await this.ekartStub.getRates(
                input.fromPincode,
                input.toPincode,
                input.weight,
                serviceType
            );

            fallback.push({
                carrier: 'ekart',
                rate: ekartRate.total,
                deliveryTime: ekartRate.estimatedDays,
                score: 40,
                serviceType,
                isStub: true,
                message: ekartRate.message,
            });
        } catch (error) {
            console.warn('[CarrierService] Ekart fallback stub failed:', error);
        }

        try {
            const indiaPostRate = await this.indiaPostStub.getRates(
                input.fromPincode,
                input.toPincode,
                input.weight,
                serviceType
            );

            fallback.push({
                carrier: 'india_post',
                rate: indiaPostRate.total,
                deliveryTime: indiaPostRate.estimatedDays,
                score: 35,
                serviceType,
                isStub: true,
                message: indiaPostRate.message,
            });
        } catch (error) {
            console.warn('[CarrierService] India Post fallback stub failed:', error);
        }

        return fallback.sort((a, b) => a.rate - b.rate);
    }
}

let carrierServiceInstance: CarrierService | null = null;

export function getCarrierService(): CarrierService {
    if (!carrierServiceInstance) {
        carrierServiceInstance = new CarrierService();
    }
    return carrierServiceInstance;
}

export default {
    CarrierService,
    getCarrierService,
};
