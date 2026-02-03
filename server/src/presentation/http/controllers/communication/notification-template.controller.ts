import { Request, Response, NextFunction } from 'express';
import NotificationTemplateService from '../../../../core/application/services/communication/notification-template.service';
import { ValidationError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';
import { sendSuccess, sendCreated } from '../../../../shared/utils/responseHelper';
import { isPlatformAdmin } from '../../../../shared/utils/role-helpers';

/**
 * Notification Template Controller
 *
 * Handles notification template management
 *
 * Endpoints:
 * 1. POST /templates - Create template
 * 2. GET /templates - List templates
 * 3. GET /templates/:id - Get template details
 * 4. PATCH /templates/:id - Update template
 * 5. DELETE /templates/:id - Delete template
 * 6. GET /templates/code/:code - Get template by code
 * 7. POST /templates/:id/render - Render template
 * 8. POST /templates/render-by-code - Render template by code
 * 9. GET /templates/stats - Get template statistics
 * 10. GET /templates/default/:category/:channel - Get default template
 */

class NotificationTemplateController {
    /**
     * Create notification template
     * POST /communication/templates
     */
    async createTemplate(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?._id?.toString();
            const companyId = req.user?.companyId?.toString();
            const isAdmin = req.user ? isPlatformAdmin(req.user) : false;

            const { name, code, category, channel, subject, body, isDefault } = req.body;

            // Validation
            if (!name || !code || !category || !channel || !body) {
                throw new ValidationError('Missing required fields: name, code, category, channel, body');
            }

            // Global templates can only be created by admins
            const templateCompanyId = req.body.companyId === null || req.body.companyId === undefined
                ? (isAdmin ? undefined : companyId)
                : req.body.companyId;

            if (templateCompanyId === undefined && !isAdmin) {
                throw new ValidationError('Only admins can create global templates');
            }

            const template = await NotificationTemplateService.createTemplate({
                companyId: templateCompanyId,
                name,
                code,
                category,
                channel,
                subject,
                body,
                isDefault: isDefault || false,
            });

            logger.info(`Template created: ${template.code} by user ${userId}`);

            sendCreated(res, template, 'Notification template created successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * List notification templates
     * GET /communication/templates
     */
    async listTemplates(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId?.toString();
            const isAdmin = req.user ? isPlatformAdmin(req.user) : false;

            const {
                category,
                channel,
                isActive,
                includeGlobal,
                page = '1',
                limit = '100',
            } = req.query;

            const result = await NotificationTemplateService.listTemplates({
                companyId: isAdmin && req.query.companyId === 'global' ? undefined : companyId,
                category: category as string,
                channel: channel as string,
                isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
                includeGlobal: includeGlobal === 'true',
                limit: parseInt(limit as string),
                skip: (parseInt(page as string) - 1) * parseInt(limit as string),
            });

            sendSuccess(res, result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get template details
     * GET /communication/templates/:id
     */
    async getTemplate(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            const template = await NotificationTemplateService.getTemplate(id);

            sendSuccess(res, template);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get template by code
     * GET /communication/templates/code/:code
     */
    async getTemplateByCode(req: Request, res: Response, next: NextFunction) {
        try {
            const { code } = req.params;
            const companyId = req.user?.companyId?.toString();

            const template = await NotificationTemplateService.getTemplateByCode(code, companyId);

            if (!template) {
                sendSuccess(res, null, 'Template not found');
                return;
            }

            sendSuccess(res, template);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update template
     * PATCH /communication/templates/:id
     */
    async updateTemplate(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const companyId = req.user?.companyId?.toString();
            const isAdmin = req.user ? isPlatformAdmin(req.user) : false;

            const { name, subject, body, isActive, isDefault } = req.body;

            // Validate at least one field is being updated
            if (name === undefined && subject === undefined && body === undefined && isActive === undefined && isDefault === undefined) {
                throw new ValidationError('At least one field must be provided for update');
            }

            const template = await NotificationTemplateService.updateTemplate(
                id,
                isAdmin ? undefined : companyId,
                { name, subject, body, isActive, isDefault }
            );

            sendSuccess(res, template, 'Template updated successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete template
     * DELETE /communication/templates/:id
     */
    async deleteTemplate(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const companyId = req.user?.companyId?.toString();
            const isAdmin = req.user ? isPlatformAdmin(req.user) : false;

            await NotificationTemplateService.deleteTemplate(
                id,
                isAdmin ? undefined : companyId
            );

            sendSuccess(res, { deleted: true }, 'Template deleted successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get default template for category/channel
     * GET /communication/templates/default/:category/:channel
     */
    async getDefaultTemplate(req: Request, res: Response, next: NextFunction) {
        try {
            const { category, channel } = req.params;
            const companyId = req.user?.companyId?.toString();

            const template = await NotificationTemplateService.getDefaultTemplate(
                category,
                channel,
                companyId
            );

            if (!template) {
                sendSuccess(res, null, 'No default template found');
                return;
            }

            sendSuccess(res, template);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Render template with variables
     * POST /communication/templates/:id/render
     */
    async renderTemplate(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { variables } = req.body;

            if (!variables || typeof variables !== 'object') {
                throw new ValidationError('variables object is required');
            }

            const result = await NotificationTemplateService.renderTemplate(id, variables);

            sendSuccess(res, result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Render template by code with variables
     * POST /communication/templates/render-by-code
     */
    async renderTemplateByCode(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId?.toString();
            const { code, variables } = req.body;

            if (!code) {
                throw new ValidationError('code is required');
            }

            if (!variables || typeof variables !== 'object') {
                throw new ValidationError('variables object is required');
            }

            const result = await NotificationTemplateService.renderTemplateByCode(
                code,
                variables,
                companyId
            );

            sendSuccess(res, result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get template statistics
     * GET /communication/templates/stats
     */
    async getTemplateStats(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId?.toString();
            const isAdmin = req.user ? isPlatformAdmin(req.user) : false;

            const stats = await NotificationTemplateService.getTemplateStats(
                isAdmin && req.query.companyId === 'global' ? undefined : companyId
            );

            sendSuccess(res, stats);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Seed default templates (admin only)
     * POST /communication/templates/seed-defaults
     */
    async seedDefaultTemplates(req: Request, res: Response, next: NextFunction) {
        try {
            const isAdmin = req.user ? isPlatformAdmin(req.user) : false;

            if (!isAdmin) {
                throw new ValidationError('Only admins can seed default templates');
            }

            await NotificationTemplateService.seedDefaultTemplates();

            sendSuccess(res, { seeded: true }, 'Default templates seeded successfully');
        } catch (error) {
            next(error);
        }
    }
}

export default new NotificationTemplateController();
