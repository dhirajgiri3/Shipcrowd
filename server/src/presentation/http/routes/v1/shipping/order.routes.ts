import express from 'express';
import { authenticate, csrfProtection } from '../../../middleware/auth/auth';
import { requireAccess, requireCompleteCompany } from '../../../middleware/index';
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
 * @access Private (Production, Complete Profile)
 */
router.post(
    '/',
    authenticate,
    csrfProtection,
    requireCompleteCompany,
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
 * @access Private (Production, Complete Profile)
 */
router.post(
    '/bulk',
    authenticate,
    csrfProtection,
    requireCompleteCompany,
    requireAccess({ tier: AccessTier.PRODUCTION, kyc: true, roles: ['seller'], companyMatch: true }),
    upload.single('file'),
    asyncHandler(orderController.bulkImportOrders)
);

/**
 * @route POST /api/v1/orders/:orderId/clone
 * @desc Clone an existing order with optional modifications
 * @access Private (Production)
 */
router.post(
    '/:orderId/clone',
    authenticate,
    csrfProtection,
    requireAccess({ tier: AccessTier.PRODUCTION, kyc: true, roles: ['seller'], companyMatch: true }),
    asyncHandler(orderController.cloneOrder)
);

/**
 * @route POST /api/v1/orders/:orderId/split
 * @desc Split a single order into multiple orders
 * @access Private (Production)
 */
router.post(
    '/:orderId/split',
    authenticate,
    csrfProtection,
    requireAccess({ tier: AccessTier.PRODUCTION, kyc: true, roles: ['seller'], companyMatch: true }),
    asyncHandler(orderController.splitOrder)
);

/**
 * @route POST /api/v1/orders/merge
 * @desc Merge multiple orders into a single order
 * @access Private (Production)
 */
router.post(
    '/merge',
    authenticate,
    csrfProtection,
    requireAccess({ tier: AccessTier.PRODUCTION, kyc: true, roles: ['seller'], companyMatch: true }),
    asyncHandler(orderController.mergeOrders)
);

export default router;
