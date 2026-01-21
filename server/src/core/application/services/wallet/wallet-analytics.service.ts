/**
 * WalletAnalyticsService
 *
 * Provides spending insights, trends, and recommendations for sellers
 *
 * Features:
 * - Week-over-week spending analysis
 * - Category-based spending breakdown
 * - Smart cost-saving recommendations
 * - Wallet projection calculations
 */

import mongoose from 'mongoose';
import { WalletTransaction, IWalletTransaction, Company } from '../../../../infrastructure/database/mongoose/models';
import { Shipment } from '../../../../infrastructure/database/mongoose/models';
import logger from '../../../../shared/logger/winston.logger';
import { AppError } from '../../../../shared/errors/app.error';

interface SpendCategory {
    name: string;
    amount: number;
    percentage: number;
}

interface WeeklySpending {
    total: number;
    categories: SpendCategory[];
}

interface WalletInsights {
    thisWeek: WeeklySpending;
    lastWeek: WeeklySpending;
    avgOrderCost: number;
    recommendations: string[];
}

interface WalletTrends {
    weeklyChange: number; // percentage
    averageWeeklySpend: number;
    projectedWeeksRemaining: number;
    projectedOrdersRemaining: number;
}

interface Recommendation {
    id: string;
    type: 'courier_optimization' | 'bulk_discount' | 'auto_recharge' | 'zone_switch';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    estimatedSavings?: number;
    confidence: number;
}

class WalletAnalyticsService {
    /**
     * Get spending insights with week-over-week comparison
     */
    async getSpendingInsights(companyId: string): Promise<WalletInsights> {
        try {
            const company = await Company.findById(companyId).lean();
            if (!company) {
                throw new AppError('Company not found', 'COMPANY_NOT_FOUND', 404);
            }

            // Calculate date ranges
            const now = new Date();
            const thisWeekStart = this.getWeekStart(now);
            const lastWeekStart = new Date(thisWeekStart);
            lastWeekStart.setDate(lastWeekStart.getDate() - 7);
            const lastWeekEnd = new Date(thisWeekStart);

            // Get this week's spending
            const thisWeekData = await this.getWeeklySpending(companyId, thisWeekStart, now);

            // Get last week's spending
            const lastWeekData = await this.getWeeklySpending(companyId, lastWeekStart, lastWeekEnd);

            // Calculate average order cost
            const avgOrderCost = await this.calculateAverageOrderCost(companyId);

            // Generate recommendations
            const recommendations = await this.generateRecommendations(companyId, thisWeekData.total);

            return {
                thisWeek: thisWeekData,
                lastWeek: lastWeekData,
                avgOrderCost,
                recommendations: recommendations.map(r => r.description)
            };
        } catch (error) {
            logger.error('Error getting spending insights:', error);
            throw error;
        }
    }

    /**
     * Get wallet trends and projections
     */
    async getWalletTrends(companyId: string): Promise<WalletTrends> {
        try {
            const company = await Company.findById(companyId).lean();
            if (!company) {
                throw new AppError('Company not found', 'COMPANY_NOT_FOUND', 404);
            }

            // Calculate weekly spending
            const now = new Date();
            const thisWeekStart = this.getWeekStart(now);
            const lastWeekStart = new Date(thisWeekStart);
            lastWeekStart.setDate(lastWeekStart.getDate() - 7);

            const thisWeekSpend = await this.getWeekSpending(companyId, thisWeekStart, now);
            const lastWeekSpend = await this.getWeekSpending(companyId, lastWeekStart, thisWeekStart);

            // Calculate percentage change
            const weeklyChange = lastWeekSpend > 0
                ? ((thisWeekSpend - lastWeekSpend) / lastWeekSpend) * 100
                : 0;

            // Get average weekly spend (last 4 weeks)
            const fourWeeksAgo = new Date(now);
            fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
            const averageWeeklySpend = await this.getAverageWeeklySpend(companyId, fourWeeksAgo, now);

            // Project remaining capacity
            const currentBalance = company.wallet?.balance || 0;
            const projectedWeeksRemaining = averageWeeklySpend > 0
                ? currentBalance / averageWeeklySpend
                : 0;

            const avgOrderCost = await this.calculateAverageOrderCost(companyId);
            const projectedOrdersRemaining = avgOrderCost > 0
                ? Math.floor(currentBalance / avgOrderCost)
                : 0;

            return {
                weeklyChange,
                averageWeeklySpend,
                projectedWeeksRemaining,
                projectedOrdersRemaining
            };
        } catch (error) {
            logger.error('Error getting wallet trends:', error);
            throw error;
        }
    }

