import express from 'express';
import asyncHandler from '../../../../../shared/utils/asyncHandler';
import companyGroupController from '../../../controllers/admin/company-group.controller';
import { requireAccess } from '../../../middleware';
import { authenticate, csrfProtection } from '../../../middleware/auth/auth';

const router = express.Router();

router.use(authenticate, requireAccess({ roles: ['admin'] }));

/**
 * @route GET /api/v1/admin/company-groups
 * @desc Get all company groups
 * @access Admin, Super Admin
 */
router.get('/', asyncHandler(companyGroupController.getCompanyGroups));

/**
 * @route POST /api/v1/admin/company-groups
 * @desc Create company group
 * @access Admin, Super Admin
 */
router.post('/', csrfProtection, asyncHandler(companyGroupController.createCompanyGroup));

/**
 * @route PATCH /api/v1/admin/company-groups/:id
 * @desc Update company group
 * @access Admin, Super Admin
 */
router.patch('/:id', csrfProtection, asyncHandler(companyGroupController.updateCompanyGroup));

/**
 * @route DELETE /api/v1/admin/company-groups/:id
 * @desc Delete company group
 * @access Admin, Super Admin
 */
router.delete('/:id', csrfProtection, asyncHandler(companyGroupController.deleteCompanyGroup));

export default router;
