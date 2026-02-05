import { Request, Response } from 'express';
import { asyncHandler } from '../../../../shared/utils/asyncHandler';
import { CODAnalyticsService } from '../../../../core/application/services/finance/cod-analytics.service';
import { sendSuccess } from '../../../../shared/utils/responseHelper';

/**
 * COD Analytics Controller
 * 
 * Exposes endpoints for financial intelligence visualization
 */
export class CODAnalyticsController {

    /**
     * Get Cash Flow Forecast
     * GET /api/v1/finance/cod/analytics/forecast?days=7
     */
    static getForecast = asyncHandler(async (req: Request, res: Response) => {
        const { days } = req.query;
        // @ts-ignore - Validated by middleware usually, but ensuring string conversion
        const companyId = req.user.companyId.toString();

        const data = await CODAnalyticsService.forecastCashFlow(companyId, days ? parseInt(days as string) : 7);

        sendSuccess(res, data, 'Cash flow forecast retrieved successfully');
    });

    /**
     * Get Health Metrics
     * GET /api/v1/finance/cod/analytics/health?period=30 (days)
     */
    static getHealthMetrics = asyncHandler(async (req: Request, res: Response) => {
        const { period } = req.query; // in days
        // @ts-ignore
        const companyId = req.user.companyId.toString();
        const days = period ? parseInt(period as string) : 30;

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        const data = await CODAnalyticsService.getHealthMetrics(companyId, startDate, endDate);

        sendSuccess(res, data, 'COD health metrics retrieved successfully');
    });

    /**
     * Get Carrier Performance Comparison
     * GET /api/v1/finance/cod/analytics/carrier-performance?days=30
     */
    static getCarrierPerformance = asyncHandler(async (req: Request, res: Response) => {
        const { days } = req.query;
        // @ts-ignore
        const companyId = req.user.companyId.toString();

        const data = await CODAnalyticsService.carrierPerformance(companyId, days ? parseInt(days as string) : 30);

        sendSuccess(res, data, 'Carrier performance analytics retrieved successfully');
    });
}

