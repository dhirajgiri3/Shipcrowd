/**
 * InventoryService - Refactored to Static Methods
 */

import mongoose from 'mongoose';
import Inventory, { IInventory } from '@/infrastructure/database/mongoose/models/Inventory';
import StockMovement, { IStockMovement } from '@/infrastructure/database/mongoose/models/StockMovement';
import WarehouseLocation from '@/infrastructure/database/mongoose/models/WarehouseLocation';
import {
    ICreateInventoryDTO,
    IReceiveStockDTO,
    IAdjustStockDTO,
    IReserveStockDTO,
    IPickStockDTO,
    IInventoryQueryOptions,
    ILowStockAlert,
    IInventoryStats,
    IPaginatedResult,
} from '@/core/domain/interfaces/warehouse/IInventoryService';
import { AppError } from '@/shared/errors/AppError';

export default class InventoryService {
    static async createInventory(data: ICreateInventoryDTO): Promise<IInventory> {
        const existing = await Inventory.findOne({ warehouseId: data.warehouseId, sku: data.sku });
        if (existing) throw new AppError('Inventory already exists for this SKU', 400);

        return Inventory.create({
            ...data,
            onHand: data.initialQuantity || 0,
            reserved: 0,
            status: 'ACTIVE',
        });
    }

    static async updateInventory(data: any): Promise<IInventory> {
        const inventory = await Inventory.findByIdAndUpdate(data.inventoryId, data, { new: true });
        if (!inventory) throw new AppError('Inventory not found', 404);
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
        if (options.sku) filter.sku = new RegExp(options.sku, 'i');
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
        if (!inventory) throw new AppError('Inventory not found', 404);
        inventory.status = 'DISCONTINUED';
        await inventory.save();
        return inventory;
    }

    static async receiveStock(data: IReceiveStockDTO): Promise<{ inventory: IInventory; movement: IStockMovement }> {
        let inventory = await Inventory.findOne({ warehouseId: data.warehouseId, sku: data.sku });

        if (!inventory) {
            inventory = await Inventory.create({
                warehouseId: data.warehouseId,
                companyId: data.companyId,
                sku: data.sku,
                productName: data.sku,
                onHand: data.quantity,
            });
        } else {
            inventory.onHand += data.quantity;
            await inventory.save();
        }

        const movement = await StockMovement.create({
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
        });

        return { inventory, movement };
    }

    static async adjustStock(data: IAdjustStockDTO): Promise<{ inventory: IInventory; movement: IStockMovement }> {
        const inventory = await Inventory.findById(data.inventoryId);
        if (!inventory) throw new AppError('Inventory not found', 404);

        const previousQty = inventory.onHand;
        inventory.onHand += data.quantity;
        await inventory.save();

        const movement = await StockMovement.create({
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
        });

        return { inventory, movement };
    }

    static async reserveStock(data: IReserveStockDTO): Promise<IInventory> {
        const inventory = await Inventory.findById(data.inventoryId);
        if (!inventory) throw new AppError('Inventory not found', 404);

        const available = inventory.onHand - inventory.reserved;
        if (available < data.quantity) {
            throw new AppError('Insufficient stock available', 400);
        }

        inventory.reserved += data.quantity;
        await inventory.save();
        return inventory;
    }

    static async releaseReservation(data: any): Promise<IInventory> {
        const inventory = await Inventory.findById(data.inventoryId);
        if (!inventory) throw new AppError('Inventory not found', 404);

        inventory.reserved = Math.max(0, inventory.reserved - data.quantity);
        await inventory.save();
        return inventory;
    }

    static async pickStock(data: IPickStockDTO): Promise<{ inventory: IInventory; movement: IStockMovement }> {
        const inventory = await Inventory.findById(data.inventoryId);
        if (!inventory) throw new AppError('Inventory not found', 404);

        inventory.onHand -= data.quantity;
        inventory.reserved = Math.max(0, inventory.reserved - data.quantity);
        await inventory.save();

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
            previousQuantity: inventory.onHand + data.quantity,
            newQuantity: inventory.onHand,
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

        return { inventory, movement };
    }

    static async transferStock(data: any): Promise<{ inventory: IInventory; movement: IStockMovement }> {
        const inventory = await Inventory.findById(data.inventoryId);
        if (!inventory) throw new AppError('Inventory not found', 404);

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

    static async markDamaged(data: any): Promise<{ inventory: IInventory; movement: IStockMovement }> {
        const inventory = await Inventory.findById(data.inventoryId);
        if (!inventory) throw new AppError('Inventory not found', 404);

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

    static async cycleCount(data: any): Promise<{ inventory: IInventory; movement?: IStockMovement }> {
        const inventory = await Inventory.findById(data.inventoryId);
        if (!inventory) throw new AppError('Inventory not found', 404);

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
            inventoryId: inv._id.toString(),
            sku: inv.sku,
            productName: inv.productName,
            warehouseId: inv.warehouseId.toString(),
            warehouseName: 'Warehouse',
            currentStock: inv.onHand - inv.reserved,
            reorderPoint: inv.reorderPoint,
            suggestedOrderQuantity: inv.reorderQuantity,
        }));
    }

    static async getMovements(options: any): Promise<IPaginatedResult<IStockMovement>> {
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
        const count = await StockMovement.countDocuments();
        return `SM-${year}-${(count + 1).toString().padStart(6, '0')}`;
    }
}
