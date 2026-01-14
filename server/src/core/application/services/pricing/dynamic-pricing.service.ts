import RateCard from '../../../../infrastructure/database/mongoose/models/logistics/shipping/configuration/rate-card.model';
import PincodeLookupService from '../logistics/pincode-lookup.service';
import GSTService from '../finance/gst.service';
import { getCODChargeService } from './cod-charge.service';
import { getPricingCache } from './pricing-cache.service';
import logger from '../../../../shared/logger/winston.logger';

/**
 * Dynamic Pricing Service
 * 
 * Purpose: Calculate accurate shipping costs using:
 * - PincodeLookupService → Zone calculation (A-E)
 * - RateCard → Database rates (not hardcoded)
 * - CODChargeService → 2% or ₹30 minimum
 * - GSTService → CGST/SGST/IGST (18%)
 * - PricingCache → Redis caching for performance
 * 
 * This is the NEW implementation that replaces hardcoded rates.
 */

export interface CalculatePricingInput {
    companyId: string;
    fromPincode: string;
    toPincode: string;
    weight: number; // in kg
    paymentMode: 'cod' | 'prepaid';
    orderValue?: number; // for COD charge calculation
    carrier?: string; // default: 'velocity'
    serviceType?: string; // default: 'standard'
}

export interface PricingBreakdown {
    subtotal: number;
    shipping: number;
    codCharge: number;
    tax: {
        cgst: number;
        sgst: number;
        igst: number;
        total: number;
    };
    discount: number;
    total: number;
    metadata: {
        zone: string;
        rateCardId?: string;
        carrierRate: number;
        zoneMultiplier: number;
        cached: boolean;
    };
}

export class DynamicPricingService {
    private pincodeService: typeof PincodeLookupService;
    private gstService: typeof GSTService;
    private codService: ReturnType<typeof getCODChargeService>;
    private cacheService: ReturnType<typeof getPricingCache>;

    constructor() {
        this.pincodeService = PincodeLookupService; // Already singleton
        this.gstService = GSTService; // Already singleton
        this.codService = getCODChargeService();
        this.cacheService = getPricingCache();
    }

    /**
     * Calculate complete pricing breakdown
     */
    async calculatePricing(input: CalculatePricingInput): Promise<PricingBreakdown> {
        const carrier = input.carrier || 'velocity';
        const serviceType = input.serviceType || 'standard';

        // Step 1: Get zone (with cache)
        const zone = await this.getZoneWithCache(input.fromPincode, input.toPincode);
        logger.info(`[DynamicPricing] Zone: ${zone.zone}`);

        // Step 2: Get RateCard (with cache)
        const rateCard = await this.getRateCardWithCache(
            input.companyId,
            carrier,
            serviceType
        );

        if (!rateCard) {
            throw new Error(`RateCard not found for company ${input.companyId}`);
        }

        // Step 3: Calculate base shipping cost
        const shippingCost = this.calculateShippingCost(
            rateCard,
            zone.zone,
            input.weight
        );

        // Step 4: Calculate COD charges
        const codCharge =
            input.paymentMode === 'cod' && input.orderValue
                ? this.codService.calculateCODCharge(input.orderValue, rateCard)
                : 0;

        // Step 5: Calculate GST (on shipping + COD)
        const taxableAmount = shippingCost + codCharge;
        const gst = await this.calculateGST(
            taxableAmount,
            input.fromPincode,
            input.toPincode
        );

        // Step 6: Calculate total
        const total = taxableAmount + gst.total;

        return {
            subtotal: 0, // Will be set by caller with product prices
            shipping: shippingCost,
            codCharge,
            tax: {
                cgst: gst.cgst,
                sgst: gst.sgst,
                igst: gst.igst,
                total: gst.total,
            },
            discount: 0,
            total,
            metadata: {
                zone: zone.zone,
                rateCardId: rateCard._id?.toString(),
                carrierRate: shippingCost,
                zoneMultiplier: rateCard.zoneMultipliers?.[zone.zone] || 1.0,
                cached: false, // Will be set by cache methods
            },
        };
    }

    /**
     * Get zone with Redis caching
     */
    private async getZoneWithCache(
        fromPincode: string,
        toPincode: string
    ): Promise<{ zone: string; isSameCity: boolean; isSameState: boolean }> {
        // Try cache first
        const cachedZone = await this.cacheService.getZone(fromPincode, toPincode);
        if (cachedZone) {
            logger.debug('[DynamicPricing] Zone cache HIT');
            return { zone: cachedZone, isSameCity: false, isSameState: false };
        }

        // Cache miss - calculate
        logger.debug('[DynamicPricing] Zone cache MISS');
        const zoneInfo = this.pincodeService.getZoneFromPincodes(fromPincode, toPincode);

        // Cache for future requests
        await this.cacheService.cacheZone(fromPincode, toPincode, zoneInfo.zone);

        return zoneInfo;
    }

