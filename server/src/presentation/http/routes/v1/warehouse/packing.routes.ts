/**
 * Packing Routes
 * 
 * API routes for packing station and packing workflow operations
 */

import { Router } from 'express';
import packingController from '@/presentation/http/controllers/warehouse/packing.controller';
import { authenticate } from '@/presentation/http/middleware/auth.middleware';
import { authorize } from '@/presentation/http/middleware/authorize.middleware';

const router = Router();

// All routes require authentication
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

// Packing session operations (packer role)
router.post('/stations/:id/session/start', authorize(['admin', 'warehouse_manager', 'packer']), packingController.startSession);
router.post('/stations/:id/pack', authorize(['admin', 'warehouse_manager', 'packer']), packingController.packItem);
router.post('/stations/:id/packages', authorize(['admin', 'warehouse_manager', 'packer']), packingController.createPackage);
router.post('/stations/:id/verify-weight', authorize(['admin', 'warehouse_manager', 'packer']), packingController.verifyWeight);
router.post('/stations/:id/session/complete', authorize(['admin', 'warehouse_manager', 'packer']), packingController.completeSession);
router.post('/stations/:id/session/cancel', authorize(['admin', 'warehouse_manager', 'packer']), packingController.cancelSession);

// Labels
router.get('/stations/:id/packages/:packageNumber/label', packingController.getPackageLabel);

// Statistics
router.get('/stats/station/:stationId', authorize(['admin', 'warehouse_manager']), packingController.getStationStats);

export default router;
