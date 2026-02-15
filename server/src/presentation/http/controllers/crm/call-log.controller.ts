import CallLogService from '@/core/application/services/crm/communication/CallLogService';
import { ValidationError } from '@/shared/errors/app.error';
import { NextFunction, Request, Response } from 'express';

class CallLogController {

    /**
     * Create a new call log (Manual schedule)
     */
    public createCallLog = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { companyId } = req.user as any;
            const log = await CallLogService.getInstance().createCallLog({
                companyId,
                ...req.body
            });
            res.status(201).json({ success: true, data: log });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Update call outcome
     */
    public updateOutcome = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const { outcome, notes, duration } = req.body;

            const log = await CallLogService.getInstance().updateCallOutcome(id, outcome, notes, duration);
            res.status(200).json({ success: true, data: log });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Get logs for a logged-in Sales Rep
     */
    public getMyLogs = async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Assuming the authenticated user IS the sales rep or linked to one.
            // For now, let's assume req.user.salesRepId exists (if we have middleware for it) 
            // OR we pass salesRepId in query if admin, or derive from user.

            // For Phase 3, let's assume we pass repId or fetch from context.
            // Simplified: If user is sales_rep role, find their Rep record.

            // TODO: Extract SalesRep ID from User context properly. 
            // For this controller proof of concept, we'll assume the client passes salesRepId 
            // OR we fetch it from the route/query for simplicity until we middleware-ize it.

            const { salesRepId } = req.query;
            const status = req.query.status as string;

            if (!salesRepId) {
                throw new ValidationError('salesRepId is required');
            }

            const logs = await CallLogService.getInstance().getLogsForRep(salesRepId as string, status);
            res.status(200).json({ success: true, data: logs });
        } catch (error) {
            next(error);
        }
    };
}

export default new CallLogController();
