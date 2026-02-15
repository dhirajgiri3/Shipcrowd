import express from 'express';
import { authenticate, csrfProtection } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware/index';
// import { AccessTier } from '../../../../../core/domain/types/access-tier'; // Not needed if we just check role
import asyncHandler from '../../../../../shared/utils/asyncHandler';
import adminWarehouseController from '../../../controllers/warehouse/admin-warehouse.controller';

const router = express.Router();

// Middleware to ensure only admins can access these routes
// This is critical since the controller methods don't have company checks
const requireAdmin = requireAccess({ roles: ['admin', 'super_admin'] });

/**
 * @route GET /admin/warehouses
 * @desc Get all warehouses (Platform Wide)
 * @access Private (Admin Only)
 */
router.get(
    '/',
    authenticate,
    requireAdmin,
    asyncHandler(adminWarehouseController.getAllWarehouses)
);

/**
 * @route GET /admin/warehouses/:warehouseId
 * @desc Get a warehouse by ID (Power to see any warehouse)
 * @access Private (Admin Only)
 */
router.get(
    '/:warehouseId',
    authenticate,
    requireAdmin,
    asyncHandler(adminWarehouseController.getWarehouseById)
);

/**
 * @route PATCH /admin/warehouses/:warehouseId
 * @desc Update a warehouse (Admin Override)
 * @access Private (Admin Only)
 */
router.patch(
    '/:warehouseId',
    authenticate,
    csrfProtection,
    requireAdmin,
    asyncHandler(adminWarehouseController.updateWarehouse)
);

/**
 * @route DELETE /admin/warehouses/:warehouseId
 * @desc Delete a warehouse (Admin Override)
 * @access Private (Admin Only)
 */
router.delete(
    '/:warehouseId',
    authenticate,
    csrfProtection,
    requireAdmin,
    asyncHandler(adminWarehouseController.deleteWarehouse)
);

export default router;
