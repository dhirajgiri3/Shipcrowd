/**
 * Ekart Integration Controller
 * 
 * Handles Ekart courier credential management
 */

import { Request, Response, NextFunction } from 'express';
import { Integration } from '../../../../infrastructure/database/mongoose/models';
import { guardChecks, requireCompanyContext } from '../../../../shared/helpers/controller.helpers';
import { AuthenticationError, ValidationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import { sendSuccess } from '../../../../shared/utils/responseHelper';
import logger from '../../../../shared/logger/winston.logger';

export class EkartController {
    /**
     * POST /api/v1/integrations/ekart/config
     * 
     * Save or update Ekart API credentials
     */
    static async saveConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const companyId = auth.companyId;
            const { clientId, username, password } = req.body;

            // Validate required fields
            if (!clientId || !username || !password) {
                throw new ValidationError('clientId, username, and password are required');
            }

            // Upsert integration credentials
            const integration = await Integration.findOneAndUpdate(
                {
                    companyId,
                    $or: [{ provider: 'ekart' }, { platform: 'ekart' }],
                    type: 'courier'
                },
                {
                    $set: {
                        provider: 'ekart',
                        platform: 'ekart',
                        'credentials.clientId': clientId,
                        'credentials.username': username,
                        'credentials.password': password,
                        'settings.isActive': true,
                        updatedAt: new Date()
                    }
                },
                {
                    upsert: true,
                    new: true
                }
            );

            logger.info('Ekart credentials saved', {
                companyId,
                userId: auth.userId,
                integrationId: integration._id
            });

            sendSuccess(res, {
                integrationId: integration._id,
                isActive: integration.settings.isActive
            }, 'Ekart credentials saved successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/integrations/ekart/config
     * 
     * Get current Ekart integration status (without exposing credentials)
     */
    static async getConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const companyId = auth.companyId;

            const integration = await Integration.findOne({
                companyId,
                $or: [{ provider: 'ekart' }, { platform: 'ekart' }],
                type: 'courier'
            }).lean();

            sendSuccess(res, {
                isConfigured: !!integration,
                isActive: integration?.settings?.isActive || false,
                lastUpdated: integration?.updatedAt
            }, 'Ekart configuration retrieved');
        } catch (error) {
            next(error);
        }
    }
}

export default EkartController;
