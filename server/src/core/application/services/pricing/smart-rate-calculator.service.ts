import CourierPerformance from '../../../../infrastructure/database/mongoose/models/shipping/courier-performance.model';
import { Courier } from '../../../../infrastructure/database/mongoose/models';
import Company from '../../../../infrastructure/database/mongoose/models/organization/core/company.model';
import { DynamicPricingService } from './dynamic-pricing.service';
import logger from '../../../../shared/logger/winston.logger';

/**
 * Smart Rate Calculator & Recommendation Engine
 *
 * Implements a 4-step pipeline:
 * 1. Fetch Raw Rates (parallel execution for all couriers)
 * 2. Filter Serviceability (hard gates: pincode, weight, payment mode)
 * 3. Apply Business Rules (soft gates: seller preferences, admin blocks)
 * 4. Score & Rank (weighted scoring algorithm with medal tagging)
 *
 * Returns ranked list of couriers with smart recommendations.
 */

export interface SmartRateInput {
    companyId: string;
    originPincode: string;
    destinationPincode: string;
    weight: number;
    dimensions?: { length: number; width: number; height: number };
    paymentMode: 'prepaid' | 'cod';
    orderValue: number;

    // Optional filters
    preferredCarriers?: string[]; // If set, only these carriers will be considered
    excludedCarriers?: string[]; // Carriers to exclude
    shipmentType?: 'forward' | 'return'; // Default: 'forward'

    // Scoring weights (sum must equal 100)
    scoringWeights?: {
        price: number;       // Default: 40
        speed: number;       // Default: 30
        reliability: number; // Default: 15
        performance: number; // Default: 15
    };
}

export interface CourierRateOption {
    courierId: string;
    courierName: string;
    serviceType: string;

    // Pricing
    baseRate: number;
    weightCharge: number;
    zoneCharge: number;
    codCharge: number;
    gstAmount: number;
    totalAmount: number;

    // Delivery
    estimatedDeliveryDays: number;
    estimatedDeliveryDate: string;
    zone: string;

    // Performance metrics
    pickupSuccessRate: number;
    deliverySuccessRate: number;
    rtoRate: number;
    onTimeDeliveryRate: number;
    rating: number;

    // Scoring
    scores: {
        priceScore: number;      // 0-100
        speedScore: number;      // 0-100
        reliabilityScore: number; // 0-100
        performanceScore: number; // 0-100
        overallScore: number;    // Weighted total (0-100)
    };

    // Tags (medals)
    tags: Array<'CHEAPEST' | 'FASTEST' | 'BEST_RATED' | 'RECOMMENDED'>;

    // Additional metadata
    serviceable: boolean;
    failureReason?: string;
}

export interface SmartRateResponse {
    recommendation: string; // Name of recommended courier
    totalOptions: number;
    rates: CourierRateOption[];
    metadata: {
        calculatedAt: Date;
        scoringWeights: {
            price: number;
            speed: number;
            reliability: number;
            performance: number;
        };
    };
}

export class SmartRateCalculatorService {
    private static instance: SmartRateCalculatorService;
    private pricingService: DynamicPricingService;

    // Default scoring weights (must sum to 100)
    private static DEFAULT_WEIGHTS = {
        price: 40,
        speed: 30,
        reliability: 15,
        performance: 15,
    };

    // Available carriers are dynamically fetched from the database
    // private static AVAILABLE_CARRIERS = [];

    private constructor() {
        this.pricingService = new DynamicPricingService();
    }

    public static getInstance(): SmartRateCalculatorService {
        if (!SmartRateCalculatorService.instance) {
            SmartRateCalculatorService.instance = new SmartRateCalculatorService();
        }
        return SmartRateCalculatorService.instance;
    }

