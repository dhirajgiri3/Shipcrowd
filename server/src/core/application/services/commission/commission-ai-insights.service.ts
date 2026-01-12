/**
 * Commission Ai Insights
 * 
 * Purpose: Commission AI Insights Service
 * 
 * DEPENDENCIES:
 * - Database Models, Logger
 * 
 * TESTING:
 * Unit Tests: tests/unit/services/.../{filename}.test.ts
 * Coverage: TBD
 * 
 * NOTE: This service needs comprehensive documentation.
 * See SERVICE_TEMPLATE.md for documentation standards.
 */

import mongoose from 'mongoose';
import { CommissionTransaction, SalesRepresentative } from '../../../../infrastructure/database/mongoose/models';
import OpenAIService from '../../../../infrastructure/external/ai/openai/openai.service';
import CommissionAnalyticsService from './commission-analytics.service';
import CacheService from '../../../../infrastructure/utilities/cache.service';
import logger from '../../../../shared/logger/winston.logger';
import { NotFoundError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';

// ===== INTERFACES =====

export interface CommissionForecast {
    salesRepId: string;
    salesRepName: string;
    forecastPeriod: {
        startDate: Date;
        endDate: Date;
        months: number;
    };
    predictions: Array<{
        month: string;
        predictedAmount: number;
        confidenceInterval: {
            low: number;
            high: number;
        };
        factors: string[];
    }>;
    methodology: {
        model: 'hybrid_statistical_ai' | 'statistical_only';
        dataPoints: number;
        rSquared: number; // Model accuracy (0-1)
        trend: 'upward' | 'downward' | 'stable';
    };
    confidence: number; // 0-100
    aiInsights?: string; // OpenAI-generated narrative
    generatedAt: Date;
}

export interface AnomalyReport {
    companyId: string;
    dateRange: { start: Date; end: Date };
    anomalies: Array<{
        id: string;
        type: 'spike' | 'drop' | 'pattern_break' | 'unusual_timing';
        severity: 'critical' | 'warning' | 'info';
        salesRepId: string;
        salesRepName: string;
        metric: string;
        expectedValue: number;
        actualValue: number;
        deviation: number; // percentage
        zScore: number;
        timestamp: Date;
        aiAnalysis?: string; // Why this might be anomalous
        suggestedAction?: string;
        context: {
            isSeasonalPeak: boolean;
            isNewRep: boolean;
            companyWidePerformance: string;
        };
    }>;
    summary: {
        totalAnomalies: number;
        bySeverity: Record<string, number>;
        byType: Record<string, number>;
        criticalCount: number;
    };
    detectionMethod: 'ai_enhanced' | 'statistical_only';
    generatedAt: Date;
}

export interface PerformanceRecommendations {
    salesRepId: string;
    salesRepName: string;
    overallScore: number; // 0-100
    recommendations: Array<{
        id: string;
        priority: 'high' | 'medium' | 'low';
        category: 'orders' | 'conversion' | 'timing' | 'products' | 'territory' | 'strategy';
        title: string;
        description: string;
        expectedImpact: string;
        actionItems: string[];
        estimatedEffort: 'low' | 'medium' | 'high';
    }>;
    strengthsAndWeaknesses: {
        strengths: string[];
        areasForImprovement: string[];
    };
    comparisonToTop: {
        gap: number; // percentage behind top performer
        keyDifferences: string[];
        topPerformerMetrics: {
            avgCommission: number;
            avgOrderValue: number;
            conversionRate: number;
        };
    };
    source: 'ai' | 'statistical';
    confidence: number; // 0-100
    generatedAt: Date;
}

export interface SalesRepInsights {
    salesRepId: string;
    salesRepName: string;
    forecast: CommissionForecast;
    recommendations: PerformanceRecommendations;
    recentAnomalies: AnomalyReport['anomalies'];
    generatedAt: Date;
}

// ===== SERVICE =====

export default class CommissionAIInsightsService {
    /**
     * Forecast commission for next N months
     * Uses hybrid statistical + AI approach for accuracy
     */
    static async forecastCommission(
        salesRepId: string,
        companyId: string,
        months: number = 3
    ): Promise<CommissionForecast> {
        const cacheKey = `commission_forecast_${salesRepId}_${months}m`;
        const cached = await CacheService.get<CommissionForecast>(cacheKey);
        if (cached) return cached;

        try {
            // Fetch historical data (minimum 3 months for meaningful forecast)
            const endDate = new Date();
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - 12); // Look back 12 months

            const salesRep = await SalesRepresentative.findById(salesRepId).populate('user');
            if (!salesRep) {
                throw new NotFoundError('Sales representative not found', ErrorCode.BIZ_NOT_FOUND);
            }

            const historicalData = await CommissionTransaction.aggregate([
                {
                    $match: {
                        salesRepresentative: new mongoose.Types.ObjectId(salesRepId),
                        company: new mongoose.Types.ObjectId(companyId),
                        status: { $in: ['approved', 'paid'] },
                        calculatedAt: { $gte: startDate, $lte: endDate }
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: '$calculatedAt' },
                            month: { $month: '$calculatedAt' }
                        },
                        totalCommission: { $sum: '$finalAmount' },
                        transactionCount: { $sum: 1 },
                        avgCommission: { $avg: '$finalAmount' }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]);

            if (historicalData.length < 3) {
                // Insufficient data for statistical forecast
                return this.generateInsufficientDataForecast(salesRep, months);
            }

            // STEP 1: Statistical Analysis
            const statistical = this.calculateStatisticalForecast(historicalData, months);

            // STEP 2: AI Enhancement (if OpenAI available)
            let aiInsights: string | undefined;
            let adjustmentFactor = 1.0;
            let methodology: CommissionForecast['methodology']['model'] = 'statistical_only';

            if (OpenAIService.isConfigured()) {
                try {
                    const aiResult = await this.getAIForecastEnhancement(
                        historicalData,
                        salesRep,
                        statistical
                    );
                    adjustmentFactor = aiResult.adjustmentFactor;
                    aiInsights = aiResult.insight;
                    methodology = 'hybrid_statistical_ai';
                } catch (error) {
                    logger.warn('AI enhancement failed, using statistical only', { error });
                }
            }

            // STEP 3: Apply AI adjustments and generate final forecast
            const predictions = statistical.predictions.map(pred => ({
                ...pred,
                predictedAmount: Math.round(pred.predictedAmount * adjustmentFactor),
                confidenceInterval: {
                    low: Math.round(pred.confidenceInterval.low * adjustmentFactor),
                    high: Math.round(pred.confidenceInterval.high * adjustmentFactor)
                },
                factors: [
                    ...pred.factors,
                    adjustmentFactor > 1.05 ? 'AI predicts upward momentum' :
                        adjustmentFactor < 0.95 ? 'AI predicts slight decline' :
                            'AI confirms stable trajectory'
                ]
            }));

            const forecast: CommissionForecast = {
                salesRepId,
                salesRepName: (salesRep.user as any).name,
                forecastPeriod: {
                    startDate: new Date(),
                    endDate: new Date(new Date().setMonth(new Date().getMonth() + months)),
                    months
                },
                predictions,
                methodology: {
                    model: methodology,
                    dataPoints: historicalData.length,
                    rSquared: statistical.rSquared,
                    trend: statistical.trend
                },
                confidence: this.calculateConfidence(historicalData, statistical.rSquared),
                aiInsights,
                generatedAt: new Date()
            };

            // Cache for 1 hour
            await CacheService.set(cacheKey, forecast, 3600);

            logger.info('Commission forecast generated', {
                salesRepId,
                months,
                methodology,
                confidence: forecast.confidence
            });

            return forecast;
        } catch (error) {
            logger.error('Error forecasting commission:', error);
            throw error;
        }
    }

    /**
     * Detect anomalies in commission patterns
     * Uses Z-score analysis + AI contextual filtering
     */
    static async detectAnomalies(
        companyId: string,
        dateRange: { start: Date; end: Date }
    ): Promise<AnomalyReport> {
        const cacheKey = `commission_anomalies_${companyId}_${dateRange.start.toISOString()}_${dateRange.end.toISOString()}`;
        const cached = await CacheService.get<AnomalyReport>(cacheKey);
        if (cached) return cached;

        try {
            // Get all commission transactions in range
            const transactions = await CommissionTransaction.find({
                company: new mongoose.Types.ObjectId(companyId),
                calculatedAt: { $gte: dateRange.start, $lte: dateRange.end },
                status: { $in: ['approved', 'paid'] }
            }).populate('salesRepresentative');

            // Group by sales rep for analysis
            const repData = new Map<string, { repName: string; commissions: number[]; timestamps: Date[] }>();

            transactions.forEach(t => {
                const repId = String(t.salesRepresentative._id);
                if (!repData.has(repId)) {
                    repData.set(repId, {
                        repName: (t.salesRepresentative as any).user?.name || 'Unknown',
                        commissions: [],
                        timestamps: []
                    });
                }
                repData.get(repId)!.commissions.push(t.finalAmount);
                repData.get(repId)!.timestamps.push(t.calculatedAt);
            });

            // Calculate statistics and detect anomalies
            const anomalies: AnomalyReport['anomalies'] = [];

            for (const [repId, data] of repData) {
                if (data.commissions.length < 5) continue; // Need minimum data

                const stats = this.calculateStats(data.commissions);

                // Z-score analysis for each commission
                data.commissions.forEach((amount, idx) => {
                    const zScore = (amount - stats.mean) / stats.stdDev;

                    if (Math.abs(zScore) > 2) { // Anomaly threshold
                        const type = zScore > 0 ? 'spike' : 'drop';
                        const severity = Math.abs(zScore) > 3 ? 'critical' :
                            Math.abs(zScore) > 2.5 ? 'warning' : 'info';

                        anomalies.push({
                            id: `anomaly_${repId}_${idx}_${Date.now()}`,
                            type,
                            severity,
                            salesRepId: repId,
                            salesRepName: data.repName,
                            metric: 'commission_amount',
                            expectedValue: stats.mean,
                            actualValue: amount,
                            deviation: ((amount - stats.mean) / stats.mean) * 100,
                            zScore,
                            timestamp: data.timestamps[idx],
                            context: {
                                isSeasonalPeak: false, // TODO: Add seasonal detection
                                isNewRep: data.commissions.length < 10,
                                companyWidePerformance: 'normal'
                            }
                        });
                    }
                });
            }

            // AI enhancement: Filter false positives
            let detectionMethod: AnomalyReport['detectionMethod'] = 'statistical_only';

            if (OpenAIService.isConfigured() && anomalies.length > 0) {
                try {
                    for (const anomaly of anomalies) {
                        const aiAnalysis = await this.getAIAnomalyAnalysis(anomaly);
                        anomaly.aiAnalysis = aiAnalysis.explanation;
                        anomaly.suggestedAction = aiAnalysis.suggestedAction;
                        anomaly.severity = aiAnalysis.adjustedSeverity;
                    }
                    detectionMethod = 'ai_enhanced';
                } catch (error) {
                    logger.warn('AI anomaly analysis failed', { error });
                }
            }

            // Filter out non-genuine anomalies (after AI analysis)
            const genuineAnomalies = anomalies.filter(a => a.severity !== 'info' || a.aiAnalysis);

            const report: AnomalyReport = {
                companyId,
                dateRange,
                anomalies: genuineAnomalies,
                summary: {
                    totalAnomalies: genuineAnomalies.length,
                    bySeverity: this.groupBy(genuineAnomalies, 'severity'),
                    byType: this.groupBy(genuineAnomalies, 'type'),
                    criticalCount: genuineAnomalies.filter(a => a.severity === 'critical').length
                },
                detectionMethod,
                generatedAt: new Date()
            };

            // Cache for 30 minutes
            await CacheService.set(cacheKey, report, 1800);

            logger.info('Anomaly detection completed', {
                companyId,
                totalAnomalies: report.summary.totalAnomalies,
                criticalCount: report.summary.criticalCount
            });

            return report;
        } catch (error) {
            logger.error('Error detecting anomalies:', error);
            throw error;
        }
    }

    /**
     * Generate personalized performance recommendations
     * Uses performance metrics + AI analysis
     */
    static async getRecommendations(
        salesRepId: string,
        companyId: string
    ): Promise<PerformanceRecommendations> {
        const cacheKey = `commission_recommendations_${salesRepId}`;
        const cached = await CacheService.get<PerformanceRecommendations>(cacheKey);
        if (cached) return cached;

        try {
            const salesRep = await SalesRepresentative.findById(salesRepId).populate('user');
            if (!salesRep) {
                throw new NotFoundError('Sales representative not found', ErrorCode.BIZ_NOT_FOUND);
            }

            // Get performance metrics
            const dateRange = {
                start: new Date(new Date().setMonth(new Date().getMonth() - 3)),
                end: new Date()
            };

            const [repMetrics, topPerformers] = await Promise.all([
                CommissionAnalyticsService.getSalesRepDashboard(salesRepId, companyId, dateRange),
                CommissionAnalyticsService.getTopPerformers(companyId, 1, dateRange)
            ]);

            const topPerformer = topPerformers[0];

            // Statistical analysis
            const gap = topPerformer ?
                ((topPerformer.totalCommission - repMetrics.metrics.totalCommission) / topPerformer.totalCommission) * 100 :
                0;

            const recommendations: PerformanceRecommendations['recommendations'] = [];

            // Generate statistical recommendations
            if (repMetrics.metrics.averageCommission < topPerformer?.averageCommission * 0.8) {
                recommendations.push({
                    id: 'rec_avg_commission',
                    priority: 'high',
                    category: 'orders',
                    title: 'Focus on higher-value orders',
                    description: `Your average commission (₹${repMetrics.metrics.averageCommission.toFixed(2)}) is ${(((topPerformer.averageCommission - repMetrics.metrics.averageCommission) / topPerformer.averageCommission) * 100).toFixed(1)}% below top performer`,
                    expectedImpact: `+₹${((topPerformer.averageCommission - repMetrics.metrics.averageCommission) * repMetrics.metrics.transactionCount).toFixed(2)} potential increase`,
                    actionItems: [
                        'Target customers with higher order values',
                        'Upsell complementary products',
                        'Focus on premium product categories'
                    ],
                    estimatedEffort: 'medium'
                });
            }

            // AI-powered recommendations
            let source: 'ai' | 'statistical' = 'statistical';
            let confidence = 75;

            if (OpenAIService.isConfigured()) {
                try {
                    const aiRecs = await this.getAIRecommendations(
                        repMetrics.metrics,
                        topPerformer,
                        salesRep
                    );
                    recommendations.push(...aiRecs.recommendations);
                    source = 'ai';
                    confidence = aiRecs.confidence;
                } catch (error) {
                    logger.warn('AI recommendations failed', { error });
                }
            }

            const result: PerformanceRecommendations = {
                salesRepId,
                salesRepName: (salesRep.user as any).name,
                overallScore: this.calculatePerformanceScore(repMetrics.metrics, topPerformer),
                recommendations: recommendations.slice(0, 5), // Top 5 recommendations
                strengthsAndWeaknesses: {
                    strengths: this.identifyStrengths(repMetrics.metrics, topPerformer),
                    areasForImprovement: this.identifyWeaknesses(repMetrics.metrics, topPerformer)
                },
                comparisonToTop: {
                    gap,
                    keyDifferences: [
                        `Transaction volume: ${topPerformer?.totalOrders || 0} vs ${repMetrics.metrics.transactionCount}`,
                        `Average commission: ₹${topPerformer?.averageCommission.toFixed(2) || 0} vs ₹${repMetrics.metrics.averageCommission.toFixed(2)}`
                    ],
                    topPerformerMetrics: {
                        avgCommission: topPerformer?.averageCommission || 0,
                        avgOrderValue: topPerformer?.averageCommission || 0,
                        conversionRate: 85 // TODO: Calculate actual conversion rate
                    }
                },
                source,
                confidence,
                generatedAt: new Date()
            };

            // Cache for 2 hours
            await CacheService.set(cacheKey, result, 7200);

            logger.info('Recommendations generated', {
                salesRepId,
                recommendationCount: result.recommendations.length,
                source
            });

            return result;
        } catch (error) {
            logger.error('Error generating recommendations:', error);
            throw error;
        }
    }

    /**
     * Get comprehensive insights for a sales rep
     * Combines forecast, recommendations, and recent anomalies
     */
    static async getSalesRepInsights(
        salesRepId: string,
        companyId: string
    ): Promise<SalesRepInsights> {
        try {
            const salesRep = await SalesRepresentative.findById(salesRepId).populate('user');
            if (!salesRep) {
                throw new NotFoundError('Sales representative not found', ErrorCode.BIZ_NOT_FOUND);
            }

            const [forecast, recommendations, anomalyReport] = await Promise.all([
                this.forecastCommission(salesRepId, companyId, 3),
                this.getRecommendations(salesRepId, companyId),
                this.detectAnomalies(companyId, {
                    start: new Date(new Date().setMonth(new Date().getMonth() - 1)),
                    end: new Date()
                })
            ]);

            const repAnomalies = anomalyReport.anomalies.filter(a => a.salesRepId === salesRepId);

            return {
                salesRepId,
                salesRepName: (salesRep.user as any).name,
                forecast,
                recommendations,
                recentAnomalies: repAnomalies,
                generatedAt: new Date()
            };
        } catch (error) {
            logger.error('Error getting sales rep insights:', error);
            throw error;
        }
    }

    // ===== PRIVATE HELPER METHODS =====

    private static calculateStatisticalForecast(
        historicalData: any[],
        months: number
    ): {
        predictions: Array<{
            month: string;
            predictedAmount: number;
            confidenceInterval: { low: number; high: number };
            factors: string[];
        }>;
        rSquared: number;
        trend: 'upward' | 'downward' | 'stable';
    } {
        const amounts = historicalData.map(d => d.totalCommission);
        const n = amounts.length;

        // Linear regression
        const xMean = (n - 1) / 2;
        const yMean = amounts.reduce((a, b) => a + b, 0) / n;

        let numerator = 0;
        let denominator = 0;

        for (let i = 0; i < n; i++) {
            numerator += (i - xMean) * (amounts[i] - yMean);
            denominator += Math.pow(i - xMean, 2);
        }

        const slope = numerator / denominator;
        const intercept = yMean - slope * xMean;

        // Calculate R-squared
        const predicted = amounts.map((_, i) => slope * i + intercept);
        const ssTot = amounts.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
        const ssRes = amounts.reduce((sum, y, i) => sum + Math.pow(y - predicted[i], 2), 0);
        const rSquared = 1 - (ssRes / ssTot);

        // Standard error for confidence intervals
        const stdError = Math.sqrt(ssRes / (n - 2));

        // Generate predictions
        const predictions = [];
        const now = new Date();

        for (let i = 1; i <= months; i++) {
            const futureX = n + i - 1;
            const predictedAmount = slope * futureX + intercept;
            const margin = 1.96 * stdError; // 95% confidence interval

            const futureDate = new Date(now);
            futureDate.setMonth(now.getMonth() + i);

            predictions.push({
                month: futureDate.toISOString().substring(0, 7),
                predictedAmount: Math.max(0, Math.round(predictedAmount)),
                confidenceInterval: {
                    low: Math.max(0, Math.round(predictedAmount - margin)),
                    high: Math.round(predictedAmount + margin)
                },
                factors: [
                    slope > 50 ? 'Strong upward trend' :
                        slope < -50 ? 'Declining trend' :
                            'Stable performance',
                    `R² = ${rSquared.toFixed(2)} (model fit)`
                ]
            });
        }

        const trend = slope > 50 ? 'upward' : slope < -50 ? 'downward' : 'stable';

        return { predictions, rSquared, trend };
    }

    private static async getAIForecastEnhancement(
        historicalData: any[],
        salesRep: any,
        statistical: any
    ): Promise<{ adjustmentFactor: number; insight: string; reasoning: string }> {
        const prompt = `You are a financial analyst specializing in sales commission forecasting.

HISTORICAL DATA (last ${historicalData.length} months):
${JSON.stringify(historicalData.map(d => ({
            month: `${d._id.year}-${String(d._id.month).padStart(2, '0')}`,
            commission: d.totalCommission,
            transactions: d.transactionCount
        })))}

STATISTICAL ANALYSIS:
- Trend: ${statistical.trend}
- R-squared: ${statistical.rSquared.toFixed(3)}
- Next 3 months forecast: ${statistical.predictions.map((p: any) => `${p.month}: ₹${p.predictedAmount}`).join(', ')}

SALES REP CONTEXT:
- Tenure: ${salesRep.createdAt ? Math.floor((Date.now() - new Date(salesRep.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)) : 'Unknown'} months
- Territory: ${salesRep.territory || 'Not specified'}

YOUR TASK:
Analyze if the statistical forecast is reasonable and suggest adjustments.

IMPORTANT RULES:
- Be CONSERVATIVE - underestimate rather than overestimate
- Do NOT invent data or make up numbers
- Only adjust if there's strong statistical justification
- Adjustment factor should be between 0.85 and 1.15 (max ±15%)
- If data shows declining trend, do not artificially inflate forecast

Respond in JSON format:
{
  "adjustmentFactor": 0.85 to 1.15,
  "confidence": 60-95,
  "insight": "2-3 sentence explanation",
  "reasoning": "Why this adjustment or no adjustment"
}`;

        const response = await OpenAIService.analyzeCommissionTrends(prompt);

        // Parse and validate response
        const parsed = JSON.parse(response);
        const adjustmentFactor = Math.max(0.85, Math.min(1.15, parsed.adjustmentFactor || 1.0));

        return {
            adjustmentFactor,
            insight: parsed.insight || 'Statistical forecast confirmed',
            reasoning: parsed.reasoning || 'Based on historical trend analysis'
        };
    }

    private static async getAIAnomalyAnalysis(anomaly: AnomalyReport['anomalies'][0]): Promise<{
        isGenuineAnomaly: boolean;
        adjustedSeverity: 'critical' | 'warning' | 'info';
        explanation: string;
        suggestedAction: string;
    }> {
        const prompt = `You are a risk analyst reviewing commission anomalies.

ANOMALY DETECTED:
- Sales Rep: ${anomaly.salesRepName}
- Expected: ₹${anomaly.expectedValue.toFixed(2)}
- Actual: ₹${anomaly.actualValue.toFixed(2)}
- Deviation: ${anomaly.deviation.toFixed(1)}%
- Z-Score: ${anomaly.zScore.toFixed(2)}
- Context: ${anomaly.context.isNewRep ? 'New rep (ramping up)' : 'Experienced rep'}

ANALYZE:
1. Is this truly anomalous or explainable?
2. What might have caused this?
3. Should this be flagged for review?

IMPORTANT:
- New reps naturally show variance (not anomalous)
- Peak seasons cause spikes (not anomalous)
- Be specific about why this IS or ISN'T a concern

Respond in JSON:
{
  "isGenuineAnomaly": true/false,
  "adjustedSeverity": "critical" | "warning" | "info",
  "explanation": "Brief explanation",
  "suggestedAction": "Specific action or 'No action needed'"
}`;

        const response = await OpenAIService.analyzeAnomalies(prompt);
        return JSON.parse(response);
    }

    private static async getAIRecommendations(
        metrics: any,
        topPerformer: any,
        salesRep: any
    ): Promise<{ recommendations: PerformanceRecommendations['recommendations']; confidence: number }> {
        const prompt = `Generate performance improvement recommendations.

CURRENT PERFORMANCE:
- Total commission (3 months): ₹${metrics.totalCommission.toFixed(2)}
- Transactions: ${metrics.transactionCount}
- Avg commission: ₹${metrics.averageCommission.toFixed(2)}

TOP PERFORMER (for comparison):
- Total commission: ₹${topPerformer?.totalCommission.toFixed(2) || 0}
- Transactions: ${topPerformer?.totalOrders || 0}
- Avg commission: ₹${topPerformer?.averageCommission.toFixed(2) || 0}

Generate 2-3 ACTIONABLE recommendations (not generic advice).

Respond in JSON array format:
[
  {
    "priority": "high" | "medium" | "low",
    "category": "orders" | "conversion" | "timing" | "products" | "territory" | "strategy",
    "title": "Specific title",
    "description": "What to do and why",
    "expectedImpact": "Quantified impact if possible",
    "actionItems": ["Step 1", "Step 2", "Step 3"],
    "estimatedEffort": "low" | "medium" | "high"
  }
]`;

        const response = await OpenAIService.generatePerformanceRecommendations(prompt);
        const recommendations = JSON.parse(response);

        return {
            recommendations: recommendations.map((r: any, idx: number) => ({
                ...r,
                id: `ai_rec_${idx}_${Date.now()}`
            })),
            confidence: 85
        };
    }

    private static calculateStats(values: number[]): { mean: number; stdDev: number; median: number } {
        const sorted = [...values].sort((a, b) => a - b);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        const median = sorted[Math.floor(sorted.length / 2)];

        return { mean, stdDev, median };
    }

    private static groupBy<T>(array: T[], key: keyof T): Record<string, number> {
        return array.reduce((acc, item) => {
            const value = String(item[key]);
            acc[value] = (acc[value] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    }

    private static calculateConfidence(historicalData: any[], rSquared: number): number {
        const dataPoints = historicalData.length;

        // Confidence based on data quantity and model fit
        let confidence = 50;

        if (dataPoints >= 12) confidence += 20;
        else if (dataPoints >= 6) confidence += 10;

        if (rSquared >= 0.8) confidence += 20;
        else if (rSquared >= 0.6) confidence += 10;

        return Math.min(95, confidence);
    }

    private static generateInsufficientDataForecast(salesRep: any, months: number): CommissionForecast {
        const now = new Date();
        const predictions = Array.from({ length: months }, (_, i) => {
            const futureDate = new Date(now);
            futureDate.setMonth(now.getMonth() + i + 1);

            return {
                month: futureDate.toISOString().substring(0, 7),
                predictedAmount: 0,
                confidenceInterval: { low: 0, high: 0 },
                factors: ['Insufficient data for forecast']
            };
        });

        return {
            salesRepId: salesRep._id,
            salesRepName: salesRep.user?.name || 'Unknown',
            forecastPeriod: {
                startDate: now,
                endDate: new Date(now.setMonth(now.getMonth() + months)),
                months
            },
            predictions,
            methodology: {
                model: 'statistical_only',
                dataPoints: 0,
                rSquared: 0,
                trend: 'stable'
            },
            confidence: 0,
            aiInsights: 'Insufficient historical data for accurate forecast. Need minimum 3 months of commission history.',
            generatedAt: new Date()
        };
    }

    private static calculatePerformanceScore(metrics: any, topPerformer: any): number {
        if (!topPerformer) return 50;

        const commissionRatio = metrics.totalCommission / topPerformer.totalCommission;
        const transactionRatio = metrics.transactionCount / topPerformer.totalOrders;

        return Math.min(100, Math.round(((commissionRatio + transactionRatio) / 2) * 100));
    }

    private static identifyStrengths(metrics: any, topPerformer: any): string[] {
        const strengths: string[] = [];

        if (metrics.averageCommission >= (topPerformer?.averageCommission || 0) * 0.9) {
            strengths.push('Consistent high-value transactions');
        }

        if (metrics.transactionCount >= (topPerformer?.totalOrders || 0) * 0.8) {
            strengths.push('Strong order volume');
        }

        if (strengths.length === 0) {
            strengths.push('Maintaining active sales pipeline');
        }

        return strengths;
    }

    private static identifyWeaknesses(metrics: any, topPerformer: any): string[] {
        const weaknesses: string[] = [];

        if (metrics.averageCommission < (topPerformer?.averageCommission || 0) * 0.7) {
            weaknesses.push('Lower average order value');
        }

        if (metrics.transactionCount < (topPerformer?.totalOrders || 0) * 0.6) {
            weaknesses.push('Needs to increase order volume');
        }

        if (weaknesses.length === 0) {
            weaknesses.push('Room for optimization in conversion rate');
        }

        return weaknesses;
    }
}
