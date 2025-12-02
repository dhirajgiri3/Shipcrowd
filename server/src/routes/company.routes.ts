import express, { Request, Response, NextFunction } from 'express';
import { authenticate, csrfProtection } from '../middleware/auth';
import companyController from '../controllers/company.controller';
import warehouseController from '../controllers/warehouse.controller';
import teamController from '../controllers/team.controller';
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

// Type assertion for request handlers to make TypeScript happy
type RequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;
const asHandler = (fn: any): RequestHandler => fn as RequestHandler;

/**
 * @route GET /companies
 * @desc Get all companies (admin only)
 * @access Private (Admin)
 */
router.get('/', authenticate, asHandler(companyController.getAllCompanies));

/**
 * @route POST /companies
 * @desc Create a new company
 * @access Private
 */
router.post('/', authenticate, csrfProtection, asHandler(companyController.createCompany));

/**
 * @route GET /companies/:companyId
 * @desc Get a company by ID
 * @access Private
 */
router.get('/:companyId', authenticate, asHandler(companyController.getCompanyById));

/**
 * @route PUT /companies/:companyId
 * @desc Update a company
 * @access Private
 */
router.put('/:companyId', authenticate, csrfProtection, asHandler(companyController.updateCompany));

/**
 * Warehouse routes under company
 */

/**
 * @route POST /companies/:companyId/warehouses
 * @desc Create a new warehouse for a specific company
 * @access Private
 */
router.post('/:companyId/warehouses', authenticate, csrfProtection, asHandler(warehouseController.createWarehouse));

/**
 * @route GET /companies/:companyId/warehouses
 * @desc Get all warehouses for a specific company
 * @access Private
 */
router.get('/:companyId/warehouses', authenticate, asHandler(warehouseController.getWarehouses));

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
  asHandler(warehouseController.importWarehouses)
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
  asHandler(teamController.inviteTeamMember)
);

/**
 * @route GET /companies/:companyId/team
 * @desc Get all team members for a specific company
 * @access Private
 */
router.get(
  '/:companyId/team',
  authenticate,
  asHandler(teamController.getTeamMembers)
);

export default router;