/**
 * Integrations Controller
 *
 * Handles cross-platform integration endpoints:
 * - GET /integrations/health - Get health status of all integrations
 */

import { Request, Response, NextFunction } from 'express';
import IntegrationHealthService from '../../../../core/application/services/integrations/integration-health.service';
import { guardChecks, requireCompanyContext } from '../../../../shared/helpers/controller.helpers';
import { AuthenticationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import { sendSuccess } from '../../../../shared/utils/responseHelper';
import logger from '../../../../shared/logger/winston.logger';

export default class IntegrationsController {
    /**
     * GET /api/v1/integrations/health
     *
     * Get health status of all platform integrations for monitoring dashboard
     */
    static async getHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const companyId = auth.companyId;

            const health = await IntegrationHealthService.getHealth(companyId);

            logger.info('Integration health retrieved', {
                companyId,
                userId: auth.userId,
                totalStores: health.summary.totalStores,
            });

            sendSuccess(res, health, 'Integration health retrieved');
        } catch (error) {
            next(error);
        }
    }
}
