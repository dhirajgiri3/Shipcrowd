import { Router } from 'express';
import adminOrderController from '../../../controllers/shipping/admin-order.controller';
import { authenticate } from '../../../middleware/auth/auth';
import { csrfProtection, requireAccess } from '../../../middleware/index';
import asyncHandler from '../../../../../shared/utils/asyncHandler';

const router = Router();

// All routes require admin authentication
router.use(authenticate);
router.use(requireAccess({ roles: ['admin', 'super_admin'] }));

/**
 * @route   GET /api/v1/admin/orders
 * @desc    Get all orders (admin view, can filter by companyId)
 * @access  Admin
 */
router.get('/', adminOrderController.getAllOrders);

/**
 * @route   GET /api/v1/admin/orders/:orderId
 * @desc    Get order by ID (admin can view any order)
 * @access  Admin
 */
router.get('/:orderId', adminOrderController.getOrderById);

/**
 * @route   PATCH /api/v1/admin/orders/:orderId
 * @desc    Update order (admin can update any order)
 * @access  Admin
 */
router.patch('/:orderId', adminOrderController.updateOrder);

/**
 * @route   POST /api/v1/admin/orders/:orderId/ship
 * @desc    Ship order on behalf of seller (standard aggregator workflow for support/ops)
 * @access  Admin
 */
router.post(
    '/:orderId/ship',
    csrfProtection,
    asyncHandler(adminOrderController.shipOrder)
);

/**
 * @route   DELETE /api/v1/admin/orders/:orderId
 * @desc    Soft delete an order (admin can delete any order)
 * @access  Admin
 */
router.delete('/:orderId', asyncHandler(adminOrderController.deleteOrder));

export default router;
