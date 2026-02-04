/**
 * Carrier Service - REFACTORED (Phase 0.3)
 * 
 * Changes from original:
 * - Removed hardcoded CARRIERS array
 * - Use DynamicPricingService for Velocity (real rates from RateCard)
 * - Use stub adapters for Delhivery/Ekart/India Post (comparison only)
 * - All rates now database-driven or stub-based
 */

import mongoose from 'mongoose';
import { DynamicPricingService } from '../pricing/dynamic-pricing.service';
import { getDelhiveryStub } from '../../../../infrastructure/external/couriers/delhivery/delhivery-stub.adapter';
import { getEkartStub } from '../../../../infrastructure/external/couriers/ekart/ekart-stub.adapter';
import { getIndiaPostStub } from '../../../../infrastructure/external/couriers/india-post/india-post-stub.adapter';
import { CourierFactory } from '../courier/courier.factory';

export interface CarrierOption {
    carrier: string;
    rate: number;
    deliveryTime: number;
    score: number;
    serviceType: string;
    isStub?: boolean; // True for stub adapters
    message?: string; // Warning message for stubs
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
    fromPincode: string;
    toPincode: string;
    weight: number;
    paymentMode: 'cod' | 'prepaid';
    orderValue?: number;
    serviceType?: 'standard' | 'express';
    strict?: boolean;
}

export class CarrierService {
    private pricingService: DynamicPricingService;
    private delhiveryStub = getDelhiveryStub();
    private ekartStub = getEkartStub();
    private indiaPostStub = getIndiaPostStub();

    constructor() {
        this.pricingService = new DynamicPricingService();
    }

    /**
     * Get rates from all carriers (Velocity + Stubs)
     * 
     * Returns:
     * - Velocity: Real rates from RateCard database
     * - Delhivery/Ekart/India Post: Stub rates for comparison
     */
    async getAllRates(input: GetRatesInput): Promise<CarrierOption[]> {
        const serviceType = input.serviceType || 'standard';
        const carriers: CarrierOption[] = [];

        try {
            // 1. Velocity - Real rates from DynamicPricingService
            const velocityPricing = await this.pricingService.calculatePricing({
                companyId: input.companyId,
                fromPincode: input.fromPincode,
                toPincode: input.toPincode,
                weight: input.weight,
                paymentMode: input.paymentMode,
                orderValue: input.orderValue,
                carrier: 'velocity',
                serviceType,
                strict: input.strict
            });

            carriers.push({
                carrier: 'velocity',
                rate: velocityPricing.total,
                deliveryTime: this.estimateDeliveryDays(velocityPricing.metadata.zone, serviceType),
                score: 100, // Velocity is preferred (only real integration)
                serviceType,
                isStub: false,
            });
        } catch (error) {
            console.error('[CarrierService] Velocity rates failed:', error);
        }

        try {
            // 2. Delhivery - Live if integration active, otherwise stub
            const companyObjectId = new mongoose.Types.ObjectId(input.companyId);
            const isActive = await CourierFactory.isProviderAvailable(
                'delhivery',
                companyObjectId
            );

            if (isActive) {
                const provider = await CourierFactory.getProvider(
                    'delhivery',
                    companyObjectId
                );

                const rates = await provider.getRates({
                    origin: { pincode: input.fromPincode },
                    destination: { pincode: input.toPincode },
                    package: {
                        weight: input.weight,
                        length: 20,
                        width: 15,
                        height: 10
                    },
                    paymentMode: input.paymentMode,
                    orderValue: input.orderValue
                });

                if (rates && rates.length > 0) {
                    carriers.push({
                        carrier: 'delhivery',
                        rate: rates[0].total,
                        deliveryTime: rates[0].estimatedDeliveryDays || 3,
                        score: 80,
                        serviceType,
                        isStub: false
                    });
                }
            } else {
                const delhiveryRate = await this.delhiveryStub.getRates(
                    input.fromPincode,
                    input.toPincode,
                    input.weight,
                    serviceType
                );

                carriers.push({
                    carrier: 'delhivery',
                    rate: delhiveryRate.total,
                    deliveryTime: delhiveryRate.estimatedDays,
                    score: 70, // Lower score - stub only
                    serviceType,
                    isStub: true,
                    message: delhiveryRate.message,
                });
            }
        } catch (error) {
            console.error('[CarrierService] Delhivery stub failed:', error);
        }

        try {
            // 3. Ekart - Stub rates
            const ekartRate = await this.ekartStub.getRates(
                input.fromPincode,
                input.toPincode,
                input.weight,
                serviceType
            );

            carriers.push({
                carrier: 'ekart',
                rate: ekartRate.total,
                deliveryTime: ekartRate.estimatedDays,
                score: 65,
                serviceType,
                isStub: true,
                message: ekartRate.message,
            });
        } catch (error) {
            console.error('[CarrierService] Ekart stub failed:', error);
        }

        try {
            // 4. India Post - Stub rates
            const indiaPostRate = await this.indiaPostStub.getRates(
                input.fromPincode,
                input.toPincode,
                input.weight,
                serviceType
            );

            carriers.push({
                carrier: 'india_post',
                rate: indiaPostRate.total,
                deliveryTime: indiaPostRate.estimatedDays,
                score: 60,
                serviceType,
                isStub: true,
                message: indiaPostRate.message,
            });
        } catch (error) {
            console.error('[CarrierService] India Post stub failed:', error);
        }

        // Sort by rate (cheapest first)
        return carriers.sort((a, b) => a.rate - b.rate);
    }

    /**
     * Select best carrier (Velocity preferred)
     */
    async selectBestCarrier(input: GetRatesInput, strict: boolean = false): Promise<CarrierSelectionResult> {
        // Pass strict flag to getAllRates if provided separately or rely on input properties
        const ratesInput: GetRatesInput = { ...input, strict: input.strict || strict };
        const allRates = await this.getAllRates(ratesInput);

        if (allRates.length === 0) {
            throw new Error('No carriers available for this route');
        }

        // Always prefer Velocity (only real integration)
        const velocity = allRates.find(c => c.carrier === 'velocity');
        if (velocity) {
            return {
                selectedCarrier: velocity.carrier,
                selectedRate: velocity.rate,
                selectedDeliveryTime: velocity.deliveryTime,
                selectedServiceType: velocity.serviceType,
                alternativeOptions: allRates.filter(c => c.carrier !== 'velocity'),
            };
        }

        // Fallback: cheapest carrier (but it's a stub!)
        const cheapest = allRates[0];
        return {
            selectedCarrier: cheapest.carrier,
            selectedRate: cheapest.rate,
            selectedDeliveryTime: cheapest.deliveryTime,
            selectedServiceType: cheapest.serviceType,
            alternativeOptions: allRates.slice(1),
        };
    }

    /**
     * Estimate delivery days based on zone
     */
    private estimateDeliveryDays(zone: string, serviceType: string): number {
        const deliveryMap: Record<string, { standard: number; express: number }> = {
            zoneA: { standard: 1, express: 1 },
            zoneB: { standard: 2, express: 1 },
            zoneC: { standard: 3, express: 2 },
            zoneD: { standard: 4, express: 2 },
            zoneE: { standard: 6, express: 4 },
        };

        return deliveryMap[zone]?.[serviceType as 'standard' | 'express'] || 5;
    }
}

// Singleton instance
let carrierServiceInstance: CarrierService | null = null;

export function getCarrierService(): CarrierService {
    if (!carrierServiceInstance) {
        carrierServiceInstance = new CarrierService();
    }
    return carrierServiceInstance;
}

// Default export for convenience
export default {
    CarrierService,
    getCarrierService,
};
