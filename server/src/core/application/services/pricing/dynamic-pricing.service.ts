import { RateCard, Zone } from '../../../../infrastructure/database/mongoose/models';
import PincodeLookupService from '../logistics/pincode-lookup.service';
import GSTService from '../finance/gst.service';
import { getCODChargeService } from './cod-charge.service';
import { getPricingCache } from './pricing-cache.service';
import logger from '../../../../shared/logger/winston.logger';
import mongoose from 'mongoose';

// ... (Interfaces remain same) ...

export interface CalculatePricingInput {
    companyId: string;
    fromPincode: string;
    toPincode: string;
    weight: number; // in kg
    paymentMode: 'cod' | 'prepaid';
    orderValue?: number; // for COD charge calculation
    carrier?: string; // default: 'velocity'
    serviceType?: string; // default: 'standard'
    rateCardId?: string; // Optional: specific rate card to use
    customerId?: string; // Optional: for customer-specific discounts
    shipmentType?: 'forward' | 'return'; // default: 'forward'
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
        breakdown?: {
            baseCharge: number;
            weightCharge: number;
            zoneCharge: number;
        }
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

        // Step 1.5: Resolve Zone Code (string) to Zone ID (ObjectId) for RateCard lookup
        // Ideally cached, but fast enough via index
        const zoneDoc = await Zone.findOne({
            companyId: input.companyId,
            standardZoneCode: zone.zone
        }).select('_id').lean();

        // Step 2: Get RateCard (with cache)
        const rateCard = await this.getRateCardWithCache(
            input.companyId,
            input.rateCardId
        );

        if (!rateCard) {
            throw new Error(`RateCard not found for company ${input.companyId}`);
        }

        // Step 3: Calculate base shipping cost
        const costBreakdown = this.calculateShippingCost(
            rateCard,
            zone.zone,
            zoneDoc?._id?.toString(), // Pass ID if found
            input.weight
        );


        // Step 4: Calculate Customer Discount
        let discount = 0;
        if (input.customerId) {
            discount = this.calculateCustomerDiscount(
                rateCard,
                input.customerId,
                costBreakdown.total,
                carrier,
                serviceType
            );
        }

        const shippingCost = costBreakdown.total - discount;

        // Step 5: Calculate COD charges
        const codCharge =
            input.paymentMode === 'cod' && input.orderValue
                ? this.codService.calculateCODCharge(input.orderValue, rateCard)
                : 0;

        // Step 6: Calculate GST (on shipping + COD)
        const taxableAmount = shippingCost + codCharge;
        const gst = await this.calculateGST(
            taxableAmount,
            input.fromPincode,
            input.toPincode
        );

        // Step 7: Calculate total
        const total = taxableAmount + gst.total;

