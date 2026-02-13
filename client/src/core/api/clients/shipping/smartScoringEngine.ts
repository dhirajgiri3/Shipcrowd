/**
 * Smart Scoring Engine
 *
 * Computes real AI-powered scores for courier rate options based on:
 * - Price (relative to cheapest)
 * - Speed (relative to fastest)
 * - Reliability (confidence + pricing source)
 * - Performance (tags + margin health)
 *
 * Uses user-configurable weights to compute overall score and rank options.
 */

import type { CourierRate } from '@/src/types/domain/order';

export interface ScoringWeights {
    price: number;        // 0-100
    speed: number;        // 0-100
    reliability: number;  // 0-100
    performance: number;  // 0-100
}

export interface ScoredMetrics {
    priceScore: number;       // 0-100
    speedScore: number;       // 0-100
    reliabilityScore: number; // 0-100
    performanceScore: number; // 0-100
    overallScore: number;     // 0-100 (weighted sum)
}

export interface PerformanceMetrics {
    pickupSuccessRate: number;    // 0-100 (derived from confidence)
    deliverySuccessRate: number;  // 0-100 (derived from confidence)
    rtoRate: number;              // 0-100 (derived from RTO charge ratio)
    onTimeDeliveryRate: number;   // 0-100 (derived from pricing source)
    rating: number;               // 0-5 (derived from tags and confidence)
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
    price: 40,
    speed: 30,
    reliability: 15,
    performance: 15,
};

/**
 * Compute price score (0-100) relative to the cheapest option
 * Cheapest gets 100, others scaled proportionally
 */
function computePriceScore(rate: number, cheapestRate: number): number {
    if (cheapestRate <= 0 || rate <= 0) return 0;
    const score = (cheapestRate / rate) * 100;
    return Math.min(100, Math.max(0, score));
}

/**
 * Compute speed score (0-100) relative to the fastest option
 * Fastest gets 100, others scaled proportionally
 */
function computeSpeedScore(maxDays: number, fastestMaxDays: number): number {
    const effectiveMaxDays = maxDays > 0 ? maxDays : 7; // Default to 7 if unknown
    const effectiveFastestDays = fastestMaxDays > 0 ? fastestMaxDays : 1;

    const score = (effectiveFastestDays / effectiveMaxDays) * 100;
    return Math.min(100, Math.max(0, score));
}

/**
 * Compute reliability score (0-100) from confidence and pricing source
 * - High confidence + live pricing = highest reliability
 * - Low confidence = lowest reliability
 */
function computeReliabilityScore(
    confidence?: 'high' | 'medium' | 'low',
    pricingSource?: 'live' | 'table' | 'hybrid'
): number {
    if (!confidence) return 60; // Default

    if (confidence === 'high') {
        if (pricingSource === 'live') return 95;
        if (pricingSource === 'hybrid') return 90;
        return 85; // table
    }

    if (confidence === 'medium') {
        if (pricingSource === 'live') return 80;
        if (pricingSource === 'hybrid') return 75;
        return 70; // table
    }

    // Low confidence
    return 50;
}

/**
 * Compute performance score (0-100) from tags and margin health
 * - Tags indicate platform confidence (RECOMMENDED, CHEAPEST, FASTEST)
 * - Healthy margin indicates sustainable service
 */
function computePerformanceScore(
    tags: string[],
    marginPercent?: number
): number {
    let score = 40; // Base score

    // Tag bonuses
    if (tags.includes('RECOMMENDED')) score += 30;
    if (tags.includes('CHEAPEST')) score += 20;
    if (tags.includes('FASTEST')) score += 20;
    if (tags.includes('BEST_RATED')) score += 15;

    // Margin health bonus (indicates sustainable service)
    if (marginPercent !== undefined) {
        if (marginPercent > 15) score += 15; // Healthy margin
        else if (marginPercent > 0) score += 10; // Positive margin
    }

    return Math.min(100, Math.max(0, score));
}

/**
 * Derive performance metrics from available data
 * These are proxy values since real historical data is not available
 */
