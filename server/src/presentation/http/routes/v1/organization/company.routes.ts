import express from 'express';
import { authenticate, csrfProtection } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware/index';
import { AccessTier } from '../../../../../core/domain/types/access-tier';
import companyController from '../../../controllers/organization/company.controller';
import warehouseController from '../../../controllers/warehouse/warehouse.controller';
import teamController from '../../../controllers/organization/team.controller';
import asyncHandler from '../../../../../shared/utils/asyncHandler';
import multer from 'multer';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Accept only CSV files
    if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error('Only CSV files are allowed'));
    }
  },
});

/**
 * @route GET /companies
 * @desc Get all companies (admin only)
 * @access Private (Admin)
 */
router.get(
  '/',
  authenticate,
  requireAccess({ roles: ['admin'] }),
  asyncHandler(companyController.getAllCompanies)
);

/**
 * @route POST /companies
 * @desc Create a new company
 * @access Private
 */
router.post(
  '/',
  authenticate,
  csrfProtection,
  // No AccessTier check needed for company creation (onboarding step)
  asyncHandler(companyController.createCompany)
);

/**
 * @route GET /companies/:companyId
 * @desc Get a company by ID
 * @access Private (Owner/Admin or Platform Admin)
 */
router.get(
  '/:companyId',
  authenticate,
  requireAccess({ companyMatch: true }),
  asyncHandler(companyController.getCompanyById)
);

/**
 * @route GET /companies/stats
 * @desc Get company statistics (admin only)
 * @access Private (Admin)
 */
router.get(
  '/stats',
  authenticate,
  requireAccess({ roles: ['admin'] }),
  asyncHandler(companyController.getCompanyStats)
);

/**
 * @route POST /companies/:companyId/invite-owner
 * @desc Invite owner for a company (admin only)
 * @access Private (Admin)
 */
router.post(
  '/:companyId/invite-owner',
  authenticate,
  csrfProtection,
  requireAccess({ roles: ['admin'] }),
  asyncHandler(companyController.inviteCompanyOwner)
);

/**
 * @route PATCH /companies/:companyId/status
 * @desc Update company status (admin only)
 * @access Private (Admin)
 */
router.patch(
  '/:companyId/status',
  authenticate,
  csrfProtection,
  requireAccess({ roles: ['admin'] }),
  asyncHandler(companyController.updateCompanyStatus)
);

/**
 * @route PATCH /companies/:companyId
 * @desc Update a company
 * @access Private (Owner/Admin)
 */
router.patch(
  '/:companyId',
  authenticate,
  csrfProtection,
  requireAccess({ companyMatch: true, teamRoles: ['owner', 'admin'] }),
  asyncHandler(companyController.updateCompany)
);

/**
 * @route POST /companies/:companyId/assign-ratecard
 * @desc Assign a rate card to a company
 * @access Private (Owner/Admin)
 */
router.post(
  '/:companyId/assign-ratecard',
  authenticate,
  csrfProtection,
  requireAccess({ companyMatch: true, teamRoles: ['owner', 'admin'] }),
  asyncHandler(companyController.assignRateCard)
);

/**
 * Warehouse routes under company
 */

/**
 * @route POST /companies/:companyId/warehouses
 * @desc Create a new warehouse for a specific company
 * @access Private (Production + Owner/Admin)
 */
router.post(
  '/:companyId/warehouses',
  authenticate,
  csrfProtection,
  requireAccess({
    companyMatch: true,
    teamRoles: ['owner', 'admin'],
    tier: AccessTier.PRODUCTION,
    kyc: true
  }),
  asyncHandler(warehouseController.createWarehouse)
);

/**
 * @route GET /companies/:companyId/warehouses
 * @desc Get all warehouses for a specific company
 * @access Private (Sandbox+)
 */
router.get(
  '/:companyId/warehouses',
  authenticate,
  requireAccess({ companyMatch: true, tier: AccessTier.SANDBOX }),
  asyncHandler(warehouseController.getWarehouses)
);

/**
 * @route POST /companies/:companyId/warehouses/import
 * @desc Import warehouses from CSV for a specific company
 * @access Private (Production)
 */
router.post(
  '/:companyId/warehouses/import',
  authenticate,
  csrfProtection,
  requireAccess({
    companyMatch: true,
    teamRoles: ['owner', 'admin'],
    tier: AccessTier.PRODUCTION,
    kyc: true
  }),
  upload.single('file'),
  asyncHandler(warehouseController.importWarehouses)
);

/**
 * Team routes under company
 */

/**
 * @route POST /companies/:companyId/team/invite
 * @desc Invite a team member to a specific company
 * @access Private (Manager+)
 */
router.post(
  '/:companyId/team/invite',
  authenticate,
  csrfProtection,
  requireAccess({ companyMatch: true, teamRoles: ['owner', 'admin', 'manager'] }),
  asyncHandler(teamController.inviteTeamMember)
);

/**
 * @route GET /companies/:companyId/team
 * @desc Get all team members for a specific company
 * @access Private
 */
router.get(
  '/:companyId/team',
  authenticate,
  requireAccess({ companyMatch: true }),
  asyncHandler(teamController.getTeamMembers)
);

export default router;