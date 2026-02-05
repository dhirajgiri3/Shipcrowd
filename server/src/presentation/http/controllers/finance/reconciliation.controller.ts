import { Request, Response, NextFunction } from 'express';
import ReconciliationReport from '../../../../infrastructure/database/mongoose/models/finance/reports/reconciliation-report.model';
import { guardChecks } from '../../../../shared/helpers/controller.helpers';
import { sendSuccess, sendPaginated, calculatePagination } from '../../../../shared/utils/responseHelper';
import { AppError, NotFoundError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';

/**
 * List Reconciliation Reports
 * GET /api/v1/finance/reconciliation/reports
 */
export const listReconciliationReports = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req);

        // Filters
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const status = req.query.status as string;
        const type = req.query.type as string;
        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

        const query: any = { companyId: auth.companyId };

        if (status) query.status = status;
        if (type) query.type = type;
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = startDate;
            if (endDate) query.createdAt.$lte = endDate;
        }

        const total = await ReconciliationReport.countDocuments(query);
        const reports = await ReconciliationReport.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            // Function to verify current reconciliation status
            .select('-discrepancies'); // Exclude heavy discrepancies array for list view

        const pagination = calculatePagination(total, page, limit);
        sendPaginated(res, reports, pagination, 'Reconciliation reports retrieved successfully');
    } catch (error) {
        logger.error('Error listing reconciliation reports:', error);
        next(error);
    }
};

/**
 * Get Reconciliation Report Details
 * GET /api/v1/finance/reconciliation/reports/:id
 */
export const getReconciliationReportDetails = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req);
        const { id } = req.params;

        const report = await ReconciliationReport.findOne({
            _id: id,
            companyId: auth.companyId
        });

        if (!report) {
            throw new NotFoundError('Reconciliation report not found');
        }

        sendSuccess(res, report, 'Reconciliation report details retrieved successfully');
    } catch (error) {
        logger.error('Error fetching reconciliation report details:', error);
        next(error);
    }
};
