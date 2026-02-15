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

import {
IAdjustStockDTO,
ICreateInventoryDTO,
ICycleCountDTO,
IInventoryQueryOptions,
IInventoryStats,
ILowStockAlert,
IMarkDamagedDTO,
IPaginatedResult,
IPickStockDTO,
IReceiveStockDTO,
IReleaseReservationDTO,
IReserveStockDTO,
IStockMovementQueryOptions,
ITransferStockDTO,
IUpdateInventoryDTO
} from '@/core/domain/interfaces/warehouse/inventory.interface.service';
import { IInventory, Inventory, IStockMovement, StockMovement } from '@/infrastructure/database/mongoose/models';
import { AppError } from '@/shared/errors/app.error';
import logger from '@/shared/logger/winston.logger';
import csv from 'csv-parser';
import mongoose from 'mongoose';
import { Readable } from 'stream';

interface CSVInventoryRow {
    sku: string;
    quantity: string;
    productName?: string;
    location?: string;
    barcode?: string;
    reorderPoint?: string;
}

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

    /**
     * Import inventory from CSV
     * Handles bulk creation/update of inventory items
     */
    static async importFromCSV(
        companyId: string,
        warehouseId: string,
        fileBuffer: Buffer,
        userId: string
    ): Promise<{ success: number; failed: number; errors: any[] }> {
        const results: CSVInventoryRow[] = [];
        const errors: any[] = [];

        // Parse CSV
        await new Promise<void>((resolve, reject) => {
            const stream = Readable.from(fileBuffer);
            stream
                .pipe(csv())
                .on('data', (data: any) => results.push(data))
                .on('end', () => resolve())
                .on('error', (err: any) => reject(err));
        });

        let successCount = 0;
        let failedCount = 0;

        // Process in batches of 50 to manage memory/connections
        const BATCH_SIZE = 50;
        for (let i = 0; i < results.length; i += BATCH_SIZE) {
            const batch = results.slice(i, i + BATCH_SIZE);

            await Promise.all(batch.map(async (row, index) => {
                const rowIndex = i + index + 2; // +2 for 1-based index and header row
                const session = await mongoose.startSession();
                session.startTransaction();

                try {
                    // Validation
                    if (!row.sku || !row.quantity) {
                        throw new Error('SKU and Quantity are required');
                    }

                    const quantity = parseInt(row.quantity, 10);
                    if (isNaN(quantity) || quantity < 0) {
                        throw new Error('Quantity must be a valid non-negative number');
                    }

                    if (row.reorderPoint) {
                        const rp = parseInt(row.reorderPoint, 10);
                        if (isNaN(rp) || rp < 0) {
                            throw new Error('Reorder Point must be a valid non-negative number');
                        }
                    }

                    const sku = row.sku.trim();
                    const productName = row.productName?.trim() || sku;

                    // Find or Create Inventory
                    let inventory = await Inventory.findOne({
                        warehouseId,
                        sku
                    }).session(session);

                    let previousQty = 0;
                    let movementType: 'RECEIVE' | 'ADJUSTMENT' = 'ADJUSTMENT';

                    if (inventory) {
                        previousQty = inventory.onHand;
                        inventory.onHand = quantity; // Overwrite strategy
                        inventory.productName = productName; // Update name if provided
                        if (row.barcode) inventory.barcode = row.barcode;
                        if (row.reorderPoint) inventory.reorderPoint = parseInt(row.reorderPoint, 10);
                        if (row.location) inventory.location = row.location;
                        await inventory.save({ session });
                    } else {
                        movementType = 'RECEIVE';
                        const newInventory = await Inventory.create([{
                            warehouseId,
                            companyId,
                            sku,
                            productName,
                            onHand: quantity,
                            barcode: row.barcode,
                            reorderPoint: row.reorderPoint ? parseInt(row.reorderPoint, 10) : undefined,
                            location: row.location,
                            status: 'ACTIVE'
                        }], { session });
                        inventory = newInventory[0];
                    }

                    // Create Movement if quantity changed
                    if (previousQty !== quantity || movementType === 'RECEIVE') {
                        const diff = quantity - previousQty;
                        await StockMovement.create([{
                            warehouseId,
                            companyId,
                            movementNumber: await this.generateMovementNumber(),
                            type: movementType,
                            direction: diff >= 0 ? 'IN' : 'OUT',
                            sku,
                            productName,
                            inventoryId: inventory._id,
                            quantity: Math.abs(diff),
                            previousQuantity: previousQty,
                            newQuantity: quantity,
                            reason: 'CSV Import',
                            performedBy: userId,
                            status: 'COMPLETED'
                        }], { session });
                    }

                    await session.commitTransaction();
                    successCount++;

                } catch (error: any) {
                    await session.abortTransaction();
                    failedCount++;
                    errors.push({
                        row: rowIndex,
                        sku: row.sku || 'UNKNOWN',
                        error: error.message
                    });
                } finally {
                    session.endSession();
                }
            }));
        }

        return {
            success: successCount,
            failed: failedCount,
            errors
        };
    }
}
