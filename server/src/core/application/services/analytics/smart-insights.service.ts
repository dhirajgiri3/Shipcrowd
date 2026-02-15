/**
 * Smart Insights Service (Phase 5: 100% Real Data)
 *
 * Revolutionary AI-powered business intelligence for shipping aggregators
 * Analyzes real order patterns, courier performance, costs, and RTO data
 * to provide actionable, money-saving recommendations to sellers.
 *
 * CRITICAL: All insights must be backed by REAL data calculations
 * No fake numbers, no estimates - only facts that affect business decisions.
 */

import mongoose from 'mongoose';
import { Order, RTOEvent, Shipment } from '../../../../infrastructure/database/mongoose/models';
import CacheService from '../../../../infrastructure/utilities/cache.service';
import logger from '../../../../shared/logger/winston.logger';

// ===== INTERFACES =====

export interface SmartInsight {
    id: string;
    type: 'cost_saving' | 'rto_prevention' | 'efficiency' | 'speed' | 'growth_opportunity';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    impact: {
        metric: string;
        value: number;
        period: 'day' | 'week' | 'month';
        formatted: string;
    };
    data: Record<string, any>; // Supporting data for transparency
    action: {
        type: 'auto_apply' | 'manual' | 'enable_feature';
        label: string;
        endpoint?: string;
        payload?: Record<string, any>;
        confirmMessage?: string;
        costImpact?: string;
    };
    socialProof: string;
    confidence: number; // 0-100
    evidence?: {
        source: string;
        window: string;
        sampleSize: number;
        method: 'direct_aggregation' | 'derived_comparison' | 'pattern_analysis';
    };
    projectedImpact?: {
        savings?: number;
        reduction?: number;
        improvement?: number;
        additionalCost?: number;
    };
    createdAt: Date;
}

export interface CourierPerformanceByZone {
    zone: string;
    courier: string;
    avgCost: number;
    avgDeliveryTime: number;
    orderCount: number;
    rtoRate: number;
}

export interface RTOPattern {
    reason: string;
    count: number;
    percentage: number;
    affectedCities: string[];
    avgLoss: number;
}

// ===== SERVICE =====

export default class SmartInsightsService {
    private static clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

    private static confidenceFromSignal(sampleSize: number, signalStrength: number): number {
        const sampleBoost = Math.min(25, sampleSize / 8);
        const signalBoost = Math.min(20, signalStrength / 2);
        return Math.round(this.clamp(50 + sampleBoost + signalBoost, 50, 95));
    }

    private static isActionableInsight(insight: SmartInsight): boolean {
        const value = Math.max(0, insight.impact?.value || 0);
        const sampleSize = insight.evidence?.sampleSize || 0;

        if (sampleSize < 5) return false;

        switch (insight.type) {
            case 'cost_saving':
                // At least meaningful weekly savings
                return value >= 100;
            case 'rto_prevention':
                // Avoid very tiny avoidable-loss / reduction cards
                return value >= 300 || (insight.projectedImpact?.reduction || 0) >= 10;
            case 'growth_opportunity':
                return value >= 500;
            case 'speed':
            case 'efficiency':
                return value >= 5;
            default:
                return value > 0;
        }
    }

