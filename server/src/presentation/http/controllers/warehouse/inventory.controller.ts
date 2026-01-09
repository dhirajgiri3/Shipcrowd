/**
 * InventoryController
 * 
 * Handles all inventory and stock management HTTP endpoints
 */

import { Request, Response, NextFunction } from 'express';
import InventoryService from '@/core/application/services/warehouse/inventory.service';
import { createAuditLog } from '@/presentation/http/middleware/system/audit-log.middleware';
import {
    sendSuccess,
    sendError,
    sendCreated,
    sendPaginated,
    sendValidationError,
} from '@/shared/utils/responseHelper';
import {
    createInventorySchema,
    receiveStockSchema,
    adjustStockSchema,
    reserveStockSchema,
    transferStockSchema,
    cycleCountSchema,
    releaseReservationSchema,
    markDamagedSchema,
    checkAvailabilitySchema,
} from '@/shared/validation/warehouse.schemas';
import { guardChecks, parsePagination, validateObjectId } from '@/shared/helpers/controller.helpers';

/**
 * Create inventory record
 * POST /api/v1/inventory
 */
async function createInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const validation = createInventorySchema.safeParse(req.body);
        if (!validation.success) {
            sendValidationError(res, validation.error.errors);
            return;
        }

        const inventory = await InventoryService.createInventory({
            ...validation.data,
            companyId: auth.companyId,
        });

        await createAuditLog(
            auth.userId,
            auth.companyId,
            'create',
            'inventory',
            String(inventory._id),
            { sku: inventory.sku },
            req
        );

        sendCreated(res, inventory, 'Inventory created');
    } catch (error) {
        next(error);
    }
}

/**
 * Get inventory list
 * GET /api/v1/inventory
 */
async function getInventoryList(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { warehouseId, sku, status, category, lowStockOnly } = req.query;
        const pagination = parsePagination(req.query);

        const result = await InventoryService.getInventoryList({
            companyId: auth.companyId,
            warehouseId: warehouseId as string,
            sku: sku as string,
            status: status as string,
            category: category as string,
            lowStockOnly: lowStockOnly === 'true',
            page: pagination.page,
            limit: pagination.limit,
        });

        sendPaginated(res, result.data, result.pagination, 'Inventory list retrieved');
    } catch (error) {
        next(error);
    }
}

/**
 * Get inventory by ID
 * GET /api/v1/inventory/:id
 */
async function getInventoryById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { id } = req.params;
        if (!validateObjectId(id, res, 'inventory')) return;

        const inventory = await InventoryService.getInventoryById(id);

        if (!inventory) {
            sendError(res, 'Inventory not found', 404, 'INVENTORY_NOT_FOUND');
            return;
        }

        sendSuccess(res, inventory, 'Inventory retrieved');
    } catch (error) {
        next(error);
    }
}

/**
 * Get inventory by SKU
 * GET /api/v1/inventory/sku/:warehouseId/:sku
 */
async function getInventoryBySKU(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { warehouseId, sku } = req.params;
        const inventory = await InventoryService.getInventoryBySKU(warehouseId, sku);

        if (!inventory) {
            sendError(res, 'Inventory not found', 404, 'INVENTORY_NOT_FOUND');
            return;
        }

        sendSuccess(res, inventory, 'Inventory retrieved');
    } catch (error) {
        next(error);
    }
}

/**
 * Receive stock
 * POST /api/v1/inventory/receive
 */
async function receiveStock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const validation = receiveStockSchema.safeParse(req.body);
        if (!validation.success) {
            sendValidationError(res, validation.error.errors);
            return;
        }

        const result = await InventoryService.receiveStock({
            ...validation.data,
            companyId: auth.companyId,
            performedBy: auth.userId,
        });

        await createAuditLog(
            auth.userId,
            auth.companyId,
            'update',
            'inventory',
            String(result.inventory._id),
            { action: 'receive_stock', quantity: validation.data.quantity, sku: validation.data.sku },
            req
        );

        sendSuccess(res, result, 'Stock received');
    } catch (error) {
        next(error);
    }
}

/**
 * Adjust stock
 * POST /api/v1/inventory/:id/adjust
 */
async function adjustStock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { id } = req.params;
        if (!validateObjectId(id, res, 'inventory')) return;

        const validation = adjustStockSchema.safeParse(req.body);
        if (!validation.success) {
            sendValidationError(res, validation.error.errors);
            return;
        }

        const result = await InventoryService.adjustStock({
            inventoryId: id,
            ...validation.data,
            performedBy: auth.userId,
        });

        await createAuditLog(
            auth.userId,
            auth.companyId,
            'update',
            'inventory',
            id,
            { action: 'adjust_stock', quantity: validation.data.quantity, reason: validation.data.reason },
            req
        );

        sendSuccess(res, result, 'Stock adjusted');
    } catch (error) {
        next(error);
    }
}

/**
 * Reserve stock
 * POST /api/v1/inventory/:id/reserve
 */
async function reserveStock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { id } = req.params;
        if (!validateObjectId(id, res, 'inventory')) return;

        const validation = reserveStockSchema.safeParse(req.body);
        if (!validation.success) {
            sendValidationError(res, validation.error.errors);
            return;
        }

        const { _id } = req.user!;
        const inventory = await InventoryService.reserveStock({
            inventoryId: id,
            ...validation.data,
            reservedBy: _id.toString(),
        });

        sendSuccess(res, inventory, 'Stock reserved');
    } catch (error) {
        next(error);
    }
}

/**
 * Release reservation
 * POST /api/v1/inventory/:id/release
 */