        return {
            subtotal: 0,
            shipping: shippingCost,
            codCharge,
            tax: {
                cgst: gst.cgst,
                sgst: gst.sgst,
                igst: gst.igst,
                total: gst.total,
            },
            discount,
            total,
            metadata: {
                zone: zone.zone,
                rateCardId: rateCard._id?.toString(),
                carrierRate: shippingCost,
                zoneMultiplier: rateCard.zoneMultipliers?.[zone.zone] || 1.0,
                cached: false,
                breakdown: {
                    baseCharge: costBreakdown.base,
                    weightCharge: costBreakdown.weight,
                    zoneCharge: costBreakdown.zone
                }
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
     * Get RateCard with caching (Simplified & Optimized)
     */
    private async getRateCardWithCache(
        companyId: string,
        rateCardId?: string
    ): Promise<any> {
        // Strategy 1: Fetch by Specific ID
        if (rateCardId) {
            const cached = await this.cacheService.getRateCardById(rateCardId);
            if (cached) {
                logger.debug(`[DynamicPricing] RateCard ID cache HIT: ${rateCardId}`);
                return cached;
            }

            logger.debug(`[DynamicPricing] RateCard ID cache MISS: ${rateCardId}`);
            const rateCard = await RateCard.findOne({
                _id: rateCardId,
                companyId,
                status: 'active',
            }).lean();

            if (rateCard) {
                await this.cacheService.cacheRateCardById(rateCardId, rateCard);
            }
            return rateCard;
        }

        // Strategy 2: Fetch Company Default
        const cachedDefault = await this.cacheService.getDefaultRateCard(companyId);
        if (cachedDefault) {
            logger.debug(`[DynamicPricing] RateCard DEFAULT cache HIT: ${companyId}`);
            return cachedDefault;
        }

        logger.debug(`[DynamicPricing] RateCard DEFAULT cache MISS: ${companyId}`);
        const rateCard = await RateCard.findOne({
            companyId,
            status: 'active',
            isDeleted: false
        }).sort({ updatedAt: -1 }).lean();

        if (rateCard) {
            await this.cacheService.cacheDefaultRateCard(companyId, rateCard);
        }

        return rateCard;
    }

    /**
     * Calculate shipping cost from RateCard
     */
    private calculateShippingCost(
        rateCard: any,
        zoneCode: string,
        zoneId: string | undefined, // Added zoneId
        weight: number
    ): { total: number; base: number; weight: number; zone: number } {
        // 1. Calculate Base Charge
        let baseRate = 0;
        let weightCharge = 0;
        let additionalWeight = 0;

        const baseRateEntry = rateCard.baseRates?.find(
            (rate: any) => weight >= rate.minWeight && weight <= rate.maxWeight
        );

        if (baseRateEntry) {
            baseRate = baseRateEntry.basePrice;
        } else {
            // Fallback: use highest weight slab
            const maxWeightRate = rateCard.baseRates?.reduce((max: any, rate: any) =>
                rate.maxWeight > max.maxWeight ? rate : max
            );

            if (!maxWeightRate) throw new Error('No base rate found in RateCard');

            baseRate = maxWeightRate.basePrice;
            additionalWeight = weight - maxWeightRate.maxWeight;

            // Determine price per kg. If rule exists for current carrier/service? 
            // Simplified: grab generic rule or specific.
            const weightRule = rateCard.weightRules?.[0]; // Ideally match carrier
            const pricePerKg = weightRule?.pricePerKg || 20;

            weightCharge = additionalWeight * pricePerKg;
        }

        const rawRate = baseRate + weightCharge;

        // 2. Calculate Zone Charge (Multipliers XOR Additives)
        // Prefer Additive Rule if exists (More specific)
        let zoneCharge = 0;

        // Check for specific Zone Rule (Additive)
        const zoneRule = zoneId && rateCard.zoneRules?.find(
            (r: any) => r.zoneId.toString() === zoneId
        );

        if (zoneRule) {
            zoneCharge = zoneRule.additionalPrice;
        } else {
            // Fallback to Multiplier
            const zoneMultiplier = rateCard.zoneMultipliers?.[zoneCode] || 1.0;
            zoneCharge = (rawRate * zoneMultiplier) - rawRate;
        }

        const total = Math.round((rawRate + zoneCharge) * 100) / 100;

        return {
            total,
            base: baseRate,
            weight: weightCharge,
            zone: Math.round(zoneCharge * 100) / 100
        };
    }

    private calculateCustomerDiscount(
        rateCard: any,
        customerId: string,
        amount: number,
        carrier: string,
        serviceType: string
    ): number {
        if (!rateCard.customerOverrides || rateCard.customerOverrides.length === 0) {
            return 0;
        }

        // Find matching override (specific customer + carrier/service match)
        const override = rateCard.customerOverrides.find((o: any) => {
            const customerMatch = o.customerId && o.customerId.toString() === customerId;
            // Strict match on carrier if provided in override
            const carrierMatch = !o.carrier || o.carrier === carrier;
            const serviceMatch = !o.serviceType || o.serviceType === serviceType;
            return customerMatch && carrierMatch && serviceMatch;
        });

        if (!override) return 0;

        let discount = 0;
        if (override.discountPercentage) {
            discount = (amount * override.discountPercentage) / 100;
        } else if (override.flatDiscount) {
            discount = override.flatDiscount;
        }

        return Math.round(discount * 100) / 100;
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