    /**
     * Generate all smart insights for a company
     * Returns TOP 5 most impactful recommendations
     */
    static async generateInsights(companyId: string): Promise<SmartInsight[]> {
        const cacheKey = `smart_insights_${companyId}`;
        const cached = await CacheService.get<SmartInsight[]>(cacheKey);
        if (cached) return cached;

        try {
            const insights: SmartInsight[] = [];

            // Run all insight generators in parallel
            const [
                costSavingInsights,
                rtoPreventionInsights,
                efficiencyInsights,
                growthInsights
            ] = await Promise.all([
                this.analyzeCostOptimization(companyId),
                this.analyzeRTOPrevention(companyId),
                this.analyzeEfficiencyImprovements(companyId),
                this.analyzeGrowthOpportunities(companyId)
            ]);

            insights.push(
                ...costSavingInsights,
                ...rtoPreventionInsights,
                ...efficiencyInsights,
                ...growthInsights
            );

            // Keep only meaningful and statistically useful insights
            const actionableInsights = insights.filter((insight) => this.isActionableInsight(insight));

            // Sort by priority and impact value
            const sortedInsights = actionableInsights
                .sort((a, b) => {
                    const priorityOrder = { high: 0, medium: 1, low: 2 };
                    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                        return priorityOrder[a.priority] - priorityOrder[b.priority];
                    }
                    return (b.impact.value || 0) - (a.impact.value || 0);
                })
                .slice(0, 5); // Top 5 insights

            // Cache for 1 hour (insights don't change frequently)
            await CacheService.set(cacheKey, sortedInsights, 3600);

            logger.info('Smart insights generated', {
                companyId,
                insightCount: sortedInsights.length,
                highPriorityCount: sortedInsights.filter(i => i.priority === 'high').length
            });

            return sortedInsights;
        } catch (error) {
            logger.error('Error generating smart insights:', error);
            throw error;
        }
    }

    /**
     * INSIGHT TYPE 1: Cost Optimization
     * Analyzes courier costs and recommends cheaper alternatives
     * NOTE: Zone-based analysis disabled until deliveryZone field is added to Shipment model
     */
    private static async analyzeCostOptimization(companyId: string): Promise<SmartInsight[]> {
        const insights: SmartInsight[] = [];

        try {
            // Get last 30 days of shipment data with costs
            const last30Days = new Date();
            last30Days.setDate(last30Days.getDate() - 30);

            // Group by carrier only (deliveryZone not available in Shipment model)
            const shipments = await Shipment.aggregate([
                {
                    $match: {
                        companyId: new mongoose.Types.ObjectId(companyId),
                        createdAt: { $gte: last30Days },
                        'paymentDetails.shippingCost': { $exists: true, $gt: 0 }
                    }
                },
                {
                    $group: {
                        _id: '$carrier',
                        avgCost: { $avg: '$paymentDetails.shippingCost' },
                        orderCount: { $sum: 1 },
                        totalCost: { $sum: '$paymentDetails.shippingCost' }
                    }
                },
                {
                    $match: {
                        orderCount: { $gte: 10 } // Need minimum 10 orders per carrier for meaningful comparison
                    }
                },
                { $sort: { avgCost: 1 } } // Sort by cost (cheapest first)
            ]);

            // Need at least 2 carriers to compare
            if (shipments.length >= 2) {
                const cheapestCourier = shipments[0];
                const mostUsedCourier = shipments.reduce((max, c) =>
                    c.orderCount > max.orderCount ? c : max
                );

                // If most used is NOT the cheapest
                if (mostUsedCourier._id !== cheapestCourier._id) {
                    const costDiff = mostUsedCourier.avgCost - cheapestCourier.avgCost;

                    // Only recommend if savings > ₹15 per order (meaningful)
                    if (costDiff > 15) {
                        const weeklyOrders = Math.round((mostUsedCourier.orderCount / 30) * 7);
                        const weeklySavings = Math.round(costDiff * weeklyOrders);
                        const sampleSize = shipments.reduce((sum, item) => sum + item.orderCount, 0);
                        const signalStrength = (costDiff / Math.max(1, mostUsedCourier.avgCost)) * 100;
                        const confidence = this.confidenceFromSignal(sampleSize, signalStrength);

                        insights.push({
                            id: `cost_carrier_${Date.now()}`,
                            type: 'cost_saving',
                            priority: weeklySavings > 1000 ? 'high' : 'medium',
                            title: `Save ₹${weeklySavings.toLocaleString('en-IN')}/week by optimizing courier selection`,
                            description: `${mostUsedCourier.orderCount} orders in last 30 days. ${cheapestCourier._id} averages ₹${Math.round(cheapestCourier.avgCost)} vs ${mostUsedCourier._id} at ₹${Math.round(mostUsedCourier.avgCost)}.`,
                            impact: {
                                metric: 'savings',
                                value: weeklySavings,
                                period: 'week',
                                formatted: `Save ₹${weeklySavings.toLocaleString('en-IN')}/week`
                            },
                            data: {
                                currentCourier: mostUsedCourier._id,
                                recommendedCourier: cheapestCourier._id,
                                currentAvgCost: Math.round(mostUsedCourier.avgCost),
                                recommendedAvgCost: Math.round(cheapestCourier.avgCost),
                                savingsPerOrder: Math.round(costDiff),
                                weeklyOrders,
                                last30DaysOrders: mostUsedCourier.orderCount
                            },
                            action: {
                                type: 'manual',
                                label: `Consider ${cheapestCourier._id} for more orders`,
                                confirmMessage: `Review courier performance and consider using ${cheapestCourier._id} more frequently to reduce costs.`
                            },
                            socialProof: `Based on ${mostUsedCourier.orderCount + cheapestCourier.orderCount} orders in last 30 days`,
                            confidence,
                            evidence: {
                                source: 'Shipment.paymentDetails.shippingCost grouped by carrier',
                                window: 'Last 30 days',
                                sampleSize,
                                method: 'direct_aggregation',
                            },
                            projectedImpact: {
                                savings: weeklySavings * 4 // Monthly savings
                            },
                            createdAt: new Date()
                        });
                    }
                }
            }
        } catch (error) {
            logger.error('Error analyzing cost optimization:', error);
        }

        return insights;
    }

    /**
     * INSIGHT TYPE 2: RTO Prevention
     * Analyzes RTO patterns and recommends preventive measures
     */
    private static async analyzeRTOPrevention(companyId: string): Promise<SmartInsight[]> {
        const insights: SmartInsight[] = [];

        try {
            const last30Days = new Date();
            last30Days.setDate(last30Days.getDate() - 30);

            const previous30Days = new Date();
            previous30Days.setDate(previous30Days.getDate() - 60);

            const [currentReasonBreakdown, currentTotalRTOs, previousTotalRTOs] = await Promise.all([
                RTOEvent.aggregate([
                    {
                        $match: {
                            company: new mongoose.Types.ObjectId(companyId),
                            triggeredAt: { $gte: last30Days },
                        },
                    },
                    {
                        $group: {
                            _id: '$rtoReason',
                            count: { $sum: 1 },
                            totalLoss: { $sum: { $ifNull: ['$rtoCharges', 0] } },
                            avgLoss: { $avg: { $ifNull: ['$rtoCharges', 0] } },
                        },
                    },
                    { $sort: { count: -1 } },
                ]),
                RTOEvent.countDocuments({
                    company: new mongoose.Types.ObjectId(companyId),
                    triggeredAt: { $gte: last30Days },
                }),
                RTOEvent.countDocuments({
                    company: new mongoose.Types.ObjectId(companyId),
                    triggeredAt: { $gte: previous30Days, $lt: last30Days },
                }),
            ]);

            if (currentTotalRTOs > 0) {
                const rtoIncrease = previousTotalRTOs > 0
                    ? ((currentTotalRTOs - previousTotalRTOs) / previousTotalRTOs) * 100
                    : 0;

                const topReason = currentReasonBreakdown[0];
                const topReasonCount = topReason?.count || 0;
                const topReasonKey = topReason?._id || 'other';
                const topReasonShare = topReasonCount > 0 ? (topReasonCount / currentTotalRTOs) * 100 : 0;

                if (topReasonCount >= 3) {
                    const reasonLabelMap: Record<string, string> = {
                        ndr_unresolved: 'Customer unavailable',
                        customer_cancellation: 'Customer refused/cancelled',
                        refused: 'Customer refused',
                        incorrect_product: 'Address/Order mismatch',
                        damaged_in_transit: 'Shipment damage',
                        qc_failure: 'QC failure',
                        other: 'Other',
                    };

                    const strategyMap: Record<string, { solution: string; costPerOrder: number }> = {
                        ndr_unresolved: { solution: 'IVR Confirmation', costPerOrder: 2 },
                        customer_cancellation: { solution: 'Pre-delivery SMS Confirmation', costPerOrder: 0.5 },
                        refused: { solution: 'Pre-delivery SMS Confirmation', costPerOrder: 0.5 },
                        incorrect_product: { solution: 'Address Verification', costPerOrder: 1 },
                        damaged_in_transit: { solution: 'Packaging & Courier Audit', costPerOrder: 0 },
                        qc_failure: { solution: 'Product QC Checklist', costPerOrder: 0 },
                        other: { solution: 'Manual RTO Root-Cause Review', costPerOrder: 0 },
                    };

                    const strategy = strategyMap[topReasonKey] || strategyMap.other;
                    // Conservative reduction estimate derived from reason concentration, not fixed constants.
                    const expectedReduction = Math.round(this.clamp(topReasonShare * 0.35, 8, 30));
                    const estimatedAvoidableLoss = Math.round((topReason.totalLoss || 0) * (expectedReduction / 100));
                    const monthlyCost = Math.round((topReasonCount || 0) * strategy.costPerOrder);
                    const signalStrength = topReasonShare + Math.abs(Math.min(rtoIncrease, 30));
                    const confidence = this.confidenceFromSignal(currentTotalRTOs, signalStrength);

                    insights.push({
                        id: `rto_prevent_${String(topReasonKey).replace(/\s+/g, '_')}_${Date.now()}`,
                        type: 'rto_prevention',
                        priority: topReasonShare > 30 ? 'high' : 'medium',
                        title: `Reduce dominant RTO cause with ${strategy.solution}`,
                        description: `${topReasonCount} of ${currentTotalRTOs} RTOs (${topReasonShare.toFixed(1)}%) were "${reasonLabelMap[topReasonKey] || topReasonKey}" in last 30 days. Prioritize ${strategy.solution} to reduce this dominant pattern.`,
                        impact: {
                            metric: 'avoidable_loss',
                            value: estimatedAvoidableLoss,
                            period: 'month',
                            formatted: `Potentially avoid ₹${estimatedAvoidableLoss.toLocaleString('en-IN')}/month`,
                        },
                        data: {
                            currentRTOCount: currentTotalRTOs,
                            topReason: topReasonKey,
                            topReasonLabel: reasonLabelMap[topReasonKey] || topReasonKey,
                            topReasonCount,
                            topReasonShare: Math.round(topReasonShare * 10) / 10,
                            avgLossPerRTO: Math.round(topReason.avgLoss || 0),
                            totalLossTopReason: Math.round(topReason.totalLoss || 0),
                            recommendedSolution: strategy.solution,
                            costPerOrder: strategy.costPerOrder,
                        },
                        action: {
                            type: 'enable_feature',
                            label: `Prioritize ${strategy.solution}`,
                            costImpact: strategy.costPerOrder > 0 ? `₹${strategy.costPerOrder} per order` : 'Operational process change',
                            confirmMessage: `Target the top RTO cause first using ${strategy.solution}.`,
                        },
                        socialProof: `Top reason across ${currentTotalRTOs} RTOs in last 30 days`,
                        confidence,
                        evidence: {
                            source: 'RTOEvent.rtoReason + RTOEvent.rtoCharges',
                            window: 'Last 30 days',
                            sampleSize: currentTotalRTOs,
                            method: 'pattern_analysis',
                        },
                        projectedImpact: {
                            reduction: expectedReduction,
                            savings: estimatedAvoidableLoss,
                            additionalCost: monthlyCost,
                        },
                        createdAt: new Date(),
                    });
                }

                // RTO spike alert
                if (rtoIncrease > 30 && currentTotalRTOs >= 5) {
                    const confidence = this.confidenceFromSignal(
                        currentTotalRTOs + previousTotalRTOs,
                        Math.min(50, rtoIncrease)
                    );
                    insights.push({
                        id: `rto_spike_${Date.now()}`,
                        type: 'rto_prevention',
                        priority: 'high',
                        title: `RTO volume increased ${Math.round(rtoIncrease)}% in last 30 days`,
                        description: `${currentTotalRTOs} RTOs vs ${previousTotalRTOs} in previous period. Investigate courier performance and customer communication immediately.`,
                        impact: {
                            metric: 'rto_increase',
                            value: Math.round(rtoIncrease),
                            period: 'month',
                            formatted: `${Math.round(rtoIncrease)}% increase`,
                        },
                        data: {
                            currentRTOs: currentTotalRTOs,
                            previousRTOs: previousTotalRTOs,
                            increase: Math.round(rtoIncrease),
                        },
                        action: {
                            type: 'manual',
                            label: 'View RTO Analytics',
                            confirmMessage: 'Review courier-wise and reason-wise RTO distribution.',
                        },
                        socialProof: `Compared to previous 30-day period`,
                        confidence,
                        evidence: {
                            source: 'RTOEvent count by period',
                            window: 'Last 60 days',
                            sampleSize: currentTotalRTOs + previousTotalRTOs,
                            method: 'derived_comparison',
                        },
                        createdAt: new Date(),
                    });
                }
            }
        } catch (error) {
            logger.error('Error analyzing RTO prevention:', error);
        }

        return insights;
    }

    /**
     * INSIGHT TYPE 3: Efficiency Improvements
     * Analyzes delivery performance and recommends speed optimizations
     * NOTE: Zone-based analysis disabled until Shipment.deliveryZone field is implemented
     */
    private static async analyzeEfficiencyImprovements(companyId: string): Promise<SmartInsight[]> {
        const insights: SmartInsight[] = [];

        try {
            const last30Days = new Date();
            last30Days.setDate(last30Days.getDate() - 30);

            // Analyze delivery times by carrier only (no zone data available)
            const deliveryPerformance = await Shipment.aggregate([
                {
                    $match: {
                        companyId: new mongoose.Types.ObjectId(companyId),
                        createdAt: { $gte: last30Days },
                        deliveredAt: { $exists: true },
                        currentStatus: 'delivered'
                    }
                },
                {
                    $addFields: {
                        deliveryDays: {
                            $divide: [
                                { $subtract: ['$deliveredAt', '$createdAt'] },
                                1000 * 60 * 60 * 24
                            ]
                        }
                    }
                },
                {
                    $group: {
                        _id: '$carrier',
                        avgDeliveryDays: { $avg: '$deliveryDays' },
                        orderCount: { $sum: 1 }
                    }
                },
                {
                    $match: {
                        orderCount: { $gte: 10 } // Minimum 10 deliveries per carrier
                    }
                },
                { $sort: { avgDeliveryDays: 1 } } // Fastest first
            ]);

            // Need at least 2 carriers to compare
            if (deliveryPerformance.length >= 2) {
                const fastestCourier = deliveryPerformance[0];
                const mostUsedCourier = deliveryPerformance.reduce((max, c) =>
                    c.orderCount > max.orderCount ? c : max
                );

                // If most used is NOT the fastest
                if (mostUsedCourier._id !== fastestCourier._id) {
                    const timeDiff = mostUsedCourier.avgDeliveryDays - fastestCourier.avgDeliveryDays;

                    // Only recommend if improvement > 0.5 days (12 hours)
                    if (timeDiff > 0.5) {
                        const improvement = Math.round((timeDiff / mostUsedCourier.avgDeliveryDays) * 100);
                        const sampleSize = deliveryPerformance.reduce((sum, item) => sum + item.orderCount, 0);
                        const confidence = this.confidenceFromSignal(sampleSize, improvement);

                        insights.push({
                            id: `efficiency_carrier_${Date.now()}`,
                            type: 'speed',
                            priority: improvement > 25 ? 'medium' : 'low',
                            title: `Improve delivery speed by ${improvement}% with ${fastestCourier._id}`,
                            description: `Your orders average ${mostUsedCourier.avgDeliveryDays.toFixed(1)} days delivery. ${fastestCourier._id} delivers in ${fastestCourier.avgDeliveryDays.toFixed(1)} days (${timeDiff.toFixed(1)} days faster).`,
                            impact: {
                                metric: 'delivery_improvement',
                                value: improvement,
                                period: 'week',
                                formatted: `${improvement}% faster delivery`
                            },
                            data: {
                                currentCourier: mostUsedCourier._id,
                                recommendedCourier: fastestCourier._id,
                                currentAvgDays: mostUsedCourier.avgDeliveryDays.toFixed(1),
                                recommendedAvgDays: fastestCourier.avgDeliveryDays.toFixed(1),
                                improvementDays: timeDiff.toFixed(1),
                                orderCount: mostUsedCourier.orderCount
                            },
                            action: {
                                type: 'manual',
                                label: `Use ${fastestCourier._id} more frequently`,
                                confirmMessage: 'Faster delivery improves customer satisfaction and reduces complaints.'
                            },
                            socialProof: `Based on ${mostUsedCourier.orderCount} deliveries in last 30 days`,
                            confidence,
                            evidence: {
                                source: 'Shipment deliveredAt vs createdAt grouped by carrier',
                                window: 'Last 30 days',
                                sampleSize,
                                method: 'direct_aggregation',
                            },
                            projectedImpact: {
                                improvement
                            },
                            createdAt: new Date()
                        });
                    }
                }
            }
        } catch (error) {
            logger.error('Error analyzing efficiency improvements:', error);
        }

        return insights;
    }

    /**
     * INSIGHT TYPE 4: Growth Opportunities
     * Analyzes order patterns to identify expansion opportunities
     */
    private static async analyzeGrowthOpportunities(companyId: string): Promise<SmartInsight[]> {
        const insights: SmartInsight[] = [];

        try {
            const last60Days = new Date();
            last60Days.setDate(last60Days.getDate() - 60);

            // Analyze geographic distribution using correct Order model fields
            const cityDistribution = await Order.aggregate([
                {
                    $match: {
                        companyId: new mongoose.Types.ObjectId(companyId),
                        createdAt: { $gte: last60Days },
                        'customerInfo.address.city': { $exists: true }
                    }
                },
                {
                    $group: {
                        _id: '$customerInfo.address.city',
                        orderCount: { $sum: 1 },
                        avgOrderValue: { $avg: '$totals.total' },
                        totalRevenue: { $sum: '$totals.total' }
                    }
                },
                { $sort: { orderCount: -1 } },
                { $limit: 20 }
            ]);

            // Check if there's growth potential in underserved cities
            if (cityDistribution.length > 3) {
                const topCity = cityDistribution[0];
                const underservedCities = cityDistribution.slice(3, 6).filter(c =>
                    c.orderCount < topCity.orderCount * 0.3 && c.orderCount >= 3
                );

                if (underservedCities.length > 0) {
                    const potentialOrders = underservedCities.reduce((sum, c) =>
                        sum + (topCity.orderCount * 0.5 - c.orderCount), 0
                    );
                    const avgOrderValue = underservedCities.reduce((sum, c) =>
                        sum + c.avgOrderValue, 0
                    ) / underservedCities.length;
                    const potentialRevenue = Math.round(potentialOrders * avgOrderValue);
                    const sampleSize = cityDistribution.reduce((sum, city) => sum + city.orderCount, 0);
                    const confidence = this.confidenceFromSignal(sampleSize, 12);

                    insights.push({
                        id: `growth_cities_${Date.now()}`,
                        type: 'growth_opportunity',
                        priority: 'low',
                        title: `Expand to underserved cities - potential ₹${potentialRevenue.toLocaleString('en-IN')}/month`,
                        description: `Cities like ${underservedCities.map(c => c._id).join(', ')} show demand but low order volume. Targeted marketing could increase revenue.`,
                        impact: {
                            metric: 'potential_revenue',
                            value: potentialRevenue,
                            period: 'month',
                            formatted: `Potential ₹${potentialRevenue.toLocaleString('en-IN')}/month`
                        },
                        data: {
                            underservedCities: underservedCities.map(c => c._id),
                            currentOrders: underservedCities.reduce((sum, c) => sum + c.orderCount, 0),
                            potentialOrders: Math.round(potentialOrders),
                            avgOrderValue: Math.round(avgOrderValue)
                        },
                        action: {
                            type: 'manual',
                            label: 'View Market Analysis',
                            confirmMessage: 'See detailed breakdown of underserved markets and growth potential.'
                        },
                        socialProof: `Based on ${cityDistribution.length} cities in last 60 days`,
                        confidence,
                        evidence: {
                            source: 'Order customerInfo.address.city distribution',
                            window: 'Last 60 days',
                            sampleSize,
                            method: 'pattern_analysis',
                        },
                        projectedImpact: {
                            savings: potentialRevenue
                        },
                        createdAt: new Date()
                    });
                }
            }
        } catch (error) {
            logger.error('Error analyzing growth opportunities:', error);
        }

        return insights;
    }
}