async function releaseReservation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { id } = req.params;
        const validation = releaseReservationSchema.safeParse(req.body);
        if (!validation.success) {
            sendValidationError(res, validation.error.errors);
            return;
        }

        const { quantity, orderId, reason } = validation.data;
        const { _id } = req.user!;

        const inventory = await InventoryService.releaseReservation({
            inventoryId: id,
            quantity,
            orderId,
            reason,
            releasedBy: _id.toString(),
        });

        sendSuccess(res, inventory, 'Reservation released');
    } catch (error) {
        next(error);
    }
}

/**
 * Transfer stock
 * POST /api/v1/inventory/:id/transfer
 */
async function transferStock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { id } = req.params;
        if (!validateObjectId(id, res, 'inventory')) return;

        const validation = transferStockSchema.safeParse(req.body);
        if (!validation.success) {
            sendValidationError(res, validation.error.errors);
            return;
        }

        const result = await InventoryService.transferStock({
            inventoryId: id,
            ...validation.data,
            performedBy: auth.userId,
        });

        await createAuditLog(
            auth.userId,
            auth.companyId,
            'update',
            'inventory',
            id,
            { action: 'transfer_stock', quantity: validation.data.quantity, from: validation.data.fromLocationId, to: validation.data.toLocationId },
            req
        );

        sendSuccess(res, result, 'Stock transferred');
    } catch (error) {
        next(error);
    }
}

/**
 * Mark stock as damaged
 * POST /api/v1/inventory/:id/damage
 */
async function markDamaged(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { id } = req.params;
        if (!validateObjectId(id, res, 'inventory')) return;

        const validation = markDamagedSchema.safeParse(req.body);
        if (!validation.success) {
            sendValidationError(res, validation.error.errors);
            return;
        }

        const { locationId, quantity, reason, notes } = validation.data;

        const result = await InventoryService.markDamaged({
            inventoryId: id,
            locationId,
            quantity,
            reason,
            notes,
            performedBy: auth.userId,
        });

        await createAuditLog(
            auth.userId,
            auth.companyId,
            'update',
            'inventory',
            id,
            { action: 'mark_damaged', quantity, reason },
            req
        );

        sendSuccess(res, result, 'Stock marked as damaged');
    } catch (error) {
        next(error);
    }
}

/**
 * Cycle count
 * POST /api/v1/inventory/:id/cycle-count
 */
async function cycleCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { id } = req.params;
        if (!validateObjectId(id, res, 'inventory')) return;

        const validation = cycleCountSchema.safeParse(req.body);
        if (!validation.success) {
            sendValidationError(res, validation.error.errors);
            return;
        }

        const result = await InventoryService.cycleCount({
            inventoryId: id,
            ...validation.data,
            performedBy: auth.userId,
        });

        await createAuditLog(
            auth.userId,
            auth.companyId,
            'update',
            'inventory',
            id,
            { action: 'cycle_count', result: result.movement ? 'variance_found' : 'match' },
            req
        );

        sendSuccess(res, result, 'Cycle count recorded');
    } catch (error) {
        next(error);
    }
}

/**
 * Check stock availability
 * POST /api/v1/inventory/check-availability
 */
async function checkAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const validation = checkAvailabilitySchema.safeParse(req.body);
        if (!validation.success) {
            sendValidationError(res, validation.error.errors);
            return;
        }

        const { warehouseId, items } = validation.data;

        const result = await InventoryService.checkStockAvailability(warehouseId, items);
        sendSuccess(res, result, 'Stock availability checked');
    } catch (error) {
        next(error);
    }
}

/**
 * Get low stock alerts
 * GET /api/v1/inventory/alerts/low-stock
 */
async function getLowStockAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const alerts = await InventoryService.getLowStockAlerts(auth.companyId);

        sendSuccess(res, alerts, 'Low stock alerts retrieved');
    } catch (error) {
        next(error);
    }
}

/**
 * Get stock movements
 * GET /api/v1/inventory/movements
 */
async function getMovements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { warehouseId, inventoryId, type, startDate, endDate } = req.query;
        const pagination = parsePagination(req.query);

        const result = await InventoryService.getMovements({
            companyId: auth.companyId,
            warehouseId: warehouseId as string,
            inventoryId: inventoryId as string,
            type: type as string,
            startDate: startDate ? new Date(startDate as string) : undefined,
            endDate: endDate ? new Date(endDate as string) : undefined,
            page: pagination.page,
            limit: pagination.limit,
        });

        sendPaginated(res, result.data, result.pagination, 'Movements retrieved');
    } catch (error) {
        next(error);
    }
}

/**
 * Get inventory statistics
 * GET /api/v1/inventory/stats/:warehouseId
 */
async function getInventoryStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { warehouseId } = req.params;
        const stats = await InventoryService.getInventoryStats(warehouseId);

        sendSuccess(res, stats, 'Inventory stats retrieved');
    } catch (error) {
        next(error);
    }
}

/**
 * Get movement summary
 * GET /api/v1/inventory/stats/:warehouseId/movements
 */
async function getMovementSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { warehouseId } = req.params;
        const { startDate, endDate } = req.query;

        const summary = await InventoryService.getMovementSummary(
            warehouseId,
            new Date(startDate as string || Date.now() - 7 * 24 * 60 * 60 * 1000),
            new Date(endDate as string || Date.now())
        );

        sendSuccess(res, summary, 'Movement summary retrieved');
    } catch (error) {
        next(error);
    }
}

export default {
    createInventory,
    getInventoryList,
    getInventoryById,
    getInventoryBySKU,
    receiveStock,
    adjustStock,
    reserveStock,
    releaseReservation,
    transferStock,
    markDamaged,
    cycleCount,
    checkAvailability,
    getLowStockAlerts,
    getMovements,
    getInventoryStats,
    getMovementSummary,
};
