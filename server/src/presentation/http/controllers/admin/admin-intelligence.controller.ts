import { NextFunction, Request, Response } from 'express';
import AdminInsightsService from '../../../../core/application/services/analytics/admin-insights.service';
import { guardChecks, requirePlatformAdmin } from '../../../../shared/helpers/controller.helpers';

export const getPredictions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
        requirePlatformAdmin(auth);

        res.status(200).json({
            predictions: [],
            meta: {
                generatedAt: new Date().toISOString(),
                modelVersion: 'admin-v1',
            },
        });
    } catch (error) {
        next(error);
    }
};

export const getAnomalies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
        requirePlatformAdmin(auth);

        res.status(200).json({
            anomalies: [],
            summary: {
                total: 0,
                bySeverity: {},
                byCategory: {},
            },
        });
    } catch (error) {
        next(error);
    }
};

export const updateAnomalyStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
        requirePlatformAdmin(auth);
        res.status(200).json({ success: true });
    } catch (error) {
        next(error);
    }
};

export const getDemandForecast = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
        requirePlatformAdmin(auth);
        const days = Number(req.query.days || 30);
        res.status(200).json({
            forecast: [],
            modelVersion: 'admin-v1',
            accuracy: 0,
            days,
        });
    } catch (error) {
        next(error);
    }
};

export const getInsights = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
        requirePlatformAdmin(auth);

        const insights = await AdminInsightsService.generateInsights();
        const normalized = Array.isArray((insights as any)?.insights)
            ? (insights as any).insights
            : Array.isArray(insights)
                ? insights
                : [];

        res.status(200).json({
            insights: normalized,
            totalPotentialSavings: 0,
        });
    } catch (error) {
        next(error);
    }
};

export default {
    getPredictions,
    getAnomalies,
    updateAnomalyStatus,
    getDemandForecast,
    getInsights,
};