    /**
     * Get RateCard with Redis caching
     */
    private async getRateCardWithCache(
        companyId: string,
        carrier: string,
        serviceType: string
    ): Promise<any> {
        // Try cache first
        const cachedRateCard = await this.cacheService.getRateCard(
            companyId,
            carrier,
            serviceType
        );
        if (cachedRateCard) {
            logger.debug('[DynamicPricing] RateCard cache HIT');
            return cachedRateCard;
        }

        // Cache miss - query database
        logger.debug('[DynamicPricing] RateCard cache MISS');
        const rateCard = await RateCard.findOne({
            companyId,
            status: 'active',
        }).lean();

        if (!rateCard) {
            return null;
        }

        // Cache for future requests
        await this.cacheService.cacheRateCard(companyId, carrier, serviceType, rateCard);

        return rateCard;
    }

    /**
     * Calculate shipping cost from RateCard
     */
    private calculateShippingCost(
        rateCard: any,
        zone: string,
        weight: number
    ): number {
        // Find matching base rate for weight
        const baseRateEntry = rateCard.baseRates?.find(
            (rate: any) => weight >= rate.minWeight && weight <= rate.maxWeight
        );

        if (!baseRateEntry) {
            // Fallback: use highest weight slab
            const maxWeightRate = rateCard.baseRates?.reduce((max: any, rate: any) =>
                rate.maxWeight > max.maxWeight ? rate : max
            );
            if (!maxWeightRate) {
                throw new Error('No base rate found in RateCard');
            }

            const baseRate = maxWeightRate.basePrice;
            const additionalWeight = weight - maxWeightRate.maxWeight;
            const additionalCharge = additionalWeight * (rateCard.weightRules?.[0]?.pricePerKg || 18);

            const rawRate = baseRate + additionalCharge;
            const zoneMultiplier = rateCard.zoneMultipliers?.[zone] || 1.0;

            return Math.round(rawRate * zoneMultiplier * 100) / 100;
        }

        // Apply zone multiplier
        const baseRate = baseRateEntry.basePrice;
        const zoneMultiplier = rateCard.zoneMultipliers?.[zone] || 1.0;

        return Math.round(baseRate * zoneMultiplier * 100) / 100;
    }

    /**
     * Calculate GST based on pincode states
     */
    private async calculateGST(
        taxableAmount: number,
        fromPincode: string,
        toPincode: string
    ): Promise<{ cgst: number; sgst: number; igst: number; total: number }> {
        const fromDetails = this.pincodeService.getPincodeDetails(fromPincode);
        const toDetails = this.pincodeService.getPincodeDetails(toPincode);

        if (!fromDetails || !toDetails) {
            throw new Error('Invalid pincode for GST calculation');
        }

        const sellerStateCode = this.getStateCode(fromDetails.state);
        const buyerStateCode = this.getStateCode(toDetails.state);

        const gst = this.gstService.calculateGST(
            taxableAmount,
            sellerStateCode,
            buyerStateCode
        );

        return {
            cgst: gst.cgst,
            sgst: gst.sgst,
            igst: gst.igst,
            total: gst.totalGST,
        };
    }

    /**
     * Get state code from state name (for GSTService)
     * Complete mapping of all 36 Indian states/UTs
     */
    private getStateCode(stateName: string): string {
        const stateCodeMap: Record<string, string> = {
            // States
            'JAMMU AND KASHMIR': '01',
            'HIMACHAL PRADESH': '02',
            'PUNJAB': '03',
            'CHANDIGARH': '04',
            'UTTARAKHAND': '05',
            'HARYANA': '06',
            'DELHI': '07',
            'RAJASTHAN': '08',
            'UTTAR PRADESH': '09',
            'BIHAR': '10',
            'SIKKIM': '11',
            'ARUNACHAL PRADESH': '12',
            'NAGALAND': '13',
            'MANIPUR': '14',
            'MIZORAM': '15',
            'TRIPURA': '16',
            'MEGHALAYA': '17',
            'ASSAM': '18',
            'WEST BENGAL': '19',
            'JHARKHAND': '20',
            'ODISHA': '21',
            'CHHATTISGARH': '22',
            'MADHYA PRADESH': '23',
            'GUJARAT': '24',
            'DAMAN AND DIU': '25',
            'DADRA AND NAGAR HAVELI': '26',
            'MAHARASHTRA': '27',
            'ANDHRA PRADESH (OLD)': '28',
            'KARNATAKA': '29',
            'GOA': '30',
            'LAKSHADWEEP': '31',
            'KERALA': '32',
            'TAMIL NADU': '33',
            'PUDUCHERRY': '34',
            'ANDAMAN AND NICOBAR ISLANDS': '35',
            'TELANGANA': '36',
            'ANDHRA PRADESH': '37',
            'LADAKH': '38',
        };

        const stateCode = stateCodeMap[stateName.toUpperCase()];
        if (!stateCode) {
            logger.warn(`[DynamicPricing] Unknown state: ${stateName}, defaulting to Delhi (07)`);
            return '07'; // Default to Delhi instead of throwing error
        }

        return stateCode;
    }
}