    /**
     * Main entry point: Calculate smart rates with recommendations
     */
    async calculateSmartRates(input: SmartRateInput): Promise<SmartRateResponse> {
        try {
            logger.info('[SmartRateCalculator] Starting calculation', {
                companyId: input.companyId,
                route: `${input.originPincode} -> ${input.destinationPincode}`,
                type: input.shipmentType || 'forward'
            });

            // Step 1: Fetch raw rates (parallel)
            const rawRates = await this.fetchRawRates(input);
            logger.info(`[SmartRateCalculator] Fetched ${rawRates.length} raw rates`);

            // Step 2: Filter serviceability
            const serviceableRates = await this.filterServiceability(rawRates, input);
            logger.info(`[SmartRateCalculator] ${serviceableRates.length} serviceable options`);

            if (serviceableRates.length === 0) {
                return {
                    recommendation: 'No serviceable couriers available',
                    totalOptions: 0,
                    rates: [],
                    metadata: {
                        calculatedAt: new Date(),
                        scoringWeights: input.scoringWeights || SmartRateCalculatorService.DEFAULT_WEIGHTS,
                    },
                };
            }

            // Step 3: Apply business rules
            const filteredRates = await this.applyBusinessRules(serviceableRates, input);
            logger.info(`[SmartRateCalculator] ${filteredRates.length} options after business rules`);

            // Step 4: Score & rank
            const scoringWeights = input.scoringWeights || SmartRateCalculatorService.DEFAULT_WEIGHTS;
            const rankedRates = await this.scoreAndRank(filteredRates, scoringWeights);

            // Step 5: Apply medal tags
            const ratesWithTags = this.applyMedalTags(rankedRates);

            // Get recommendation (highest overall score)
            const recommended = ratesWithTags[0];

            return {
                recommendation: `${recommended.courierName} ${recommended.serviceType}`,
                totalOptions: ratesWithTags.length,
                rates: ratesWithTags,
                metadata: {
                    calculatedAt: new Date(),
                    scoringWeights,
                },
            };
        } catch (error) {
            logger.error('[SmartRateCalculator] Calculation failed:', error);
            throw error;
        }
    }

    /**
     * STEP 1: Fetch Raw Rates
     * Query all available couriers in parallel
     */
    private async fetchRawRates(input: SmartRateInput): Promise<CourierRateOption[]> {
        // Fetch active couriers from DB
        const couriers = await Courier.find({
            isActive: true,
            // Optional: Filter by region if implemented
        }).lean();

        const activeCouriers = couriers.filter((carrier) => {
            // Filter by preferences
            if (input.preferredCarriers && !input.preferredCarriers.includes(carrier.name)) {
                return false;
            }
            if (input.excludedCarriers && input.excludedCarriers.includes(carrier.name)) {
                return false;
            }
            return true;
        });

        const ratePromises: Promise<CourierRateOption | null>[] = [];

        for (const carrier of activeCouriers) {
            for (const serviceType of carrier.serviceTypes) {
                ratePromises.push(
                    this.fetchCourierRate(carrier.name, carrier.displayName, serviceType, input)
                );
            }
        }

        const results = await Promise.allSettled(ratePromises);
        const rates: CourierRateOption[] = [];

        results.forEach((result) => {
            if (result.status === 'fulfilled' && result.value) {
                rates.push(result.value);
            }
        });

        return rates;
    }

