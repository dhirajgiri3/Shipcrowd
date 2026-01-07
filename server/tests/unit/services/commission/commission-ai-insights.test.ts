/**
 * Commission AI Insights Service Unit Tests
 * 
 * Tests for forecasting, anomaly detection, and performance recommendations
 */

import CommissionAIInsightsService from '../../../../src/core/application/services/commission/commission-ai-insights.service';
import { CommissionTransaction, SalesRepresentative } from '../../../../src/infrastructure/database/mongoose/models';
import OpenAIService from '../../../../src/infrastructure/external/ai/openai/openai.service';
import CacheService from '../../../../src/infrastructure/utilities/cache.service';

// Mock dependencies
jest.mock('../../../../src/infrastructure/database/mongoose/models');
jest.mock('../../../../src/infrastructure/external/ai/openai/openai.service');
jest.mock('../../../../src/infrastructure/utilities/cache.service');
jest.mock('../../../../src/shared/logger/winston.logger', () => ({
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
}));

describe('CommissionAIInsightsService', () => {
    const mockCompanyId = '507f1f77bcf86cd799439011';
    const mockSalesRepId = '507f1f77bcf86cd799439012';

    beforeEach(() => {
        jest.clearAllMocks();

        // Default mock for cache (no cached data)
        (CacheService.get as jest.Mock).mockResolvedValue(null);
        (CacheService.set as jest.Mock).mockResolvedValue(true);

        // Default mock for OpenAI availability
        (OpenAIService.isConfigured as jest.Mock).mockReturnValue(true);
    });

    describe('forecastCommission', () => {
        it('should return insufficient data forecast when less than 3 months of history', async () => {
            const mockSalesRep = {
                _id: mockSalesRepId,
                user: { name: 'John Doe' }
            };

            (SalesRepresentative.findById as jest.Mock).mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockSalesRep)
            });

            (CommissionTransaction.aggregate as jest.Mock).mockResolvedValue([
                { _id: { year: 2024, month: 1 }, totalCommission: 5000, transactionCount: 10 }
            ]);

            const result = await CommissionAIInsightsService.forecastCommission(
                mockSalesRepId,
                mockCompanyId,
                3
            );

            expect(result.confidence).toBe(0);
            expect(result.predictions).toHaveLength(3);
            expect(result.predictions[0].predictedAmount).toBe(0);
            expect(result.aiInsights).toContain('Insufficient historical data');
        });

        it('should generate statistical forecast with 12 months of data', async () => {
            const mockSalesRep = {
                _id: mockSalesRepId,
                user: { name: 'John Doe' },
                createdAt: new Date(2023, 0, 1)
            };

            (SalesRepresentative.findById as jest.Mock).mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockSalesRep)
            });

            // Generate 12 months of increasing data
            const historicalData = Array.from({ length: 12 }, (_, i) => ({
                _id: { year: 2024, month: i + 1 },
                totalCommission: 5000 + (i * 200), // Upward trend
                transactionCount: 10 + i,
                avgCommission: 500
            }));

            (CommissionTransaction.aggregate as jest.Mock).mockResolvedValue(historicalData);

            // Mock AI enhancement
            (OpenAIService.analyzeCommissionTrends as jest.Mock).mockResolvedValue(
                JSON.stringify({
                    adjustmentFactor: 1.05,
                    confidence: 85,
                    insight: 'Strong upward momentum detected',
                    reasoning: 'Consistent growth over 12 months'
                })
            );

            const result = await CommissionAIInsightsService.forecastCommission(
                mockSalesRepId,
                mockCompanyId,
                3
            );

            expect(result.methodology.model).toBe('hybrid_statistical_ai');
            expect(result.methodology.dataPoints).toBe(12);
            expect(result.methodology.trend).toBe('upward');
            expect(result.predictions).toHaveLength(3);
            expect(result.predictions[0].predictedAmount).toBeGreaterThan(0);
            expect(result.predictions[0].confidenceInterval.low).toBeLessThanOrEqual(
                result.predictions[0].predictedAmount
            );
            expect(result.predictions[0].confidenceInterval.high).toBeGreaterThanOrEqual(
                result.predictions[0].predictedAmount
            );
            expect(result.confidence).toBeGreaterThan(70); // With 12 months data + good fit
        });

        it('should use statistical only when OpenAI unavailable', async () => {
            (OpenAIService.isConfigured as jest.Mock).mockReturnValue(false);

            const mockSalesRep = {
                _id: mockSalesRepId,
                user: { name: 'John Doe' }
            };

            (SalesRepresentative.findById as jest.Mock).mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockSalesRep)
            });

            const historicalData = Array.from({ length: 6 }, (_, i) => ({
                _id: { year: 2024, month: i + 1 },
                totalCommission: 5000,
                transactionCount: 10
            }));

            (CommissionTransaction.aggregate as jest.Mock).mockResolvedValue(historicalData);

            const result = await CommissionAIInsightsService.forecastCommission(
                mockSalesRepId,
                mockCompanyId,
                3
            );

            expect(result.methodology.model).toBe('statistical_only');
            expect(result.aiInsights).toBeUndefined();
        });

        it('should return cached forecast if available', async () => {
            const cachedForecast = {
                salesRepId: mockSalesRepId,
                salesRepName: 'John Doe',
                forecastPeriod: {
                    startDate: new Date(),
                    endDate: new Date(),
                    months: 3
                },
                predictions: [],
                methodology: {
                    model: 'statistical_only' as const,
                    dataPoints: 6,
                    rSquared: 0.85,
                    trend: 'stable' as const
                },
                confidence: 80,
                generatedAt: new Date()
            };

            (CacheService.get as jest.Mock).mockResolvedValue(cachedForecast);

            const result = await CommissionAIInsightsService.forecastCommission(
                mockSalesRepId,
                mockCompanyId,
                3
            );

            expect(result).toEqual(cachedForecast);
            expect(CommissionTransaction.aggregate).not.toHaveBeenCalled();
        });
    });

    describe('detectAnomalies', () => {
        it('should detect spike anomalies using Z-score', async () => {
            const dateRange = {
                start: new Date('2024-01-01'),
                end: new Date('2024-01-31')
            };

            const mockTransactions = [
                // Normal transactions
                { finalAmount: 1000, calculatedAt: new Date('2024-01-05'), salesRepresentative: { _id: mockSalesRepId, user: { name: 'John Doe' } } },
                { finalAmount: 1100, calculatedAt: new Date('2024-01-10'), salesRepresentative: { _id: mockSalesRepId, user: { name: 'John Doe' } } },
                { finalAmount: 950, calculatedAt: new Date('2024-01-15'), salesRepresentative: { _id: mockSalesRepId, user: { name: 'John Doe' } } },
                { finalAmount: 1050, calculatedAt: new Date('2024-01-20'), salesRepresentative: { _id: mockSalesRepId, user: { name: 'John Doe' } } },
                { finalAmount: 1020, calculatedAt: new Date('2024-01-22'), salesRepresentative: { _id: mockSalesRepId, user: { name: 'John Doe' } } },
                // Anomaly - spike
                { finalAmount: 5000, calculatedAt: new Date('2024-01-25'), salesRepresentative: { _id: mockSalesRepId, user: { name: 'John Doe' } } }
            ];

            (CommissionTransaction.find as jest.Mock).mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockTransactions)
            });

            // Mock AI analysis
            (OpenAIService.analyzeAnomalies as jest.Mock).mockResolvedValue(
                JSON.stringify({
                    isGenuineAnomaly: true,
                    adjustedSeverity: 'warning',
                    explanation: 'Unusually large commission, may indicate high-value deal',
                    suggestedAction: 'Verify with sales rep'
                })
            );

            const result = await CommissionAIInsightsService.detectAnomalies(
                mockCompanyId,
                dateRange
            );

            expect(result.anomalies.length).toBeGreaterThan(0);
            expect(result.anomalies[0].type).toBe('spike');
            expect(result.anomalies[0].severity).toBe('warning'); // After AI adjustment
            expect(Math.abs(result.anomalies[0].zScore)).toBeGreaterThan(2);
            expect(result.detectionMethod).toBe('ai_enhanced');
        });

        it('should filter out false positives with AI', async () => {
            const dateRange = {
                start: new Date('2024-01-01'),
                end: new Date('2024-01-31')
            };

            const mockTransactions = [
                { finalAmount: 1000, calculatedAt: new Date('2024-01-05'), salesRepresentative: { _id: mockSalesRepId, user: { name: 'John Doe' } } },
                { finalAmount: 1100, calculatedAt: new Date('2024-01-10'), salesRepresentative: { _id: mockSalesRepId, user: { name: 'John Doe' } } },
                { finalAmount: 950, calculatedAt: new Date('2024-01-15'), salesRepresentative: { _id: mockSalesRepId, user: { name: 'John Doe' } } },
                { finalAmount: 105, calculatedAt: new Date('2024-01-20'), salesRepresentative: { _id: mockSalesRepId, user: { name: 'John Doe' } } },
                { finalAmount: 1020, calculatedAt: new Date('2024-01-22'), salesRepresentative: { _id: mockSalesRepId, user: { name: 'John Doe' } } }
            ];

            (CommissionTransaction.find as jest.Mock).mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockTransactions)
            });

            // AI determines it's not actually anomalous (e.g., new rep)
            (OpenAIService.analyzeAnomalies as jest.Mock).mockResolvedValue(
                JSON.stringify({
                    isGenuineAnomaly: false,
                    adjustedSeverity: 'info',
                    explanation: 'New rep ramping up, normal variance',
                    suggestedAction: 'No action needed'
                })
            );

            const result = await CommissionAIInsightsService.detectAnomalies(
                mockCompanyId,
                dateRange
            );

            // After filtering, should have fewer anomalies (or none if all were false positives)
            expect(result.summary.criticalCount).toBe(0);
        });

        it('should return cached anomaly report if available', async () => {
            const dateRange = {
                start: new Date('2024-01-01'),
                end: new Date('2024-01-31')
            };

            const cachedReport = {
                companyId: mockCompanyId,
                dateRange,
                anomalies: [],
                summary: {
                    totalAnomalies: 0,
                    bySeverity: {},
                    byType: {},
                    criticalCount: 0
                },
                detectionMethod: 'statistical_only' as const,
                generatedAt: new Date()
            };

            (CacheService.get as jest.Mock).mockResolvedValue(cachedReport);

            const result = await CommissionAIInsightsService.detectAnomalies(
                mockCompanyId,
                dateRange
            );

            expect(result).toEqual(cachedReport);
            expect(CommissionTransaction.find).not.toHaveBeenCalled();
        });
    });

    describe('getRecommendations', () => {
        it('should generate statistical recommendations when below top performer', async () => {
            const mockSalesRep = {
                _id: mockSalesRepId,
                user: { name: 'John Doe' }
            };

            (SalesRepresentative.findById as jest.Mock).mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockSalesRep)
            });

            // Mock commission analytics service
            const CommissionAnalyticsService = require('../../../../src/core/application/services/commission/commission-analytics.service').default;
            CommissionAnalyticsService.getSalesRepDashboard = jest.fn().mockResolvedValue({
                metrics: {
                    totalCommission: 10000,
                    transactionCount: 50,
                    averageCommission: 200
                }
            });
            CommissionAnalyticsService.getTopPerformers = jest.fn().mockResolvedValue([{
                totalCommission: 20000,
                totalOrders: 80,
                averageCommission: 260
            }]);

            const result = await CommissionAIInsightsService.getRecommendations(
                mockSalesRepId,
                mockCompanyId
            );

            expect(result.recommendations.length).toBeGreaterThan(0);
            expect(result.recommendations[0].priority).toBe('high');
            expect(result.recommendations[0].category).toBe('orders');
            expect(result.overallScore).toBeLessThan(100);
            expect(result.comparisonToTop.gap).toBeGreaterThan(0);
        });

        it('should add AI recommendations when available', async () => {
            const mockSalesRep = {
                _id: mockSalesRepId,
                user: { name: 'John Doe' }
            };

            (SalesRepresentative.findById as jest.Mock).mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockSalesRep)
            });

            const CommissionAnalyticsService = require('../../../../src/core/application/services/commission/commission-analytics.service').default;
            CommissionAnalyticsService.getSalesRepDashboard = jest.fn().mockResolvedValue({
                metrics: {
                    totalCommission: 10000,
                    transactionCount: 50,
                    averageCommission: 200
                }
            });
            CommissionAnalyticsService.getTopPerformers = jest.fn().mockResolvedValue([{
                totalCommission: 20000,
                totalOrders: 80,
                averageCommission: 250
            }]);

            (OpenAIService.generatePerformanceRecommendations as jest.Mock).mockResolvedValue(
                JSON.stringify([{
                    priority: 'high',
                    category: 'strategy',
                    title: 'Focus on enterprise clients',
                    description: 'Target larger deals for higher commissions',
                    expectedImpact: '+₹5000 per month',
                    actionItems: ['Identify enterprise prospects', 'Schedule discovery calls'],
                    estimatedEffort: 'medium'
                }])
            );

            const result = await CommissionAIInsightsService.getRecommendations(
                mockSalesRepId,
                mockCompanyId
            );

            expect(result.source).toBe('ai');
            expect(result.recommendations.some(r => r.category === 'strategy')).toBe(true);
        });
    });
});

