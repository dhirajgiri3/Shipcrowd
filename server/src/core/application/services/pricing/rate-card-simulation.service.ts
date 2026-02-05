import mongoose from 'mongoose';
import { Shipment, RateCard } from '../../../../infrastructure/database/mongoose/models';
import { DynamicPricingService } from './dynamic-pricing.service';
import logger from '../../../../shared/logger/winston.logger';
import { AppError } from '../../../../shared/errors/app.error';

export interface SimulationInput {
    companyId: string;
    proposedRateCardId: string;
    baselineRateCardId?: string;
    sampleSize?: number;
    dateRange?: { start: Date; end: Date };
    filters?: {
        carrier?: string;
        serviceType?: string;
        zone?: string;
    };
}

export interface SimulationResult {
    summary: {
        totalShipments: number;
        avgPriceChange: number;
        totalRevenueImpact: number;
        priceIncreases: number;
        priceDecreases: number;
        noChange: number;
    };
    breakdown: {
        byZone: Record<string, { count: number; avgChange: number }>;
        byCarrier: Record<string, { count: number; avgChange: number }>;
        byWeightBand: Array<{ range: string; count: number; avgChange: number }>;
    };
    outliers: Array<{
        shipmentId: string;
        trackingNumber: string;
        baselinePrice: number;
        proposedPrice: number;
        change: number;
        changePercent: number;
        reason: string;
    }>;
    recommendations: string[];
}

export class RateCardSimulationService {
    private pricingService: DynamicPricingService;

    constructor() {
        this.pricingService = new DynamicPricingService();
    }

    async simulateRateCardChange(input: SimulationInput): Promise<SimulationResult> {
        const { companyId, proposedRateCardId, baselineRateCardId } = input;
        const sampleSize = input.sampleSize || 100;

        // 1. Fetch sample shipments
        const query: any = { companyId, currentStatus: { $ne: 'cancelled' } };
        if (input.dateRange) {
            query.createdAt = { $gte: input.dateRange.start, $lte: input.dateRange.end };
        }
        if (input.filters?.carrier) query.carrier = input.filters.carrier;
        if (input.filters?.serviceType) query.serviceType = input.filters.serviceType;

        const shipments = await Shipment.find(query)
            .sort({ createdAt: -1 })
            .limit(sampleSize)
            .lean();

        if (shipments.length === 0) {
            throw new AppError('No shipments found for simulation');
        }

        const stats = {
            totalShipments: shipments.length,
            totalBaseline: 0,
            totalProposed: 0,
            increases: 0,
            decreases: 0,
            noChange: 0,
            outliers: [] as any[],
            byZone: {} as Record<string, { count: number; totalChange: number }>,
            byCarrier: {} as Record<string, { count: number; totalChange: number }>,
            byWeightBand: {
                '0-0.5kg': { count: 0, totalChange: 0 },
                '0.5-2kg': { count: 0, totalChange: 0 },
                '2-5kg': { count: 0, totalChange: 0 },
                '5-10kg': { count: 0, totalChange: 0 },
                '10kg+': { count: 0, totalChange: 0 }
            } as any
        };

        // Initialize weight bands
        ['0-0.5kg', '0.5-2kg', '2-5kg', '5-10kg', '10kg+'].forEach(band => {
            stats.byWeightBand[band] = { count: 0, totalChange: 0 };
        });

        // 2. Process each shipment
        for (const shipment of shipments) {
            try {
                const fromPincode = '110001';
                const toPincode = shipment.deliveryDetails?.address?.postalCode || '400001';
                const weight = shipment.packageDetails?.weight || 0.5;
                const paymentMode = shipment.paymentDetails?.type || 'prepaid';
                const orderValue = shipment.paymentDetails?.codAmount || 0;

                // Baseline Price
                const baseline = await this.pricingService.calculatePricing({
                    companyId: companyId.toString(),
                    fromPincode,
                    toPincode,
                    weight,
                    dimensions: shipment.packageDetails?.dimensions || { length: 10, width: 10, height: 10 },
                    paymentMode,
                    orderValue,
                    rateCardId: baselineRateCardId || shipment.pricingDetails?.rateCardId?.toString(),
                    carrier: shipment.carrier,
                    serviceType: shipment.serviceType
                });

                // Proposed Price
                const proposed = await this.pricingService.calculatePricing({
                    companyId: companyId.toString(),
                    fromPincode,
                    toPincode,
                    weight,
                    dimensions: shipment.packageDetails?.dimensions || { length: 10, width: 10, height: 10 },
                    paymentMode,
                    orderValue,
                    rateCardId: proposedRateCardId,
                    carrier: shipment.carrier,
                    serviceType: shipment.serviceType
                });

                const baselineTotal = baseline.total;
                const proposedTotal = proposed.total;
                const change = proposedTotal - baselineTotal;
                const changePercent = baselineTotal > 0 ? (change / baselineTotal) * 100 : 0;

                stats.totalBaseline += baselineTotal;
                stats.totalProposed += proposedTotal;

                if (change > 0.01) stats.increases++;
                else if (change < -0.01) stats.decreases++;
                else stats.noChange++;

                // Collect stats
                const zone = baseline.metadata.zone || 'unknown';
                const carrier = shipment.carrier || 'unknown';
                const weightBand = this.getWeightBand(weight);

                this.updateBreakdown(stats.byZone, zone, changePercent);
                this.updateBreakdown(stats.byCarrier, carrier, changePercent);
                this.updateBreakdown(stats.byWeightBand, weightBand, changePercent);

                // Identify outliers
                if (Math.abs(changePercent) > 20) {
                    stats.outliers.push({
                        shipmentId: shipment._id.toString(),
                        trackingNumber: shipment.trackingNumber || shipment.carrierDetails?.carrierTrackingNumber || 'N/A',
                        baselinePrice: baselineTotal,
                        proposedPrice: proposedTotal,
                        change: Math.round(change * 100) / 100,
                        changePercent: Math.round(changePercent * 100) / 100,
                        reason: changePercent > 0 ? 'Significant Increase' : 'Significant Decrease'
                    });
                }

            } catch (err: any) {
                logger.warn(`[Simulation] Skipping shipment ${shipment._id}: ${err.message}`);
            }
        }

        const result: SimulationResult = {
            summary: {
                totalShipments: stats.totalShipments,
                avgPriceChange: Math.round(((stats.totalProposed - stats.totalBaseline) / stats.totalBaseline) * 10000) / 100,
                totalRevenueImpact: Math.round((stats.totalProposed - stats.totalBaseline) * 100) / 100,
                priceIncreases: stats.increases,
                priceDecreases: stats.decreases,
                noChange: stats.noChange
            },
            breakdown: {
                byZone: this.finalizeBreakdown(stats.byZone),
                byCarrier: this.finalizeBreakdown(stats.byCarrier),
                byWeightBand: this.finalizeWeightBandBreakdown(stats.byWeightBand)
            },
            outliers: stats.outliers.slice(0, 50),
            recommendations: this.generateRecommendations(stats)
        };

        return result;
    }

