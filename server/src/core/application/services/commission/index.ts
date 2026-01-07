/**
 * Commission Services Barrel Export
 */

export { default as CommissionRuleService } from './commission-rule.service';
export { default as SalesRepresentativeService } from './sales-representative.service';
export { default as CommissionCalculationService } from './commission-calculation.service';
export { default as CommissionApprovalService } from './commission-approval.service';
export { default as PayoutProcessingService } from './payout-processing.service';
export { default as CommissionAnalyticsService } from './commission-analytics.service';
export { default as CommissionAIInsightsService } from './commission-ai-insights.service';

// Export types
export type {
    CommissionForecast,
    AnomalyReport,
    PerformanceRecommendations,
    SalesRepInsights
} from './commission-ai-insights.service';
