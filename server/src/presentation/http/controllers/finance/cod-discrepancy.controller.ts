import { Request, Response } from 'express';
import { asyncHandler } from '../../../../shared/utils/asyncHandler';
import { guardChecks, requireCompanyContext } from '../../../../shared/helpers/controller.helpers';
import { CODDiscrepancyService } from '../../../../core/application/services/finance/cod-discrepancy.service';
import { sendSuccess, sendPaginated } from '../../../../shared/utils/responseHelper';
import CODDiscrepancy from '../../../../infrastructure/database/mongoose/models/finance/cod-discrepancy.model';

export class CODDiscrepancyController {

    /**
     * Get Discrepancies List with Filters
     */
    static getDiscrepancies = asyncHandler(async (req: Request, res: Response) => {
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const { status, type, page = 1, limit = 10 } = req.query;
        const companyId = auth.companyId;

        const query: any = { companyId };
        if (status) query.status = status;
        if (type) query.type = type;

        const discrepancies = await CODDiscrepancy.find(query)
            .sort({ createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit))
            .populate('shipmentId', 'trackingNumber paymentDetails.codAmount paymentDetails.actualCollection');

        const total = await CODDiscrepancy.countDocuments(query);

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
        const { id } = req.params;
        const discrepancy = await CODDiscrepancy.findById(id).populate('shipmentId');

        if (!discrepancy) {
            throw new Error('Discrepancy not found');
        }

        sendSuccess(res, discrepancy, 'Discrepancy details retrieved');
    });

    /**
     * Resolve Discrepancy
     */
    static resolveDiscrepancy = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const { method, adjustedAmount, remarks } = req.body;
        // @ts-ignore
        const resolvedBy = req.user.userId;

        await CODDiscrepancyService.resolveDiscrepancy(id, {
            method,
            adjustedAmount,
            resolvedBy,
            remarks
        });

        sendSuccess(res, null, 'Discrepancy resolved successfully');
    });
}
