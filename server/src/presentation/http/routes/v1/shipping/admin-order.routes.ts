import { Router } from 'express';
import { authenticate } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware/index';
import adminOrderController from '../../../controllers/shipping/admin-order.controller';

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

export default router;
