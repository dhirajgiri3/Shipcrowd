import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../http';
import { RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError } from '@/src/lib/error';

/**
 * Smart Rate Calculator Hook
 *
 * Provides AI-powered courier recommendations with intelligent scoring
 * across multiple factors: price, speed, reliability, and performance.
 */

// Types
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
        price: number;       // 0-100, default: 40
        speed: number;       // 0-100, default: 30
        reliability: number; // 0-100, default: 15
        performance: number; // 0-100, default: 15
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

    // Performance
    pickupSuccessRate: number;
    deliverySuccessRate: number;
    rtoRate: number;
    onTimeDeliveryRate: number;
    rating: number;

    // Scoring
    scores: {
        priceScore: number;
        speedScore: number;
        reliabilityScore: number;
        performanceScore: number;
        overallScore: number;
    };

    // Tags
    tags: Array<'CHEAPEST' | 'FASTEST' | 'BEST_RATED' | 'RECOMMENDED'>;

    // Status
    serviceable: boolean;
    failureReason?: string;
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

/**
 * Hook: Calculate Smart Rates
 *
 * Returns ranked courier options with AI-powered recommendations.
 * Automatically scores based on price, speed, reliability, and performance.
 */
export function useSmartRateCalculator(
    options?: UseMutationOptions<SmartRateResponse, ApiError, SmartRateInput>
) {
    return useMutation<SmartRateResponse, ApiError, SmartRateInput>({
        mutationFn: async (input) => {
            // Validate scoring weights sum to 100
            if (input.scoringWeights) {
                const sum =
                    input.scoringWeights.price +
                    input.scoringWeights.speed +
                    input.scoringWeights.reliability +
                    input.scoringWeights.performance;

                if (sum !== 100) {
                    throw new Error('Scoring weights must sum to 100');
                }
            }

            const { data } = await apiClient.post<{
                success: boolean;
                data: SmartRateResponse;
            }>('/ratecards/smart-calculate', input);

            return data.data;
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

/**
 * Helper: Get medal icon for tags
 */
export function getMedalIcon(tag: CourierRateOption['tags'][number]): string {
    switch (tag) {
        case 'RECOMMENDED':
            return '🏆';
        case 'CHEAPEST':
            return '🥇';
        case 'FASTEST':
            return '⚡';
        case 'BEST_RATED':
            return '⭐';
        default:
            return '';
    }
}

/**
 * Helper: Get medal color for tags
 */
export function getMedalColor(tag: CourierRateOption['tags'][number]): string {
    switch (tag) {
        case 'RECOMMENDED':
            return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
        case 'CHEAPEST':
            return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
        case 'FASTEST':
            return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
        case 'BEST_RATED':
            return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
        default:
            return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20';
    }
}

/**
 * Helper: Format score with color
 */
export function getScoreColor(score: number): string {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-blue-600 dark:text-blue-400';
    if (score >= 40) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
}
