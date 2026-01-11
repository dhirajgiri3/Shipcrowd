import express from 'express';
import { authenticate, csrfProtection } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware/index';
import { AccessTier } from '../../../../../core/domain/types/access-tier';
import warehouseController from '../../../controllers/warehouse/warehouse.controller';
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
 * @route POST /warehouses
 * @desc Create a new warehouse
 * @access Private (Production)
 */
router.post(
  '/',
  authenticate,
  csrfProtection,
  requireAccess({ tier: AccessTier.PRODUCTION, kyc: true }),
  asyncHandler(warehouseController.createWarehouse)
);

/**
 * @route GET /warehouses
 * @desc Get all warehouses
 * @access Private (Sandbox+)
 */
router.get(
  '/',
  authenticate,
  requireAccess({ tier: AccessTier.SANDBOX }),
  asyncHandler(warehouseController.getWarehouses)
);

/**
 * @route GET /warehouses/:warehouseId
 * @desc Get a warehouse by ID
 * @access Private (Sandbox+)
 */
router.get(
  '/:warehouseId',
  authenticate,
  requireAccess({ tier: AccessTier.SANDBOX }),
  asyncHandler(warehouseController.getWarehouseById)
);

/**
 * @route PATCH /warehouses/:warehouseId
 * @desc Update a warehouse
 * @access Private (Production)
 */
router.patch(
  '/:warehouseId',
  authenticate,
  csrfProtection,
  requireAccess({ tier: AccessTier.PRODUCTION, kyc: true }),
  asyncHandler(warehouseController.updateWarehouse)
);

/**
 * @route DELETE /warehouses/:warehouseId
 * @desc Delete a warehouse
 * @access Private (Production)
 */
router.delete(
  '/:warehouseId',
  authenticate,
  csrfProtection,
  requireAccess({ tier: AccessTier.PRODUCTION, kyc: true }),
  asyncHandler(warehouseController.deleteWarehouse)
);

/**
 * @route POST /warehouses/import
 * @desc Import warehouses from CSV
 * @access Private (Production)
 */
router.post(
  '/import',
  authenticate,
  csrfProtection,
  requireAccess({ tier: AccessTier.PRODUCTION, kyc: true }),
  upload.single('file'),
  asyncHandler(warehouseController.importWarehouses)
);

export default router;
