import express from 'express';
import { authenticate, csrfProtection } from '../../../middleware/auth/auth';
import companyController from '../../../controllers/organization/company.controller';
import warehouseController from '../../../controllers/shipping/warehouse.controller';
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
router.get('/', authenticate, asyncHandler(companyController.getAllCompanies));

/**
 * @route POST /companies
 * @desc Create a new company
 * @access Private
 */
router.post('/', authenticate, csrfProtection, asyncHandler(companyController.createCompany));

/**
 * @route GET /companies/:companyId
 * @desc Get a company by ID
 * @access Private
 */
router.get('/:companyId', authenticate, asyncHandler(companyController.getCompanyById));

/**
 * @route GET /companies/stats
 * @desc Get company statistics (admin only)
 * @access Private (Admin)
 */
router.get('/stats', authenticate, asyncHandler(companyController.getCompanyStats));

/**
 * @route POST /companies/:companyId/invite-owner
 * @desc Invite owner for a company (admin only)
 * @access Private (Admin)
 */
router.post('/:companyId/invite-owner', authenticate, csrfProtection, asyncHandler(companyController.inviteCompanyOwner));

/**
 * @route PATCH /companies/:companyId/status
 * @desc Update company status (admin only)
 * @access Private (Admin)
 */
router.patch('/:companyId/status', authenticate, csrfProtection, asyncHandler(companyController.updateCompanyStatus));

/**
 * @route PUT /companies/:companyId
 * @desc Update a company
 * @access Private
 */
router.patch('/:companyId', authenticate, csrfProtection, asyncHandler(companyController.updateCompany));

/**
 * Warehouse routes under company
 */

/**
 * @route POST /companies/:companyId/warehouses
 * @desc Create a new warehouse for a specific company
 * @access Private
 */
router.post('/:companyId/warehouses', authenticate, csrfProtection, asyncHandler(warehouseController.createWarehouse));

/**
 * @route GET /companies/:companyId/warehouses
 * @desc Get all warehouses for a specific company
 * @access Private
 */
router.get('/:companyId/warehouses', authenticate, asyncHandler(warehouseController.getWarehouses));

/**
 * @route POST /companies/:companyId/warehouses/import
 * @desc Import warehouses from CSV for a specific company
 * @access Private
 */
router.post(
  '/:companyId/warehouses/import',
  authenticate,
  csrfProtection,
  upload.single('file'),
  asyncHandler(warehouseController.importWarehouses)
);

/**
 * Team routes under company
 */

/**
 * @route POST /companies/:companyId/team/invite
 * @desc Invite a team member to a specific company
 * @access Private (Manager)
 */
router.post(
  '/:companyId/team/invite',
  authenticate,
  csrfProtection,
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
  asyncHandler(teamController.getTeamMembers)
);

export default router;