function derivePerformanceMetrics(rate: CourierRate): PerformanceMetrics {
    const confidence = rate.confidence || 'medium';
    const pricingSource = rate.pricingSource || 'table';
    const tags = rate.tags || [];

    // Success rates based on confidence level
    let pickupSuccessRate = 85;
    let deliverySuccessRate = 85;

    if (confidence === 'high') {
        pickupSuccessRate = 95;
        deliverySuccessRate = 95;
    } else if (confidence === 'low') {
        pickupSuccessRate = 70;
        deliverySuccessRate = 70;
    }

    // RTO rate (lower is better) - derived from RTO charge ratio
    const rtoCharge = rate.sellBreakdown?.rtoCharge || 0;
    const totalAmount = rate.rate || 1;
    const rtoRatio = (rtoCharge / totalAmount) * 100;
    const rtoRate = Math.min(30, Math.max(5, rtoRatio * 2)); // 5-30% range

    // On-time delivery rate based on pricing source (live = more accurate ETA)
    let onTimeDeliveryRate = 80;
    if (pricingSource === 'live') {
        onTimeDeliveryRate = 90;
    } else if (pricingSource === 'hybrid') {
        onTimeDeliveryRate = 85;
    }

    // Rating (0-5) based on tags and confidence
    let rating = 3.5; // Base rating
    if (tags.includes('RECOMMENDED')) rating += 1.0;
    if (tags.includes('BEST_RATED')) rating += 0.5;
    if (confidence === 'high') rating += 0.3;
    rating = Math.min(5, rating);

    return {
        pickupSuccessRate,
        deliverySuccessRate,
        rtoRate,
        onTimeDeliveryRate,
        rating,
    };
}

/**
 * Main scoring function
 * Computes all scores for a single rate option
 */
function scoreRate(
    rate: CourierRate,
    cheapestRate: number,
    fastestMaxDays: number
): ScoredMetrics {
    const priceScore = computePriceScore(rate.rate, cheapestRate);
    const speedScore = computeSpeedScore(
        rate.estimatedDeliveryDays || 7,
        fastestMaxDays
    );
    const reliabilityScore = computeReliabilityScore(
        rate.confidence,
        rate.pricingSource
    );
    const performanceScore = computePerformanceScore(
        rate.tags || [],
        rate.estimatedMarginPercent
    );

    // Overall score is computed later with user weights
    return {
        priceScore,
        speedScore,
        reliabilityScore,
        performanceScore,
        overallScore: 0, // Computed in applyScoring
    };
}

/**
 * Apply scoring to all rate options with user-defined weights
 * Returns sorted array (highest overall score first)
 */
export function applyScoring(
    rates: CourierRate[],
    weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): Array<CourierRate & { scores: ScoredMetrics; performanceMetrics: PerformanceMetrics }> {
    if (rates.length === 0) return [];

    // Validate weights sum to 100
    const weightSum = weights.price + weights.speed + weights.reliability + weights.performance;
    if (Math.abs(weightSum - 100) > 0.01) {
        throw new Error(`Scoring weights must sum to 100 (got ${weightSum})`);
    }

    // Find cheapest and fastest for relative scoring
    const cheapestRate = Math.min(...rates.map(r => r.rate));
    const fastestMaxDays = Math.min(...rates.map(r => r.estimatedDeliveryDays || 7));

    // Score each rate
    const scoredRates = rates.map(rate => {
        const scores = scoreRate(rate, cheapestRate, fastestMaxDays);

        // Compute overall score with user weights
        const overallScore = (
            (scores.priceScore * weights.price) +
            (scores.speedScore * weights.speed) +
            (scores.reliabilityScore * weights.reliability) +
            (scores.performanceScore * weights.performance)
        ) / 100;

        scores.overallScore = Math.min(100, Math.max(0, overallScore));

        const performanceMetrics = derivePerformanceMetrics(rate);

        return {
            ...rate,
            scores,
            performanceMetrics,
        };
    });

    // Sort by overall score descending
    return scoredRates.sort((a, b) => b.scores.overallScore - a.scores.overallScore);
}

/**
 * Compute estimated delivery date from delivery days
 */
export function computeEstimatedDeliveryDate(deliveryDays: number): string {
    if (deliveryDays <= 0) return '';

    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + deliveryDays);

    return deliveryDate.toISOString().split('T')[0]; // YYYY-MM-DD
}
