/**
 * Inventory Routes
 *
 * API routes for inventory and stock management operations
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import inventoryController from '@/presentation/http/controllers/warehouse/inventory.controller';
import { authenticate, authorize } from '@/presentation/http/middleware';

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

// Inventory CRUD
router.post('/', authorize(['admin', 'warehouse_manager', 'inventory_manager']), inventoryController.createInventory);
router.get('/', inventoryController.getInventoryList);
router.get('/sku/:warehouseId/:sku', inventoryController.getInventoryBySKU);
router.get('/:id', inventoryController.getInventoryById);

// Stock operations (inventory manager role) - with stricter rate limiting
router.post('/receive', stockOperationLimiter, authorize(['admin', 'warehouse_manager', 'inventory_manager']), inventoryController.receiveStock);
router.post('/:id/adjust', stockOperationLimiter, authorize(['admin', 'warehouse_manager', 'inventory_manager']), inventoryController.adjustStock);
router.post('/:id/reserve', stockOperationLimiter, authorize(['admin', 'warehouse_manager', 'inventory_manager']), inventoryController.reserveStock);
router.post('/:id/release', stockOperationLimiter, authorize(['admin', 'warehouse_manager', 'inventory_manager']), inventoryController.releaseReservation);
router.post('/:id/transfer', stockOperationLimiter, authorize(['admin', 'warehouse_manager', 'inventory_manager']), inventoryController.transferStock);
router.post('/:id/damage', stockOperationLimiter, authorize(['admin', 'warehouse_manager', 'inventory_manager']), inventoryController.markDamaged);
router.post('/:id/cycle-count', stockOperationLimiter, authorize(['admin', 'warehouse_manager', 'inventory_manager']), inventoryController.cycleCount);

// Availability check
router.post('/check-availability', inventoryController.checkAvailability);

// Alerts
router.get('/alerts/low-stock', inventoryController.getLowStockAlerts);

// Movements
router.get('/movements', inventoryController.getMovements);

// Statistics
router.get('/stats/:warehouseId', authorize(['admin', 'warehouse_manager']), inventoryController.getInventoryStats);
router.get('/stats/:warehouseId/movements', authorize(['admin', 'warehouse_manager']), inventoryController.getMovementSummary);

export default router;
