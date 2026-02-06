import { Request, Response } from 'express';
import { asyncHandler } from '../../../../shared/utils/asyncHandler';
import { guardChecks, requireCompanyContext } from '../../../../shared/helpers/controller.helpers';
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
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const { days } = req.query;
        const companyId = auth.companyId;

        const data = await CODAnalyticsService.forecastCashFlow(companyId, days ? parseInt(days as string) : 7);

        sendSuccess(res, data, 'Cash flow forecast retrieved successfully');
    });

    /**
     * Get Health Metrics
     * GET /api/v1/finance/cod/analytics/health?period=30 (days)
     */
    static getHealthMetrics = asyncHandler(async (req: Request, res: Response) => {
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const { period } = req.query; // in days
        const companyId = auth.companyId;
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
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const { days } = req.query;
        const companyId = auth.companyId;

        const data = await CODAnalyticsService.carrierPerformance(companyId, days ? parseInt(days as string) : 30);

        sendSuccess(res, data, 'Carrier performance analytics retrieved successfully');
    });
}

