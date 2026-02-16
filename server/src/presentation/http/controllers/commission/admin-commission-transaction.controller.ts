import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import {
    CommissionApprovalService,
    CommissionCalculationService,
} from '../../../../core/application/services/commission';
import { CommissionTransaction } from '../../../../infrastructure/database/mongoose/models';
import { ValidationError } from '../../../../shared/errors/app.error';
import { guardChecks, requirePlatformAdmin } from '../../../../shared/helpers/controller.helpers';
import { calculatePagination, sendPaginated, sendSuccess } from '../../../../shared/utils/responseHelper';
import {
    bulkApproveSchema,
    bulkRejectSchema,
    listTransactionsQuerySchema,
} from '../../../../shared/validation/commission-schemas';

export class AdminCommissionTransactionController {
    static async listTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req, { requireCompany: false });
            requirePlatformAdmin(auth);

            const validation = listTransactionsQuerySchema.safeParse(req.query);
            if (!validation.success) {
                const details = validation.error.errors.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError('Validation failed', details);
            }

            const { page, limit, status, salesRepId, startDate, endDate } = validation.data;
            const companyId = typeof req.query.companyId === 'string' ? req.query.companyId : undefined;

            if (companyId) {
                const result = await CommissionCalculationService.listTransactions(
                    companyId,
                    {
                        status: status as string | undefined,
                        salesRepId: salesRepId as string | undefined,
                        startDate: startDate ? new Date(startDate) : undefined,
                        endDate: endDate ? new Date(endDate) : undefined,
                    },
                    { page, limit }
                );
                sendPaginated(res, result.data, calculatePagination(result.total, page, limit));
                return;
            }

            const query: any = { isDeleted: false };
            if (status) query.status = status;
            if (salesRepId && mongoose.Types.ObjectId.isValid(salesRepId)) {
                query.salesRepresentative = new mongoose.Types.ObjectId(salesRepId);
            }
            if (startDate || endDate) {
                query.calculatedAt = {};
                if (startDate) query.calculatedAt.$gte = new Date(startDate);
                if (endDate) query.calculatedAt.$lte = new Date(endDate);
            }

            const skip = (page - 1) * limit;
            const [items, total] = await Promise.all([
                CommissionTransaction.find(query)
                    .sort({ calculatedAt: -1, createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .populate('salesRepresentative', 'name email')
                    .lean(),
                CommissionTransaction.countDocuments(query),
            ]);

            sendPaginated(res, items, calculatePagination(total, page, limit));
        } catch (error) {
            next(error);
        }
    }

    static async bulkApprove(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req, { requireCompany: false });
            requirePlatformAdmin(auth);

            const validation = bulkApproveSchema.safeParse(req.body);
            if (!validation.success) {
                const details = validation.error.errors.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError('Validation failed', details);
            }

            const rows = await CommissionTransaction.find({
                _id: { $in: validation.data.transactionIds },
                isDeleted: false,
            })
                .select('_id company')
                .lean();

            const grouped = rows.reduce((acc, row: any) => {
                const key = String(row.company);
                if (!acc[key]) acc[key] = [];
                acc[key].push(String(row._id));
                return acc;
            }, {} as Record<string, string[]>);

            let success = 0;
            let failed = 0;

            for (const [companyId, transactionIds] of Object.entries(grouped)) {
                const result = await CommissionApprovalService.bulkApprove(
                    { transactionIds },
                    String(auth.userId),
                    companyId
                );
                success += result.success;
                failed += result.failed;
            }

            sendSuccess(res, { success, failed }, `Bulk approve completed: ${success} succeeded, ${failed} failed`);
        } catch (error) {
            next(error);
        }
    }

    static async bulkReject(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req, { requireCompany: false });
            requirePlatformAdmin(auth);

            const validation = bulkRejectSchema.safeParse(req.body);
            if (!validation.success) {
                const details = validation.error.errors.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError('Validation failed', details);
            }

            const rows = await CommissionTransaction.find({
                _id: { $in: validation.data.transactionIds },
                isDeleted: false,
            })
                .select('_id company')
                .lean();

            const grouped = rows.reduce((acc, row: any) => {
                const key = String(row.company);
                if (!acc[key]) acc[key] = [];
                acc[key].push(String(row._id));
                return acc;
            }, {} as Record<string, string[]>);

            let success = 0;
            let failed = 0;

            for (const [companyId, transactionIds] of Object.entries(grouped)) {
                const result = await CommissionApprovalService.bulkReject(
                    { transactionIds, reason: validation.data.reason },
                    String(auth.userId),
                    companyId
                );
                success += result.success;
                failed += result.failed;
            }

            sendSuccess(res, { success, failed }, `Bulk reject completed: ${success} succeeded, ${failed} failed`);
        } catch (error) {
            next(error);
        }
    }
}

export default AdminCommissionTransactionController;
