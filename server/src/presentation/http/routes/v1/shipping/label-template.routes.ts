import express from 'express';
import asyncHandler from '../../../../../shared/utils/asyncHandler';
import labelTemplateController from '../../../controllers/shipping/label-template.controller';
import { csrfProtection } from '../../../middleware';
import { authenticate } from '../../../middleware/auth/auth';

const router = express.Router();

/**
 * @route GET /api/v1/labels/templates
 * @desc List all label templates
 * @access Private
 * @query type - Filter by type (shipping/return/combined)
 * @query format - Filter by format (pdf/thermal/zpl)
 * @query isActive - Filter by status
 */
router.get(
    '/templates',
    authenticate,
    asyncHandler(labelTemplateController.listTemplates)
);

/**
 * @route GET /api/v1/labels/templates/:id
 * @desc Get single label template
 * @access Private
 */
router.get(
    '/templates/:id',
    authenticate,
    asyncHandler(labelTemplateController.getTemplate)
);

/**
 * @route POST /api/v1/labels/templates
 * @desc Create new label template
 * @access Private
 */
router.post(
    '/templates',
    authenticate,
    csrfProtection,
    asyncHandler(labelTemplateController.createTemplate)
);

/**
 * @route POST /api/v1/labels/templates/create-default
 * @desc Create default label template for company
 * @access Private
 */
router.post(
    '/templates/create-default',
    authenticate,
    csrfProtection,
    asyncHandler(labelTemplateController.createDefaultTemplate)
);

/**
 * @route PATCH /api/v1/labels/templates/:id
 * @desc Update label template
 * @access Private
 */
router.patch(
    '/templates/:id',
    authenticate,
    csrfProtection,
    asyncHandler(labelTemplateController.updateTemplate)
);

/**
 * @route DELETE /api/v1/labels/templates/:id
 * @desc Delete label template
 * @access Private
 */
router.delete(
    '/templates/:id',
    authenticate,
    csrfProtection,
    asyncHandler(labelTemplateController.deleteTemplate)
);

/**
 * @route POST /api/v1/labels/templates/:id/duplicate
 * @desc Duplicate label template
 * @access Private
 */
router.post(
    '/templates/:id/duplicate',
    authenticate,
    csrfProtection,
    asyncHandler(labelTemplateController.duplicateTemplate)
);

/**
 * @route POST /api/v1/labels/templates/:id/set-default
 * @desc Set template as default
 * @access Private
 */
router.post(
    '/templates/:id/set-default',
    authenticate,
    csrfProtection,
    asyncHandler(labelTemplateController.setAsDefault)
);

/**
 * @route POST /api/v1/labels/generate/:orderId
 * @desc Generate label for an order
 * @access Private
 * @body templateId - Optional template ID (uses default if not specified)
 */
router.post(
    '/generate/:orderId',
    authenticate,
    csrfProtection,
    asyncHandler(labelTemplateController.generateLabel)
);

export default router;
