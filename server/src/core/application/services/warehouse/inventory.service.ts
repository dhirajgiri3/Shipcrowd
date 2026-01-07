/**
 * Inventory
 * 
 * Purpose: InventoryService - Refactored to Static Methods
 * 
 * DEPENDENCIES:
 * - Database Models, Error Handling, Logger
 * 
 * TESTING:
 * Unit Tests: tests/unit/services/.../{filename}.test.ts
 * Coverage: TBD
 * 
 * NOTE: This service needs comprehensive documentation.
 * See SERVICE_TEMPLATE.md for documentation standards.
 */

import mongoose from 'mongoose';
import { Inventory, IInventory } from '@/infrastructure/database/mongoose/models';
import { StockMovement, IStockMovement } from '@/infrastructure/database/mongoose/models';
import { WarehouseLocation } from '@/infrastructure/database/mongoose/models';
import {
    ICreateInventoryDTO,
    IUpdateInventoryDTO,
    IReceiveStockDTO,
    IAdjustStockDTO,
    IReserveStockDTO,
    IReleaseReservationDTO,
    IPickStockDTO,
    ITransferStockDTO,
    IMarkDamagedDTO,
    ICycleCountDTO,
    IInventoryQueryOptions,
    IStockMovementQueryOptions,
    ILowStockAlert,
    IInventoryStats,
    IMovementSummary,
    IPaginatedResult,
} from '@/core/domain/interfaces/warehouse/inventory.interface.service';
import { AppError } from '@/shared/errors/app.error';
import logger from '@/shared/logger/winston.logger';

export default class InventoryService {
    static async createInventory(data: ICreateInventoryDTO): Promise<IInventory> {
        const existing = await Inventory.findOne({ warehouseId: data.warehouseId, sku: data.sku });
        if (existing) throw new AppError('Inventory already exists for this SKU', 'INVENTORY_EXISTS', 400);

        return Inventory.create({
            ...data,
            onHand: data.initialQuantity || 0,
            reserved: 0,
            status: 'ACTIVE',
        });
    }

    static async updateInventory(data: IUpdateInventoryDTO): Promise<IInventory> {
        const inventory = await Inventory.findByIdAndUpdate(data.inventoryId, data, { new: true });
        if (!inventory) throw new AppError('Inventory not found', 'INVENTORY_NOT_FOUND', 404);
        return inventory;
    }

    static async getInventoryById(id: string): Promise<IInventory | null> {
        return Inventory.findById(id);
    }

    static async getInventoryBySKU(warehouseId: string, sku: string): Promise<IInventory | null> {
        return Inventory.findOne({ warehouseId, sku });
    }

    static async getInventoryByBarcode(warehouseId: string, barcode: string): Promise<IInventory | null> {
        return Inventory.findOne({ warehouseId, barcode });
    }

