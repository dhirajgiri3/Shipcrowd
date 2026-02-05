import { Request, Response } from 'express';
import { asyncHandler } from '../../../../shared/utils/asyncHandler';
import { EarlyCODService } from '../../../../core/application/services/finance/early-cod.service';
import { CODRemittanceService } from '../../../../core/application/services/finance/cod-remittance.service';
import { sendSuccess } from '../../../../shared/utils/responseHelper';

export class EarlyCODController {

    /**
     * Check Eligibility
     */
    static checkEligibility = asyncHandler(async (req: Request, res: Response) => {
        // @ts-ignore
        const companyId = req.user.companyId.toString();
        const result = await EarlyCODService.checkEligibility(companyId);
        sendSuccess(res, result, 'Eligibility status retrieved');
    });

    /**
     * Enroll in Program
     */
    static enroll = asyncHandler(async (req: Request, res: Response) => {
        // @ts-ignore
        const companyId = req.user.companyId.toString();
        const { tier } = req.body; // 'T+1', 'T+2'

        const result = await EarlyCODService.enroll(companyId, tier);
        sendSuccess(res, result, 'Enrolled in Early COD successfully');
    });

    /**
     * Create Early Batch
     * (Manually triggered by user or auto-job, here exposing manual trigger)
     */
    static createEarlyBatch = asyncHandler(async (req: Request, res: Response) => {
        // @ts-ignore
        const companyId = req.user.companyId.toString();
        const batch = await CODRemittanceService.createEarlyRemittanceBatch(companyId);

        sendSuccess(res, batch, 'Early COD remittance batch created');
    });

    /**
     * Get Current Enrollment
     */
    static getEnrollment = asyncHandler(async (req: Request, res: Response) => {
        // @ts-ignore
        const companyId = req.user.companyId.toString();
        // Implement logic to fetch enrollment if needed, or re-use checkEligibility
        const enrollment = await EarlyCODService.getActiveEnrollment(companyId);
        sendSuccess(res, enrollment, 'Enrollment details retrieved');
    });
}
