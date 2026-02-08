import { Request, Response, NextFunction } from 'express';
import ReconciliationReport from '../../../../infrastructure/database/mongoose/models/finance/reports/reconciliation-report.model';
import PricingVarianceCase from '../../../../infrastructure/database/mongoose/models/finance/reconciliation/pricing-variance-case.model';
import { guardChecks, requireCompanyContext } from '../../../../shared/helpers/controller.helpers';
import { sendSuccess, sendPaginated, calculatePagination } from '../../../../shared/utils/responseHelper';
import { AppError, NotFoundError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import logger from '../../../../shared/logger/winston.logger';
import CarrierBillingReconciliationService from '../../../../core/application/services/finance/carrier-billing-reconciliation.service';
import { carrierBillingImportSchema, updatePricingVarianceCaseSchema } from '../../../../shared/validation/schemas';

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
        requireCompanyContext(auth);

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
        requireCompanyContext(auth);
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

/**
 * POST /api/v1/finance/carrier-billing/import
 */
export const importCarrierBilling = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const validation = carrierBillingImportSchema.safeParse(req.body || {});
        if (!validation.success) {
            throw new AppError(`Invalid billing import payload: ${validation.error.errors[0]?.message || 'validation failed'}`, ErrorCode.VAL_INVALID_INPUT, 400);
        }

        const summary = await CarrierBillingReconciliationService.importRecords({
            companyId: auth.companyId,
            userId: auth.userId,
            records: validation.data.records,
            thresholdPercent: validation.data.thresholdPercent,
        });

        sendSuccess(
            res,
            summary,
            'Carrier billing records imported'
        );
    } catch (error) {
        logger.error('Error importing carrier billing records:', error);
        next(error);
    }
};

/**
 * GET /api/v1/finance/pricing-variance-cases
 */
export const listPricingVarianceCases = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const status = req.query.status as string;

        const query: any = { companyId: auth.companyId };
        if (status) query.status = status;

        const total = await PricingVarianceCase.countDocuments(query);
        const items = await PricingVarianceCase.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        sendPaginated(res, items as any, calculatePagination(total, page, limit), 'Pricing variance cases retrieved');
    } catch (error) {
        logger.error('Error listing pricing variance cases:', error);
        next(error);
    }
};

/**
 * PATCH /api/v1/finance/pricing-variance-cases/:id
 */
export const updatePricingVarianceCase = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const { id } = req.params;
        const validation = updatePricingVarianceCaseSchema.safeParse(req.body || {});
        if (!validation.success) {
            throw new AppError(`Invalid variance case payload: ${validation.error.errors[0]?.message || 'validation failed'}`, ErrorCode.VAL_INVALID_INPUT, 400);
        }

        const updates = validation.data;

        const resolution =
            updates.status === 'resolved' || updates.status === 'waived'
                ? {
                    ...(updates.resolution || {}),
                    resolvedBy: auth.userId,
                    resolvedAt: new Date(),
                }
                : updates.resolution;

        const item = await PricingVarianceCase.findOneAndUpdate(
            { _id: id, companyId: auth.companyId },
            {
                $set: {
                    status: updates.status,
                    resolution,
                },
            },
            { new: true }
        );

        if (!item) {
            throw new NotFoundError('Pricing variance case not found');
        }

        sendSuccess(res, item, 'Pricing variance case updated');
    } catch (error) {
        logger.error('Error updating pricing variance case:', error);
        next(error);
    }
};