    private getWeightBand(weight: number): string {
        if (weight <= 0.5) return '0-0.5kg';
        if (weight <= 2) return '0.5-2kg';
        if (weight <= 5) return '2-5kg';
        if (weight <= 10) return '5-10kg';
        return '10kg+';
    }

    private updateBreakdown(container: Record<string, { count: number; totalChange: number }>, key: string, change: number) {
        if (!container[key]) {
            container[key] = { count: 0, totalChange: 0 };
        }
        container[key].count++;
        container[key].totalChange += change;
    }

    private finalizeBreakdown(container: Record<string, { count: number; totalChange: number }>) {
        const result: Record<string, { count: number; avgChange: number }> = {};
        for (const key in container) {
            result[key] = {
                count: container[key].count,
                avgChange: Math.round((container[key].totalChange / (container[key].count || 1)) * 100) / 100
            };
        }
        return result;
    }

    private finalizeWeightBandBreakdown(container: Record<string, { count: number; totalChange: number }>) {
        return Object.keys(container).map(range => ({
            range,
            count: container[range].count,
            avgChange: Math.round((container[range].totalChange / (container[range].count || 1)) * 100) / 100
        }));
    }

    private generateRecommendations(stats: any): string[] {
        const recommendations: string[] = [];
        const avgChange = ((stats.totalProposed - stats.totalBaseline) / stats.totalBaseline) * 100;

        if (avgChange > 10) {
            recommendations.push('Proposed rates significantly increase pricing (>10%). Consider gradual adjustments or customer-specific discounts.');
        } else if (avgChange < -10) {
            recommendations.push('Proposed rates significantly decrease revenue (>10%). Verify margins carefully.');
        } else {
            recommendations.push('Overall price change is within acceptable limits (+/- 10%).');
        }

        // Check for specific carrier impact
        for (const carrier in stats.byCarrier) {
            const carrierStats = stats.byCarrier[carrier];
            const carrierAvg = carrierStats.totalChange / carrierStats.count;
            if (carrierAvg > 15) {
                recommendations.push(`Warning: High price increase for carrier ${carrier} (${Math.round(carrierAvg)}%). Customers using this carrier heavily will be impacted.`);
            }
        }

        // Check for weight band impact
        const heavyBand = stats.byWeightBand['10kg+'];
        if (heavyBand.count > 0) {
            const heavyAvg = heavyBand.totalChange / heavyBand.count;
            if (heavyAvg > 20) {
                recommendations.push('Major impact on heavy shipments (>10kg). Review bulk pricing slabs.');
            }
        }

        if (stats.increases > stats.totalShipments * 0.7) {
            recommendations.push('High volume of shipments will see a price increase. Prepare for potential customer inquiries.');
        }

        return recommendations;
    }
}
