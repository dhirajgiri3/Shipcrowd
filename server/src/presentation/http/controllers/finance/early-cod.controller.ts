import { Request, Response } from 'express';
import { CODRemittanceService } from '../../../../core/application/services/finance/cod-remittance.service';
import { EarlyCODService } from '../../../../core/application/services/finance/early-cod.service';
import { guardChecks, requireCompanyContext } from '../../../../shared/helpers/controller.helpers';
import { asyncHandler } from '../../../../shared/utils/asyncHandler';
import { sendSuccess } from '../../../../shared/utils/responseHelper';

export class EarlyCODController {

    /**
     * Check Eligibility
     */
    static checkEligibility = asyncHandler(async (req: Request, res: Response) => {
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const result = await EarlyCODService.checkEligibility(auth.companyId);
        sendSuccess(res, result, 'Eligibility status retrieved');
    });

    /**
     * Enroll in Program
     */
    static enroll = asyncHandler(async (req: Request, res: Response) => {
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const { tier } = req.body; // 'T+1', 'T+2'

        const result = await EarlyCODService.enroll(auth.companyId, tier);
        sendSuccess(res, result, 'Enrolled in Early COD successfully');
    });

    /**
     * Create Early Batch
     * (Manually triggered by user or auto-job, here exposing manual trigger)
     */
    static createEarlyBatch = asyncHandler(async (req: Request, res: Response) => {
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const batch = await CODRemittanceService.createEarlyRemittanceBatch(auth.companyId);

        sendSuccess(res, batch, 'Early COD remittance batch created');
    });

    /**
     * Get Current Enrollment
     */
    static getEnrollment = asyncHandler(async (req: Request, res: Response) => {
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const enrollment = await EarlyCODService.getActiveEnrollment(auth.companyId);
        sendSuccess(res, enrollment, 'Enrollment details retrieved');
    });
}
