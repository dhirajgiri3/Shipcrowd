/**
 * Inventory Routes
 * 
 * API routes for inventory and stock management operations
 */

import { Router } from 'express';
import inventoryController from '@/presentation/http/controllers/warehouse/inventory.controller';
import { authenticate } from '@/presentation/http/middleware/auth.middleware';
import { authorize } from '@/presentation/http/middleware/authorize.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Inventory CRUD
router.post('/', authorize(['admin', 'warehouse_manager', 'inventory_manager']), inventoryController.createInventory);
router.get('/', inventoryController.getInventoryList);
router.get('/sku/:warehouseId/:sku', inventoryController.getInventoryBySKU);
router.get('/:id', inventoryController.getInventoryById);

// Stock operations (inventory manager role)
router.post('/receive', authorize(['admin', 'warehouse_manager', 'inventory_manager']), inventoryController.receiveStock);
router.post('/:id/adjust', authorize(['admin', 'warehouse_manager', 'inventory_manager']), inventoryController.adjustStock);
router.post('/:id/reserve', authorize(['admin', 'warehouse_manager', 'inventory_manager']), inventoryController.reserveStock);
router.post('/:id/release', authorize(['admin', 'warehouse_manager', 'inventory_manager']), inventoryController.releaseReservation);
router.post('/:id/transfer', authorize(['admin', 'warehouse_manager', 'inventory_manager']), inventoryController.transferStock);
router.post('/:id/damage', authorize(['admin', 'warehouse_manager', 'inventory_manager']), inventoryController.markDamaged);
router.post('/:id/cycle-count', authorize(['admin', 'warehouse_manager', 'inventory_manager']), inventoryController.cycleCount);

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