    /**
     * Generate smart recommendations
     */
    async generateRecommendations(companyId: string, weeklySpend?: number): Promise<Recommendation[]> {
        const recommendations: Recommendation[] = [];

        try {
            const company = await Company.findById(companyId).lean();
            if (!company) return recommendations;

            const balance = company.wallet?.balance || 0;
            const threshold = company.wallet?.lowBalanceThreshold || 1000;

            // 1. Low Balance Auto-Recharge
            if (balance < threshold * 2) {
                const suggestedAmount = Math.ceil((weeklySpend || 5000) * 2 / 1000) * 1000;
                recommendations.push({
                    id: 'auto-recharge-001',
                    type: 'auto_recharge',
                    priority: 'high',
                    title: 'Enable Auto-Recharge',
                    description: `Enable auto-recharge at ₹${threshold.toLocaleString('en-IN')} to avoid payment failures`,
                    estimatedSavings: 0,
                    confidence: 0.95
                });
            }

            // 2. Courier Optimization (placeholder - needs shipment analysis)
            const courierRec = await this.analyzeCourierOptimization(companyId);
            if (courierRec) {
                recommendations.push(courierRec);
            }

            // 3. Bulk Packaging Recommendation
            const packagingSpend = await this.getPackagingSpend(companyId);
            if (packagingSpend > 1000) {
                recommendations.push({
                    id: 'bulk-packaging-001',
                    type: 'bulk_discount',
                    priority: 'medium',
                    title: 'Save on Packaging',
                    description: 'Bulk order packaging materials to save 15% on material costs',
                    estimatedSavings: packagingSpend * 0.15,
                    confidence: 0.85
                });
            }

            return recommendations.sort((a, b) => {
                const priorityOrder = { high: 3, medium: 2, low: 1 };
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            });
        } catch (error) {
            logger.error('Error generating recommendations:', error);
            return recommendations;
        }
    }

    /**
     * Get weekly spending with category breakdown
     */
    private async getWeeklySpending(
        companyId: string,
        startDate: Date,
        endDate: Date
    ): Promise<WeeklySpending> {
        const transactions = await WalletTransaction.aggregate([
            {
                $match: {
                    companyId: new mongoose.Types.ObjectId(companyId),
                    type: 'debit',
                    status: 'completed',
                    createdAt: { $gte: startDate, $lt: endDate }
                }
            },
            {
                $group: {
                    _id: '$reason',
                    total: { $sum: '$amount' }
                }
            }
        ]);

        const total = transactions.reduce((sum, t) => sum + t.total, 0);

        // Categorize spending
        const categoryMap: { [key: string]: string } = {
            shipping_cost: 'Shipping Costs',
            packaging_cost: 'Packaging',
            payment_gateway_fee: 'Transaction Fees',
            cod_collection_fee: 'Transaction Fees',
            weight_dispute_charge: 'Shipping Costs',
            rto_charge: 'Shipping Costs'
        };

        const categorized = transactions.reduce((acc, t) => {
            const category = categoryMap[t._id] || 'Other';
            acc[category] = (acc[category] || 0) + t.total;
            return acc;
        }, {} as { [key: string]: number });

        const categories: SpendCategory[] = Object.entries(categorized).map(([name, amount]) => ({
            name,
            amount: amount as number,
            percentage: total > 0 ? Math.round(((amount as number) / total) * 100) : 0
        }));

        return { total, categories };
    }