    /**
     * Fetch rate for a single courier
     */
    private async fetchCourierRate(
        courierId: string,
        courierName: string,
        serviceType: string,
        input: SmartRateInput
    ): Promise<CourierRateOption | null> {
        try {
            // Get company's rate card
            const company = await Company.findById(input.companyId).lean();
            if (!company?.settings?.defaultRateCardId) {
                logger.warn(`[SmartRateCalculator] No rate card for company ${input.companyId}`);
                return null;
            }

            // Calculate pricing using DynamicPricingService
            const pricingResult = await this.pricingService.calculatePricing({
                companyId: input.companyId,
                fromPincode: input.originPincode,
                toPincode: input.destinationPincode,
                weight: input.weight,
                paymentMode: input.paymentMode,
                orderValue: input.orderValue,
                carrier: courierId,
                serviceType: serviceType,
                rateCardId: company.settings.defaultRateCardId.toString(),
                shipmentType: input.shipmentType || 'forward'
            });

            // Get performance metrics
            const performance = await CourierPerformance.getOrCreate(
                courierId,
                input.companyId
            );

            // Find route-specific metrics or fallback to overall
            const routeMetrics = performance.getRoutePerformance(
                input.originPincode,
                input.destinationPincode
            ) || performance.overallMetrics;

            // Calculate estimated delivery date
            const avgDeliveryDays = routeMetrics.avgDeliveryDays || 4;
            const estimatedDeliveryDate = new Date();
            estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + avgDeliveryDays);

            return {
                courierId,
                courierName,
                serviceType,
                baseRate: pricingResult.metadata.breakdown?.baseCharge || 0,
                weightCharge: pricingResult.metadata.breakdown?.weightCharge || 0,
                zoneCharge: pricingResult.metadata.breakdown?.zoneCharge || 0,
                codCharge: pricingResult.codCharge,
                gstAmount: pricingResult.tax.total,
                totalAmount: pricingResult.total,
                estimatedDeliveryDays: avgDeliveryDays,
                estimatedDeliveryDate: estimatedDeliveryDate.toISOString().split('T')[0],
                zone: pricingResult.metadata.zone,
                pickupSuccessRate: routeMetrics.pickupSuccessRate || 95,
                deliverySuccessRate: routeMetrics.deliverySuccessRate || 95,
                rtoRate: routeMetrics.rtoRate || 5,
                onTimeDeliveryRate: routeMetrics.onTimeDeliveryRate || 90,
                rating: performance.overallMetrics.rating || 4.0,
                scores: {
                    priceScore: 0,
                    speedScore: 0,
                    reliabilityScore: 0,
                    performanceScore: 0,
                    overallScore: 0,
                },
                tags: [],
                serviceable: true,
            };
        } catch (error) {
            logger.error(`[SmartRateCalculator] Failed to fetch rate for ${courierId}:`, error);
            return null;
        }
    }

    /**
     * STEP 2: Filter Serviceability
     * Remove couriers that cannot fulfill the shipment
     */
    private async filterServiceability(
        rates: CourierRateOption[],
        input: SmartRateInput
    ): Promise<CourierRateOption[]> {
        // Dynamic import to avoid circular dependency issues
        const { CourierFactory } = await import('../courier/courier.factory.js');
        const mongoose = await import('mongoose');

        const results = await Promise.all(rates.map(async (rate) => {
            try {
                // If already marked unserviceable by pricing (e.g. no rate card), skip
                if (!rate.serviceable) return rate;

                const provider = await CourierFactory.getProvider(
                    rate.courierId,
                    new mongoose.default.Types.ObjectId(input.companyId)
                );

                const checkType = input.shipmentType === 'return' ? 'pickup' : 'delivery';
                const pincodeToCheck = input.shipmentType === 'return' ? input.originPincode : input.destinationPincode;

                const isServiceable = await provider.checkServiceability(pincodeToCheck, checkType);

                if (!isServiceable) {
                    rate.serviceable = false;
                    rate.failureReason = `Not serviceable for ${checkType} at ${pincodeToCheck}`;
                }
            } catch (err) {
                logger.warn(`[SmartRateCalculator] Serviceability check failed for ${rate.courierId}`, { error: err });
                // If strict, mark unserviceable. For now, we assume if API fails, we can't ship.
                rate.serviceable = false;
                rate.failureReason = 'Serviceability check failed';
            }
            return rate;
        }));

        return results.filter((rate) => rate.serviceable);
    }

    /**
     * STEP 3: Apply Business Rules
     * Apply seller preferences and admin blocks
     */
    private async applyBusinessRules(
        rates: CourierRateOption[],
        input: SmartRateInput
    ): Promise<CourierRateOption[]> {
        const { RoutingRule } = await import('../../../../infrastructure/database/mongoose/models/index.js');

        // Fetch active rules from DB
        const rules = await RoutingRule.find({
            companyId: input.companyId,
            isActive: true
        }).sort({ updatedAt: -1 });

        let blockedCarriers: string[] = [];
        let preferredCarriers: string[] = [];

        for (const rule of rules) {
            // Check constraints
            if (rule.conditions.minWeight && input.weight < rule.conditions.minWeight) continue;
            if (rule.conditions.maxWeight && input.weight > rule.conditions.maxWeight) continue;
            if (rule.conditions.paymentMode !== 'any' && rule.conditions.paymentMode !== input.paymentMode) continue;

            // Apply Actions
            if (rule.actions.blockedCarriers) blockedCarriers.push(...rule.actions.blockedCarriers);
            if (rule.actions.preferredCarriers) preferredCarriers.push(...rule.actions.preferredCarriers);
        }

        // Apply Blocks
        let filteredRates = rates.filter(r => !blockedCarriers.includes(r.courierName.toLowerCase()));

        // Apply Preferences (Boost score later or tag them)
        // For now, we will mark them as preferred in metadata or handle in scoring
        // Let's add a temporary 'bonus' to preferred carriers in the scoring phase if needed, 
        // or just flag them.
        // Actually, let's just tag them here for the scoring function to pick up.
        filteredRates.forEach(r => {
            if (preferredCarriers.includes(r.courierName.toLowerCase())) {
                r.tags.push('RECOMMENDED'); // Provisional tag, final logic in scoring
            }
        });

        return filteredRates;
    }

    /**
     * STEP 4: Score & Rank
     * Calculate weighted scores for each option
     */
    private async scoreAndRank(
        rates: CourierRateOption[],
        weights: { price: number; speed: number; reliability: number; performance: number }
    ): Promise<CourierRateOption[]> {
        if (rates.length === 0) return [];

        // Find min/max for normalization
        const prices = rates.map((r) => r.totalAmount);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);

        const speeds = rates.map((r) => r.estimatedDeliveryDays);
        const minSpeed = Math.min(...speeds);
        const maxSpeed = Math.max(...speeds);

        // Calculate scores for each option
        const scoredRates = rates.map((rate) => {
            // Price Score (lower is better, inverted)
            const priceScore = this.normalizeInverted(rate.totalAmount, minPrice, maxPrice);

            // Speed Score (lower days is better, inverted)
            const speedScore = this.normalizeInverted(rate.estimatedDeliveryDays, minSpeed, maxSpeed);

            // Reliability Score (pickup + delivery success rates)
            const reliabilityScore = (rate.pickupSuccessRate + rate.deliverySuccessRate) / 2;

            // Performance Score (on-time delivery - RTO rate)
            const performanceScore = rate.onTimeDeliveryRate - rate.rtoRate;

            // Overall weighted score
            const overallScore =
                (priceScore * weights.price) / 100 +
                (speedScore * weights.speed) / 100 +
                (reliabilityScore * weights.reliability) / 100 +
                (performanceScore * weights.performance) / 100;

            return {
                ...rate,
                scores: {
                    priceScore: Math.round(priceScore),
                    speedScore: Math.round(speedScore),
                    reliabilityScore: Math.round(reliabilityScore),
                    performanceScore: Math.round(performanceScore),
                    overallScore: Math.round(overallScore * 100) / 100,
                },
            };
        });

        // Sort by overall score (descending)
        return scoredRates.sort((a, b) => b.scores.overallScore - a.scores.overallScore);
    }

    /**
     * STEP 5: Apply Medal Tags
     * Tag top performers in each category
     */
    private applyMedalTags(rates: CourierRateOption[]): CourierRateOption[] {
        if (rates.length === 0) return [];

        // Find best in each category
        const cheapest = rates.reduce((prev, curr) =>
            curr.totalAmount < prev.totalAmount ? curr : prev
        );

        const fastest = rates.reduce((prev, curr) =>
            curr.estimatedDeliveryDays < prev.estimatedDeliveryDays ? curr : prev
        );

        const bestRated = rates.reduce((prev, curr) =>
            curr.rating > prev.rating ? curr : prev
        );

        const recommended = rates[0]; // Already sorted by overall score

        // Apply tags
        return rates.map((rate) => {
            const tags: Array<'CHEAPEST' | 'FASTEST' | 'BEST_RATED' | 'RECOMMENDED'> = [];

            if (rate.courierId === cheapest.courierId && rate.serviceType === cheapest.serviceType) {
                tags.push('CHEAPEST');
            }
            if (rate.courierId === fastest.courierId && rate.serviceType === fastest.serviceType) {
                tags.push('FASTEST');
            }
            if (rate.courierId === bestRated.courierId && rate.serviceType === bestRated.serviceType) {
                tags.push('BEST_RATED');
            }
            if (rate.courierId === recommended.courierId && rate.serviceType === recommended.serviceType) {
                tags.push('RECOMMENDED');
            }

            return { ...rate, tags };
        });
    }

    /**
     * Normalize value to 0-100 scale (higher is better)
     */
    private normalize(value: number, min: number, max: number): number {
        if (max === min) return 100;
        return ((value - min) / (max - min)) * 100;
    }

    /**
     * Normalize value to 0-100 scale (lower is better)
     */
    private normalizeInverted(value: number, min: number, max: number): number {
        if (max === min) return 100;
        return ((max - value) / (max - min)) * 100;
    }
}

export default SmartRateCalculatorService.getInstance();
