import { NextFunction, Request, Response } from 'express';
import LabelGeneratorService from '../../../../core/application/services/shipping/label-generator.service';
import LabelTemplate from '../../../../infrastructure/database/mongoose/models/shipping/label-template.model';
import { ValidationError } from '../../../../shared/errors/app.error';
import { guardChecks, requireCompanyContext, validateObjectId } from '../../../../shared/helpers/controller.helpers';
import logger from '../../../../shared/logger/winston.logger';
import { sendCreated, sendSuccess } from '../../../../shared/utils/responseHelper';

/**
 * Label Template Controller
 * Manage custom label designs
 */

/**
 * GET /api/v1/labels/templates
 * List all label templates for company
 */
export const listTemplates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const { type, format, isActive } = req.query;

        const filters: any = { companyId: auth.companyId };
        if (type) filters.type = type;
        if (format) filters.format = format;
        if (isActive !== undefined) filters.isActive = isActive === 'true';

        const templates = await LabelTemplate.find(filters)
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email')
            .sort({ isDefault: -1, createdAt: -1 })
            .lean();

        sendSuccess(res, { templates, total: templates.length }, 'Label templates retrieved successfully');
    } catch (error) {
        logger.error('Error listing label templates:', error);
        next(error);
    }
};

/**
 * GET /api/v1/labels/templates/:id
 * Get single label template
 */
export const getTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const { id } = req.params;
        validateObjectId(id, 'template');

        const template = await LabelTemplate.findOne({
            _id: id,
            companyId: auth.companyId,
        })
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email')
            .lean();

        if (!template) {
            throw new ValidationError('Label template not found');
        }

        sendSuccess(res, { template }, 'Label template retrieved successfully');
    } catch (error) {
        logger.error('Error getting label template:', error);
        next(error);
    }
};

/**
 * POST /api/v1/labels/templates
 * Create new label template
 */
export const createTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const templateData = {
            ...req.body,
            companyId: auth.companyId,
            createdBy: auth.userId,
        };

        // Validate required fields
        if (!templateData.name || !templateData.type || !templateData.format) {
            throw new ValidationError('Name, type, and format are required');
        }

        const template = await LabelTemplate.create(templateData);

        logger.info('Label template created', {
            templateId: template._id,
            companyId: auth.companyId,
            createdBy: auth.userId,
        });

        sendCreated(res, { template }, 'Label template created successfully');
    } catch (error) {
        logger.error('Error creating label template:', error);
        next(error);
    }
};

/**
 * PATCH /api/v1/labels/templates/:id
 * Update label template
 */
export const updateTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const { id } = req.params;
        validateObjectId(id, 'template');

        const template = await LabelTemplate.findOne({
            _id: id,
            companyId: auth.companyId,
        });

        if (!template) {
            throw new ValidationError('Label template not found');
        }

        // Update fields
        const allowedUpdates = [
            'name', 'description', 'type', 'format', 'pageSize', 'customDimensions',
            'layout', 'branding', 'printSettings', 'supportedVariables', 'isActive', 'isDefault'
        ];

        allowedUpdates.forEach((field) => {
            if (req.body[field] !== undefined) {
                (template as any)[field] = req.body[field];
            }
        });

        template.updatedBy = auth.userId as any;
        await template.save();

        logger.info('Label template updated', {
            templateId: template._id,
            updatedBy: auth.userId,
        });

        sendSuccess(res, { template }, 'Label template updated successfully');
    } catch (error) {
        logger.error('Error updating label template:', error);
        next(error);
    }
};

/**
 * DELETE /api/v1/labels/templates/:id
 * Delete label template
 */
export const deleteTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const { id } = req.params;
        validateObjectId(id, 'template');

        const template = await LabelTemplate.findOne({
            _id: id,
            companyId: auth.companyId,
        });

        if (!template) {
            throw new ValidationError('Label template not found');
        }

        if (template.isDefault) {
            throw new ValidationError('Cannot delete default template. Set another template as default first.');
        }

        await template.deleteOne();

        logger.info('Label template deleted', {
            templateId: template._id,
            deletedBy: auth.userId,
        });

        sendSuccess(res, null, 'Label template deleted successfully');
    } catch (error) {
        logger.error('Error deleting label template:', error);
        next(error);
    }
};

/**
 * POST /api/v1/labels/templates/:id/duplicate
 * Duplicate label template
 */
export const duplicateTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const { id } = req.params;
        validateObjectId(id, 'template');

        const original = await LabelTemplate.findOne({
            _id: id,
            companyId: auth.companyId,
        }).lean();

        if (!original) {
            throw new ValidationError('Label template not found');
        }

        const duplicate = await LabelTemplate.create({
            ...original,
            _id: undefined,
            name: `${original.name} (Copy)`,
            isDefault: false,
            createdBy: auth.userId,
            usageCount: 0,
            lastUsedAt: undefined,
            createdAt: undefined,
            updatedAt: undefined,
        });

        logger.info('Label template duplicated', {
            originalId: id,
            duplicateId: duplicate._id,
            createdBy: auth.userId,
        });

        sendCreated(res, { template: duplicate }, 'Label template duplicated successfully');
    } catch (error) {
        logger.error('Error duplicating label template:', error);
        next(error);
    }
};

/**
 * POST /api/v1/labels/templates/:id/set-default
 * Set template as default
 */
export const setAsDefault = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const { id } = req.params;
        validateObjectId(id, 'template');

        const template = await LabelTemplate.findOne({
            _id: id,
            companyId: auth.companyId,
            isActive: true,
        });

        if (!template) {
            throw new ValidationError('Label template not found or inactive');
        }

        // Unset other defaults for this type
        await LabelTemplate.updateMany(
            {
                companyId: auth.companyId,
                type: template.type,
                _id: { $ne: template._id },
            },
            {
                $set: { isDefault: false },
            }
        );

        template.isDefault = true;
        template.updatedBy = auth.userId as any;
        await template.save();

        logger.info('Label template set as default', {
            templateId: template._id,
            type: template.type,
            updatedBy: auth.userId,
        });

        sendSuccess(res, { template }, 'Template set as default successfully');
    } catch (error) {
        logger.error('Error setting default template:', error);
        next(error);
    }
};

/**
 * POST /api/v1/labels/generate/:orderId
 * Generate label for an order
 */
export const generateLabel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const { orderId } = req.params;
        const { templateId } = req.body;

        validateObjectId(orderId, 'order');
        if (templateId) validateObjectId(templateId, 'template');

        const labelBuffer = await LabelGeneratorService.generateLabel(
            orderId,
            auth.companyId.toString(),
            templateId
        );

        // Set appropriate headers based on format
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=label-${orderId}.pdf`);
        res.send(labelBuffer);
    } catch (error) {
        logger.error('Error generating label:', error);
        next(error);
    }
};

/**
 * POST /api/v1/labels/templates/create-default
 * Create default template for company
 */
export const createDefaultTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        // Check if default already exists
        const existing = await LabelTemplate.findOne({
            companyId: auth.companyId,
            isDefault: true,
        });

        if (existing) {
            throw new ValidationError('Default template already exists');
        }

        const template = await LabelGeneratorService.createDefaultTemplate(
            auth.companyId.toString(),
            auth.userId.toString()
        );

        sendCreated(res, { template }, 'Default label template created successfully');
    } catch (error) {
        logger.error('Error creating default template:', error);
        next(error);
    }
};

export default {
    listTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    setAsDefault,
    generateLabel,
    createDefaultTemplate,
};
