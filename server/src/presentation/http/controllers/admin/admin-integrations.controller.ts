import { NextFunction, Request, Response } from 'express';
import { IntegrationHealthService } from '../../../../core/application/services/integrations/integration-health.service';
import { guardChecks, requirePlatformAdmin } from '../../../../shared/helpers/controller.helpers';
import { sendSuccess } from '../../../../shared/utils/responseHelper';

export const getPlatformIntegrationHealth = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
        requirePlatformAdmin(auth);

        const companyId = req.query.companyId ? String(req.query.companyId) : undefined;
        const health = await IntegrationHealthService.getPlatformHealth(companyId);

        sendSuccess(res, health, 'Admin integration health retrieved');
    } catch (error) {
        next(error);
    }
};

export default {
    getPlatformIntegrationHealth,
};
