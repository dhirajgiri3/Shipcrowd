import express, { Request, Response, NextFunction } from 'express';
import { authenticate, csrfProtection } from '../../middleware/auth';
import warehouseController from '../../controllers/warehouse.controller';
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
 * @route POST /warehouses
 * @desc Create a new warehouse
 * @access Private
 */
router.post('/', authenticate, csrfProtection, asHandler(warehouseController.createWarehouse));

/**
 * @route GET /warehouses
 * @desc Get all warehouses for the current user's company
 * @access Private
 */
router.get('/', authenticate, asHandler(warehouseController.getWarehouses));

/**
 * @route GET /warehouses/:warehouseId
 * @desc Get a warehouse by ID
 * @access Private
 */
router.get('/:warehouseId', authenticate, asHandler(warehouseController.getWarehouseById));

/**
 * @route PATCH /warehouses/:warehouseId
 * @desc Update a warehouse
 * @access Private
 */
router.patch('/:warehouseId', authenticate, csrfProtection, asHandler(warehouseController.updateWarehouse));

/**
 * @route DELETE /warehouses/:warehouseId
 * @desc Delete a warehouse (soft delete)
 * @access Private
 */
router.delete('/:warehouseId', authenticate, csrfProtection, asHandler(warehouseController.deleteWarehouse));

/**
 * @route POST /warehouses/import
 * @desc Import warehouses from CSV
 * @access Private
 */
router.post(
  '/import',
  authenticate,
  csrfProtection,
  upload.single('file'),
  asHandler(warehouseController.importWarehouses)
);

export default router;