    /**
     * Get total spending for a week
     */
    private async getWeekSpending(companyId: string, startDate: Date, endDate: Date): Promise<number> {
        const result = await WalletTransaction.aggregate([
            {
                $match: {
                    companyId: new mongoose.Types.ObjectId(companyId),
                    type: 'debit',
                    status: 'completed',
                    createdAt: { $gte: startDate, $lt: endDate }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' }
                }
            }
        ]);

        return result[0]?.total || 0;
    }

    /**
     * Calculate average weekly spend over a period
     */
    private async getAverageWeeklySpend(
        companyId: string,
        startDate: Date,
        endDate: Date
    ): Promise<number> {
        const totalSpend = await this.getWeekSpending(companyId, startDate, endDate);
        const weeks = Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
        return weeks > 0 ? totalSpend / weeks : 0;
    }

    /**
     * Calculate average cost per order
     */
    private async calculateAverageOrderCost(companyId: string): Promise<number> {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const result = await WalletTransaction.aggregate([
            {
                $match: {
                    companyId: new mongoose.Types.ObjectId(companyId),
                    type: 'debit',
                    reason: 'shipping_cost',
                    status: 'completed',
                    createdAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: null,
                    avgCost: { $avg: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        return result[0]?.avgCost || 50; // Default fallback
    }

    /**
     * Analyze courier optimization opportunities
     */
    private async analyzeCourierOptimization(companyId: string): Promise<Recommendation | null> {
        try {
            // Get shipments from last 30 days grouped by courier and zone
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const shipmentStats = await Shipment.aggregate([
                {
                    $match: {
                        companyId: new mongoose.Types.ObjectId(companyId),
                        createdAt: { $gte: thirtyDaysAgo },
                        'pricing.totalCost': { $exists: true, $gt: 0 }
                    }
                },
                {
                    $group: {
                        _id: {
                            courier: '$courierPartner',
                            zone: '$pricing.zone'
                        },
                        avgCost: { $avg: '$pricing.totalCost' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } }
            ]);

            // Simple heuristic: if we have multiple couriers for same zone, recommend cheaper one
            if (shipmentStats.length >= 2) {
                const zones = new Set(shipmentStats.map(s => s._id.zone));
                for (const zone of zones) {
                    const zoneStats = shipmentStats.filter(s => s._id.zone === zone && s.count > 5);
                    if (zoneStats.length >= 2) {
                        zoneStats.sort((a, b) => a.avgCost - b.avgCost);
                        const cheapest = zoneStats[0];
                        const current = zoneStats[1];
                        const savings = (current.avgCost - cheapest.avgCost) * current.count;

                        if (savings > 500) {
                            return {
                                id: 'courier-opt-001',
                                type: 'courier_optimization',
                                priority: 'high',
                                title: 'Optimize Courier Selection',
                                description: `Switch to ${cheapest._id.courier} for Zone ${zone} deliveries to save ₹${Math.round(savings / current.count)}/order`,
                                estimatedSavings: savings,
                                confidence: 0.88
                            };
                        }
                    }
                }
            }

            return null;
        } catch (error) {
            logger.error('Error analyzing courier optimization:', error);
            return null;
        }
    }

    /**
     * Get packaging spend
     */
    private async getPackagingSpend(companyId: string): Promise<number> {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const result = await WalletTransaction.aggregate([
            {
                $match: {
                    companyId: new mongoose.Types.ObjectId(companyId),
                    type: 'debit',
                    reason: 'packaging_cost',
                    status: 'completed',
                    createdAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' }
                }
            }
        ]);

        return result[0]?.total || 0;
    }

    /**
     * Get start of current week (Monday)
     */
    private getWeekStart(date: Date): Date {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust if Sunday
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        return d;
    }
}

export default new WalletAnalyticsService();
