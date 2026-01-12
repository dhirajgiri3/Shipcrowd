/**
 * Picking Routes
 *
 * API routes for pick list and picking workflow operations
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import pickingController from '@/presentation/http/controllers/warehouse/picking.controller';
import { authenticate } from '@/presentation/http/middleware';
import { requireAccess } from '@/presentation/http/middleware/auth/unified-access';

const router = Router();

// Rate limiting for picking operations
const pickingGeneralLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Max 100 requests per window
    message: 'Too many picking requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

// Stricter rate limiting for pick operations (real-time warehouse floor operations)
const pickOperationLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 50, // Max 50 pick operations per minute (higher than stock ops due to real-time nature)
    message: 'Too many pick operations, please slow down',
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply general rate limiter to all routes
router.use(pickingGeneralLimiter);

// All routes require authentication (company context enforced in controllers)
router.use(authenticate);

// All picking routes require KYC verification
router.use(requireAccess({ kyc: true }));

// Access controls
const pickingManagers = requireAccess({ teamRoles: ['admin', 'warehouse_manager'] });
const pickers = requireAccess({ teamRoles: ['admin', 'warehouse_manager', 'picker'] });

// Pick list management
router.post('/pick-lists', pickingManagers, pickingController.createPickList);
router.get('/pick-lists', pickingController.getPickLists);
router.get('/my-pick-lists', pickingController.getMyPickLists);
router.get('/pick-lists/:id', pickingController.getPickListById);

// Pick list assignment (manager only)
router.post('/pick-lists/:id/assign', pickingManagers, pickingController.assignPickList);

// Picking operations (picker role) - with stricter rate limiting
router.post('/pick-lists/:id/start', pickOperationLimiter, pickers, pickingController.startPicking);
router.post('/pick-lists/:id/pick', pickOperationLimiter, pickers, pickingController.pickItem);
router.post('/pick-lists/:id/skip', pickOperationLimiter, pickers, pickingController.skipItem);
router.post('/pick-lists/:id/complete', pickOperationLimiter, pickers, pickingController.completePickList);
router.post('/pick-lists/:id/cancel', pickingManagers, pickingController.cancelPickList);

// Verification (manager only)
router.post('/pick-lists/:id/verify', pickingManagers, pickingController.verifyPickList);

// Helpers
router.get('/pick-lists/:id/next-item', pickingController.getNextItem);

// Statistics
router.get('/stats/picker/:pickerId', pickingManagers, pickingController.getPickerStats);
router.get('/stats/warehouse/:warehouseId', pickingManagers, pickingController.getWarehouseStats);

export default router;
