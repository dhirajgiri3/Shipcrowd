/**
 * Picking Routes
 * 
 * API routes for pick list and picking workflow operations
 */

import { Router } from 'express';
import pickingController from '@/presentation/http/controllers/warehouse/picking.controller';
import { authenticate, authorize } from '@/presentation/http/middleware';

const router = Router();

// All routes require authentication (company context enforced in controllers)
router.use(authenticate);

// Pick list management
router.post('/pick-lists', authorize(['admin', 'warehouse_manager']), pickingController.createPickList);
router.get('/pick-lists', pickingController.getPickLists);
router.get('/my-pick-lists', pickingController.getMyPickLists);
router.get('/pick-lists/:id', pickingController.getPickListById);

// Pick list assignment (manager only)
router.post('/pick-lists/:id/assign', authorize(['admin', 'warehouse_manager']), pickingController.assignPickList);

// Picking operations (picker role)
router.post('/pick-lists/:id/start', authorize(['admin', 'warehouse_manager', 'picker']), pickingController.startPicking);
router.post('/pick-lists/:id/pick', authorize(['admin', 'warehouse_manager', 'picker']), pickingController.pickItem);
router.post('/pick-lists/:id/skip', authorize(['admin', 'warehouse_manager', 'picker']), pickingController.skipItem);
router.post('/pick-lists/:id/complete', authorize(['admin', 'warehouse_manager', 'picker']), pickingController.completePickList);
router.post('/pick-lists/:id/cancel', authorize(['admin', 'warehouse_manager']), pickingController.cancelPickList);

// Verification (manager only)
router.post('/pick-lists/:id/verify', authorize(['admin', 'warehouse_manager']), pickingController.verifyPickList);

// Helpers
router.get('/pick-lists/:id/next-item', pickingController.getNextItem);

// Statistics
router.get('/stats/picker/:pickerId', authorize(['admin', 'warehouse_manager']), pickingController.getPickerStats);
router.get('/stats/warehouse/:warehouseId', authorize(['admin', 'warehouse_manager']), pickingController.getWarehouseStats);

export default router;
