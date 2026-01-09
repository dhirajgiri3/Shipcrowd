/**
 * Integrations Controller
 *
 * Handles cross-platform integration endpoints:
 * - GET /integrations/health - Get health status of all integrations
 */

import { Request, Response, NextFunction } from 'express';
import IntegrationHealthService from '../../../../core/application/services/integrations/integration-health.service';
import { AppError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';

export default class IntegrationsController {
    /**
     * GET /api/v1/integrations/health
     *
     * Get health status of all platform integrations for monitoring dashboard
     */
    static async getHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;

            if (!companyId) {
                throw new AppError('Company ID not found in request', 'UNAUTHORIZED', 401);
            }

            const health = await IntegrationHealthService.getHealth(companyId);

            logger.info('Integration health retrieved', {
                companyId,
                userId: req.user?._id,
                totalStores: health.summary.totalStores,
            });

            res.json({
                success: true,
                data: health,
            });
        } catch (error) {
            next(error);
        }
    }
}
