import { Request, Response } from 'express';
import { asyncHandler } from '../../../../shared/utils/asyncHandler';
import { guardChecks, requireCompanyContext } from '../../../../shared/helpers/controller.helpers';
import { CODDiscrepancyService } from '../../../../core/application/services/finance/cod-discrepancy.service';
import { sendSuccess, sendPaginated } from '../../../../shared/utils/responseHelper';
import CODDiscrepancy from '../../../../infrastructure/database/mongoose/models/finance/cod-discrepancy.model';
import logger from '../../../../shared/logger/winston.logger';
import { parseQueryDateRange } from '../../../../shared/utils/dateRange';

export class CODDiscrepancyController {

    /**
     * Get Discrepancies List with Filters
     */
    static getDiscrepancies = asyncHandler(async (req: Request, res: Response) => {
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const { status, type, search, startDate, endDate, page = 1, limit = 10 } = req.query;
        const companyId = auth.companyId;

        const query: any = { companyId };
        if (status) query.status = status;
        if (type) query.type = type;
        if (search && String(search).trim()) {
            const keyword = String(search).trim();
            query.$or = [
                { discrepancyNumber: { $regex: keyword, $options: 'i' } },
                { awb: { $regex: keyword, $options: 'i' } },
            ];
        }
        if (startDate || endDate) {
            const parsedRange = parseQueryDateRange(
                startDate ? String(startDate) : undefined,
                endDate ? String(endDate) : undefined
            );
            query.createdAt = {};
            if (parsedRange.startDate) query.createdAt.$gte = parsedRange.startDate;
            if (parsedRange.endDate) query.createdAt.$lte = parsedRange.endDate;
        }

        const discrepancies = await CODDiscrepancy.find(query)
            .sort({ createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit))
            .populate('shipmentId', 'trackingNumber paymentDetails.codAmount paymentDetails.actualCollection');

        const total = await CODDiscrepancy.countDocuments(query);
        logger.info('COD discrepancy list query', {
            companyId,
            status,
            type,
            search,
            startDate,
            endDate,
            page: Number(page),
            limit: Number(limit),
            count: discrepancies.length,
            total,
        });

        sendPaginated(res, discrepancies, {
            total,
            page: Number(page),
            limit: Number(limit),
            pages: Math.ceil(total / Number(limit)),
            hasNext: Number(page) < Math.ceil(total / Number(limit)),
            hasPrev: Number(page) > 1
        }, 'Discrepancies retrieved');
    });

    /**
     * Get Single Discrepancy
     */
    static getDiscrepancy = asyncHandler(async (req: Request, res: Response) => {
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const { id } = req.params;
        const discrepancy = await CODDiscrepancy.findOne({
            _id: id,
            companyId: auth.companyId,
        }).populate('shipmentId');

        if (!discrepancy) {
            throw new Error('Discrepancy not found');
        }

        sendSuccess(res, discrepancy, 'Discrepancy details retrieved');
    });

    /**
     * Resolve Discrepancy
     */
    static resolveDiscrepancy = asyncHandler(async (req: Request, res: Response) => {
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const { id } = req.params;
        const { method, adjustedAmount, remarks } = req.body;
        const resolvedBy = auth.userId;

        const discrepancy = await CODDiscrepancy.findOne({
            _id: id,
            companyId: auth.companyId,
        });
        if (!discrepancy) {
            throw new Error('Discrepancy not found');
        }

        await CODDiscrepancyService.resolveDiscrepancy(id, {
            method,
            adjustedAmount,
            resolvedBy,
            remarks
        });

        sendSuccess(res, null, 'Discrepancy resolved successfully');
    });
}