    static async getInventoryList(options: IInventoryQueryOptions): Promise<IPaginatedResult<IInventory>> {
        const { page = 1, limit = 20 } = options;
        const filter: any = {};
        if (options.warehouseId) filter.warehouseId = options.warehouseId;
        if (options.companyId) filter.companyId = options.companyId;
        if (options.sku) {
            // Escape special regex characters to prevent ReDoS attacks
            const escapedSku = options.sku.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filter.sku = { $regex: escapedSku, $options: 'i' };
        }
        if (options.status) filter.status = options.status;
        if (options.category) filter.category = options.category;

        const [data, total] = await Promise.all([
            Inventory.find(filter).skip((page - 1) * limit).limit(limit),
            Inventory.countDocuments(filter),
        ]);

        return { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
    }

    static async discontinueInventory(inventoryId: string): Promise<IInventory> {
        const inventory = await Inventory.findById(inventoryId);
        if (!inventory) throw new AppError('Inventory not found', 'INVENTORY_NOT_FOUND', 404);
        inventory.status = 'DISCONTINUED';
        await inventory.save();
        return inventory;
    }

    static async receiveStock(data: IReceiveStockDTO): Promise<{ inventory: IInventory; movement: IStockMovement }> {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            let inventory = await Inventory.findOne({
                warehouseId: data.warehouseId,
                sku: data.sku
            }).session(session);

            if (!inventory) {
                [inventory] = await Inventory.create([{
                    warehouseId: data.warehouseId,
                    companyId: data.companyId,
                    sku: data.sku,
                    productName: data.sku,
                    onHand: data.quantity,
                }], { session });
            } else {
                inventory.onHand += data.quantity;
                await inventory.save({ session });
            }

            const [movement] = await StockMovement.create([{
                warehouseId: data.warehouseId,
                companyId: data.companyId,
                movementNumber: await this.generateMovementNumber(),
                type: 'RECEIVE',
                direction: 'IN',
                sku: data.sku,
                productName: inventory.productName,
                inventoryId: inventory._id,
                quantity: data.quantity,
                previousQuantity: inventory.onHand - data.quantity,
                newQuantity: inventory.onHand,
                toLocationId: data.locationId,
                reason: 'Stock received',
                performedBy: data.performedBy,
                status: 'COMPLETED',
            }], { session });

            await session.commitTransaction();
            return { inventory, movement };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async adjustStock(data: IAdjustStockDTO): Promise<{ inventory: IInventory; movement: IStockMovement }> {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const inventory = await Inventory.findById(data.inventoryId).session(session);
            if (!inventory) throw new AppError('Inventory not found', 'INVENTORY_NOT_FOUND', 404);

            const previousQty = inventory.onHand;
            inventory.onHand += data.quantity;
            await inventory.save({ session });

            const [movement] = await StockMovement.create([{
                warehouseId: inventory.warehouseId,
                companyId: inventory.companyId,
                movementNumber: await this.generateMovementNumber(),
                type: 'ADJUSTMENT',
                direction: data.quantity > 0 ? 'IN' : 'OUT',
                sku: inventory.sku,
                productName: inventory.productName,
                inventoryId: inventory._id,
                quantity: data.quantity,
                previousQuantity: previousQty,
                newQuantity: inventory.onHand,
                reason: data.reason,
                performedBy: data.performedBy,
                status: 'COMPLETED',
            }], { session });

            await session.commitTransaction();
            return { inventory, movement };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async reserveStock(data: IReserveStockDTO): Promise<IInventory> {
        const inventory = await Inventory.findById(data.inventoryId);
        if (!inventory) throw new AppError('Inventory not found', 'INVENTORY_NOT_FOUND', 404);

        // FIX: Use virtual field which correctly includes damaged stock
        // available = onHand - reserved - damaged (not just onHand - reserved)
        const available = inventory.available; // Uses virtual: Math.max(0, onHand - reserved - damaged)
        if (available < data.quantity) {
            logger.warn('Stock reservation failed - insufficient stock', {
                inventoryId: data.inventoryId,
                sku: inventory.sku,
                requested: data.quantity,
                available,
            });
            throw new AppError(
                `Insufficient stock available. Requested: ${data.quantity}, Available: ${available}`,
                'INSUFFICIENT_STOCK',
                400
            );
        }

        // OPTIMISTIC LOCKING: Use findOneAndUpdate with version check
        const updated = await Inventory.findOneAndUpdate(
            {
                _id: data.inventoryId,
                __v: inventory.__v
            },
            {
                $inc: { reserved: data.quantity, __v: 1 }
            },
            { new: true }
        );

        if (!updated) {
            throw new AppError(
                'Inventory was updated by another process. Please retry.',
                'CONCURRENT_MODIFICATION',
                409
            );
        }

        logger.info('Stock reserved successfully', {
            inventoryId: String(updated._id),
            sku: updated.sku,
            quantityReserved: data.quantity,
            newReserved: updated.reserved,
            newAvailable: updated.available,
        });

        return updated;
    }

    static async releaseReservation(data: IReleaseReservationDTO): Promise<IInventory> {
        const inventory = await Inventory.findById(data.inventoryId);
        if (!inventory) throw new AppError('Inventory not found', 'INVENTORY_NOT_FOUND', 404);

        inventory.reserved = Math.max(0, inventory.reserved - data.quantity);
        await inventory.save();
        return inventory;
    }

    static async pickStock(data: IPickStockDTO): Promise<{ inventory: IInventory; movement: IStockMovement }> {
        const inventory = await Inventory.findById(data.inventoryId);
        if (!inventory) throw new AppError('Inventory not found', 'INVENTORY_NOT_FOUND', 404);

        // FIX: Validate we have enough stock to pick (prevents negative onHand)
        if (inventory.onHand < data.quantity) {
            logger.warn('Stock pick failed - insufficient stock', {
                inventoryId: data.inventoryId,
                sku: inventory.sku,
                requested: data.quantity,
                onHand: inventory.onHand,
            });
            throw new AppError(
                `Insufficient stock to pick. Requested: ${data.quantity}, On hand: ${inventory.onHand}`,
                'INSUFFICIENT_STOCK',
                400
            );
        }

        const previousOnHand = inventory.onHand;

        // OPTIMISTIC LOCKING: Use findOneAndUpdate with version check
        const updated = await Inventory.findOneAndUpdate(
            {
                _id: data.inventoryId,
                __v: inventory.__v
            },
            {
                $inc: { onHand: -data.quantity, __v: 1 },
                $set: { reserved: Math.max(0, inventory.reserved - data.quantity) }
            },
            { new: true }
        );

        if (!updated) {
            throw new AppError(
                'Inventory was updated by another process. Please retry.',
                'CONCURRENT_MODIFICATION',
                409
            );
        }

        logger.info('Stock picked successfully', {
            inventoryId: String(updated._id),
            sku: updated.sku,
            quantityPicked: data.quantity,
            previousOnHand,
            newOnHand: updated.onHand,
        });

        const movement = await StockMovement.create({
            warehouseId: inventory.warehouseId,
            companyId: inventory.companyId,
            movementNumber: await this.generateMovementNumber(),
            type: 'PICK',
            direction: 'OUT',
            sku: inventory.sku,
            productName: inventory.productName,
            inventoryId: inventory._id,
            quantity: -data.quantity,
            previousQuantity: previousOnHand,
            newQuantity: updated.onHand,
            fromLocationId: data.locationId,
            orderId: data.orderId,
            orderNumber: data.orderNumber,
            pickListId: data.pickListId,
            pickListNumber: data.pickListNumber,
            reason: 'Picked for order',
            performedBy: data.performedBy,
            barcodeScanned: data.barcodeScanned,
            status: 'COMPLETED',
        });

        return { inventory: updated, movement };
    }

    static async transferStock(data: ITransferStockDTO): Promise<{ inventory: IInventory; movement: IStockMovement }> {
        const inventory = await Inventory.findById(data.inventoryId);
        if (!inventory) throw new AppError('Inventory not found', 'INVENTORY_NOT_FOUND', 404);

        const movement = await StockMovement.create({
            warehouseId: inventory.warehouseId,
            companyId: inventory.companyId,
            movementNumber: await this.generateMovementNumber(),
            type: 'TRANSFER',
            direction: 'INTERNAL',
            sku: inventory.sku,
            productName: inventory.productName,
            inventoryId: inventory._id,
            quantity: data.quantity,
            previousQuantity: inventory.onHand,
            newQuantity: inventory.onHand,
            fromLocationId: data.fromLocationId,
            toLocationId: data.toLocationId,
            reason: data.reason,
            performedBy: data.performedBy,
            status: 'COMPLETED',
        });

        return { inventory, movement };
    }

    static async markDamaged(data: IMarkDamagedDTO): Promise<{ inventory: IInventory; movement: IStockMovement }> {
        const inventory = await Inventory.findById(data.inventoryId);
        if (!inventory) throw new AppError('Inventory not found', 'INVENTORY_NOT_FOUND', 404);

        inventory.damaged += data.quantity;
        inventory.onHand -= data.quantity;
        await inventory.save();

        const movement = await StockMovement.create({
            warehouseId: inventory.warehouseId,
            companyId: inventory.companyId,
            movementNumber: await this.generateMovementNumber(),
            type: 'DAMAGE',
            direction: 'OUT',
            sku: inventory.sku,
            productName: inventory.productName,
            inventoryId: inventory._id,
            quantity: -data.quantity,
            previousQuantity: inventory.onHand + data.quantity,
            newQuantity: inventory.onHand,
            reason: data.reason,
            performedBy: data.performedBy,
            status: 'COMPLETED',
        });

        return { inventory, movement };
    }

    static async cycleCount(data: ICycleCountDTO): Promise<{ inventory: IInventory; movement?: IStockMovement }> {
        const inventory = await Inventory.findById(data.inventoryId);
        if (!inventory) throw new AppError('Inventory not found', 'INVENTORY_NOT_FOUND', 404);

        const variance = data.countedQuantity - data.systemQuantity;

        if (variance !== 0) {
            inventory.onHand += variance;
            await inventory.save();

            const movement = await StockMovement.create({
                warehouseId: inventory.warehouseId,
                companyId: inventory.companyId,
                movementNumber: await this.generateMovementNumber(),
                type: 'CYCLE_COUNT',
                direction: variance > 0 ? 'IN' : 'OUT',
                sku: inventory.sku,
                productName: inventory.productName,
                inventoryId: inventory._id,
                quantity: variance,
                previousQuantity: data.systemQuantity,
                newQuantity: data.countedQuantity,
                reason: 'Cycle count adjustment',
                performedBy: data.performedBy,
                status: 'COMPLETED',
            });

            return { inventory, movement };
        }

        return { inventory };
    }

    static async checkStockAvailability(warehouseId: string, items: Array<{ sku: string; quantity: number }>): Promise<any> {
        const results = await Promise.all(
            items.map(async (item) => {
                const inventory = await Inventory.findOne({ warehouseId, sku: item.sku });
                const available = inventory ? Math.max(0, inventory.onHand - inventory.reserved - inventory.damaged) : 0;
                return {
                    sku: item.sku,
                    requested: item.quantity,
                    available,
                    sufficient: available >= item.quantity,
                };
            })
        );

        return {
            available: results.every((r) => r.sufficient),
            items: results,
        };
    }

    static async getLowStockAlerts(companyId: string): Promise<ILowStockAlert[]> {
        const inventories = await Inventory.find({
            companyId,
            status: 'LOW_STOCK',
        });

        return inventories.map((inv) => ({
            inventoryId: String(inv._id),
            sku: inv.sku,
            productName: inv.productName,
            warehouseId: String(inv.warehouseId),
            warehouseName: 'Warehouse',
            currentStock: inv.onHand - inv.reserved,
            reorderPoint: inv.reorderPoint,
            suggestedOrderQuantity: inv.reorderQuantity,
        }));
    }

    static async getMovements(options: IStockMovementQueryOptions): Promise<IPaginatedResult<IStockMovement>> {
        const { page = 1, limit = 20 } = options;
        const filter: any = {};
        if (options.warehouseId) filter.warehouseId = options.warehouseId;
        if (options.companyId) filter.companyId = options.companyId;
        if (options.inventoryId) filter.inventoryId = options.inventoryId;
        if (options.type) filter.type = options.type;

        const [data, total] = await Promise.all([
            StockMovement.find(filter).skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 }),
            StockMovement.countDocuments(filter),
        ]);

        return { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
    }

    static async getInventoryStats(warehouseId: string): Promise<IInventoryStats> {
        const inventories = await Inventory.find({ warehouseId });

        return {
            totalSKUs: inventories.length,
            totalStock: inventories.reduce((sum, inv) => sum + inv.onHand, 0),
            totalValue: inventories.reduce((sum, inv) => sum + (inv.totalValue || 0), 0),
            lowStockCount: inventories.filter((inv) => inv.status === 'LOW_STOCK').length,
            outOfStockCount: inventories.filter((inv) => inv.status === 'OUT_OF_STOCK').length,
            averageTurnoverRate: 0,
        };
    }

    static async getMovementSummary(warehouseId: string, startDate: Date, endDate: Date): Promise<any> {
        const movements = await StockMovement.find({
            warehouseId,
            createdAt: { $gte: startDate, $lte: endDate },
        });

        return {
            received: movements.filter((m) => m.type === 'RECEIVE').reduce((sum, m) => sum + m.quantity, 0),
            picked: Math.abs(movements.filter((m) => m.type === 'PICK').reduce((sum, m) => sum + m.quantity, 0)),
            transferred: movements.filter((m) => m.type === 'TRANSFER').length,
            damaged: movements.filter((m) => m.type === 'DAMAGE').reduce((sum, m) => sum + Math.abs(m.quantity), 0),
            disposed: movements.filter((m) => m.type === 'DISPOSAL').reduce((sum, m) => sum + Math.abs(m.quantity), 0),
            adjusted: movements.filter((m) => m.type === 'ADJUSTMENT').reduce((sum, m) => sum + m.quantity, 0),
            period: { startDate, endDate },
        };
    }

    static async generateMovementNumber(): Promise<string> {
        const year = new Date().getFullYear();
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `SM-${year}-${timestamp}-${random}`;
    }
}
