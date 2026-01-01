/**
 * Packing Routes
 *
 * API routes for packing station and packing workflow operations
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import packingController from '@/presentation/http/controllers/warehouse/packing.controller';
import { authenticate, authorize } from '@/presentation/http/middleware';

const router = Router();

// Rate limiting for packing operations
const packingGeneralLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Max 100 requests per window
    message: 'Too many packing requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

// Stricter rate limiting for packing session operations (real-time warehouse floor operations)
const packOperationLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 50, // Max 50 pack operations per minute
    message: 'Too many pack operations, please slow down',
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply general rate limiter to all routes
router.use(packingGeneralLimiter);

// All routes require authentication (company context enforced in controllers)
router.use(authenticate);

// Station management (manager only)
router.post('/stations', authorize(['admin', 'warehouse_manager']), packingController.createStation);
router.get('/stations', packingController.getStations);
router.get('/stations/available/:warehouseId', packingController.getAvailableStations);
router.get('/stations/:id', packingController.getStationById);

// Station status management
router.post('/stations/:id/assign', authorize(['admin', 'warehouse_manager']), packingController.assignPacker);
router.post('/stations/:id/unassign', authorize(['admin', 'warehouse_manager']), packingController.unassignPacker);
router.post('/stations/:id/offline', authorize(['admin', 'warehouse_manager']), packingController.setOffline);
router.post('/stations/:id/online', authorize(['admin', 'warehouse_manager']), packingController.setOnline);

// Packing session operations (packer role) - with stricter rate limiting
router.post('/stations/:id/session/start', packOperationLimiter, authorize(['admin', 'warehouse_manager', 'packer']), packingController.startSession);
router.post('/stations/:id/pack', packOperationLimiter, authorize(['admin', 'warehouse_manager', 'packer']), packingController.packItem);
router.post('/stations/:id/packages', packOperationLimiter, authorize(['admin', 'warehouse_manager', 'packer']), packingController.createPackage);
router.post('/stations/:id/verify-weight', packOperationLimiter, authorize(['admin', 'warehouse_manager', 'packer']), packingController.verifyWeight);
router.post('/stations/:id/session/complete', packOperationLimiter, authorize(['admin', 'warehouse_manager', 'packer']), packingController.completeSession);
router.post('/stations/:id/session/cancel', authorize(['admin', 'warehouse_manager', 'packer']), packingController.cancelSession);

// Labels
router.get('/stations/:id/packages/:packageNumber/label', packingController.getPackageLabel);

// Statistics
router.get('/stats/station/:stationId', authorize(['admin', 'warehouse_manager']), packingController.getStationStats);

export default router;
