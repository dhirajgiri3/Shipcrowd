import express from 'express';
import { authenticate, csrfProtection } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware/index';
import { AccessTier } from '../../../../../core/domain/types/access-tier';
import orderController from '../../../controllers/shipping/order.controller';
import asyncHandler from '../../../../../shared/utils/asyncHandler';
import multer from 'multer';

const router = express.Router();

// Configure multer for CSV file uploads
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
 * @route POST /api/v1/orders
 * @desc Create a new order
 * @access Private (Production)
 */
router.post(
    '/',
    authenticate,
    csrfProtection,
    requireAccess({ tier: AccessTier.PRODUCTION, kyc: true, roles: ['seller'], companyMatch: true }),
    asyncHandler(orderController.createOrder)
);

/**
 * @route GET /api/v1/orders
 * @desc Get all orders with pagination and filters
 * @access Private (Sandbox+)
 */
router.get(
    '/',
    authenticate,
    requireAccess({ tier: AccessTier.SANDBOX }),
    asyncHandler(orderController.getOrders)
);

/**
 * @route GET /api/v1/orders/:orderId
 * @desc Get a single order by ID
 * @access Private (Sandbox+)
 */
router.get(
    '/:orderId',
    authenticate,
    requireAccess({ tier: AccessTier.SANDBOX }),
    asyncHandler(orderController.getOrderById)
);

/**
 * @route PATCH /api/v1/orders/:orderId
 * @desc Update an order
 * @access Private (Production)
 */
router.patch(
    '/:orderId',
    authenticate,
    csrfProtection,
    requireAccess({ tier: AccessTier.PRODUCTION, kyc: true, roles: ['seller'], companyMatch: true }),
    asyncHandler(orderController.updateOrder)
);

/**
 * @route DELETE /api/v1/orders/:orderId
 * @desc Soft delete an order
 * @access Private (Production)
 */
router.delete(
    '/:orderId',
    authenticate,
    csrfProtection,
    requireAccess({ tier: AccessTier.PRODUCTION, kyc: true, roles: ['seller'] }),
    asyncHandler(orderController.deleteOrder)
);

/**
 * @route POST /api/v1/orders/bulk
 * @desc Bulk import orders from CSV
 * @access Private (Production)
 */
router.post(
    '/bulk',
    authenticate,
    csrfProtection,
    requireAccess({ tier: AccessTier.PRODUCTION, kyc: true, roles: ['seller'], companyMatch: true }),
    upload.single('file'),
    asyncHandler(orderController.bulkImportOrders)
);

export default router;
