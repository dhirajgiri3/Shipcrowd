/**
 * Inventory Routes
 *
 * API routes for inventory and stock management operations
 */

import inventoryController from '@/presentation/http/controllers/warehouse/inventory.controller';
import { authenticate } from '@/presentation/http/middleware';
import { requireAccess } from '@/presentation/http/middleware/auth/unified-access';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';

const router = Router();

// Rate limiting for warehouse operations
const warehouseGeneralLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Max 100 requests per window
    message: 'Too many warehouse requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

// Stricter rate limiting for stock operations (prevent abuse)
const stockOperationLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // Max 30 stock operations per minute
    message: 'Too many stock operations, please slow down',
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply general rate limiter to all routes
router.use(warehouseGeneralLimiter);

// All routes require authentication (company context enforced in controllers)
router.use(authenticate);

// All inventory routes require KYC verification
router.use(requireAccess({ kyc: true }));

// Access controls
const inventoryManagers = requireAccess({ teamRoles: ['admin', 'warehouse_manager', 'inventory_manager'] });
const viewers = requireAccess({ teamRoles: ['admin', 'warehouse_manager'] });

// Inventory CRUD
router.post('/', inventoryManagers, inventoryController.createInventory);
router.get('/', inventoryController.getInventoryList);
router.get('/sku/:warehouseId/:sku', inventoryController.getInventoryBySKU);
router.get('/:id', inventoryController.getInventoryById);

// Stock operations (inventory manager role) - with stricter rate limiting
router.post('/receive', stockOperationLimiter, inventoryManagers, inventoryController.receiveStock);
router.post('/:id/adjust', stockOperationLimiter, inventoryManagers, inventoryController.adjustStock);
router.post('/:id/reserve', stockOperationLimiter, inventoryManagers, inventoryController.reserveStock);
router.post('/:id/release', stockOperationLimiter, inventoryManagers, inventoryController.releaseReservation);
router.post('/:id/transfer', stockOperationLimiter, inventoryManagers, inventoryController.transferStock);
router.post('/:id/damage', stockOperationLimiter, inventoryManagers, inventoryController.markDamaged);
router.post('/:id/cycle-count', stockOperationLimiter, inventoryManagers, inventoryController.cycleCount);

const upload = multer({ storage: multer.memoryStorage() });

// Availability check
router.post('/check-availability', inventoryController.checkAvailability);

// CSV Import
router.post('/:warehouseId/import', inventoryManagers, upload.single('file'), inventoryController.importInventory);

// Alerts
router.get('/alerts/low-stock', inventoryController.getLowStockAlerts);

// Movements
router.get('/movements', inventoryController.getMovements);

// Statistics
router.get('/stats/:warehouseId', viewers, inventoryController.getInventoryStats);
router.get('/stats/:warehouseId/movements', viewers, inventoryController.getMovementSummary);

export default router;
