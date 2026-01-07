/**
 * Picking
 * 
 * Purpose: PickingService - Refactored to Static Methods
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
import { PickList, IPickList, IPickListItem } from '@/infrastructure/database/mongoose/models';
import { Order, IOrder } from '@/infrastructure/database/mongoose/models';
import { WarehouseLocation } from '@/infrastructure/database/mongoose/models';
import { Inventory } from '@/infrastructure/database/mongoose/models';
import {
    ICreatePickListDTO,
    IAssignPickListDTO,
    IStartPickingDTO,
    IPickItemDTO,
    ICompletePickListDTO,
    IVerifyPickListDTO,
    ICancelPickListDTO,
    IPickListQueryOptions,
    IPickerStats,
    IPickListStats,
    IPaginatedResult,
} from '@/core/domain/interfaces/warehouse/picking.interface.service';
import { AppError } from '@/shared/errors/app.error';
import logger from '@/shared/logger/winston.logger';

export default class PickingService {
    static async createPickList(data: ICreatePickListDTO): Promise<IPickList> {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const orders = await Order.find({
                _id: { $in: data.orderIds },
                status: { $in: ['CONFIRMED', 'PROCESSING'] },
                companyId: data.companyId,
            }).session(session);

            if (orders.length === 0) {
                throw new AppError('No valid orders found for picking', 'NO_VALID_ORDERS', 400);
            }

            const pickListItems: IPickListItem[] = [];

            // FIX: Batch load all locations upfront to avoid N+1 query problem  
            const allSkus = orders.flatMap(o =>
                (o.products || []).map(p => p.sku).filter((sku): sku is string => Boolean(sku))
            );
            const locationMap = await this.batchFindOptimalLocations(
                allSkus,
                data.warehouseId,
                session || null
            );

            for (const order of orders) {
                for (const product of order.products || []) {
                    if (!product.sku) continue; // Skip products without SKU

                    const location = locationMap.get(product.sku);
                    if (!location) {
                        throw new AppError(`No stock found for SKU ${product.sku}`, 'STOCK_NOT_FOUND', 400);
                    }

                    pickListItems.push({
                        orderId: order._id,
                        orderItemId: order._id, // Use order ID as fallback since products don't have individual IDs
                        orderNumber: order.orderNumber,
                        sku: product.sku,
                        productName: product.name,
                        locationId: location._id,
                        locationCode: location.locationCode,
                        zone: location.locationCode?.includes('-')
                            ? location.locationCode.split('-')[0]
                            : (location.locationCode || 'UNKNOWN'),
                        aisle: location.aisle,
                        quantityRequired: product.quantity,
                        quantityPicked: 0,
                        quantityShort: 0,
                        status: 'PENDING',
                        barcodeScanned: false,
                        sequence: 0,
                    } as IPickListItem);
                }
            }

            const optimizedItems = this.optimizeByStrategy(pickListItems, data.pickingStrategy);
            const pickListNumber = await this.generatePickListNumber();

            const [pickList] = await PickList.create([{
                warehouseId: data.warehouseId,
                companyId: data.companyId,
                pickListNumber,
                orders: data.orderIds,
                items: optimizedItems,
                pickingStrategy: data.pickingStrategy,
                priority: data.priority || 'MEDIUM',
                status: data.assignTo ? 'ASSIGNED' : 'PENDING',
                assignedTo: data.assignTo,
                assignedAt: data.assignTo ? new Date() : undefined,
                estimatedPickTime: this.estimatePickTime(optimizedItems),
                notes: data.notes,
                scheduledAt: data.scheduledAt,
            }], { session });

            await session.commitTransaction();

            logger.info('Pick list created successfully', {
                pickListNumber,
                warehouseId: String(data.warehouseId),
                orderCount: data.orderIds.length,
                itemCount: optimizedItems.length,
                strategy: data.pickingStrategy,
                assignedTo: data.assignTo ? String(data.assignTo) : 'unassigned',
            });

            return pickList;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async getPickListById(id: string): Promise<IPickList | null> {
        return PickList.findById(id).populate('assignedTo', 'firstName lastName');
    }

    static async getPickLists(options: IPickListQueryOptions): Promise<IPaginatedResult<IPickList>> {
        const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;
        const filter: any = {};

        if (options.warehouseId) filter.warehouseId = options.warehouseId;
        if (options.companyId) filter.companyId = options.companyId;
        if (options.status) filter.status = Array.isArray(options.status) ? { $in: options.status } : options.status;
        if (options.assignedTo) filter.assignedTo = options.assignedTo;

        const [pickLists, total] = await Promise.all([
            PickList.find(filter).sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 }).skip((page - 1) * limit).limit(limit).populate('assignedTo', 'firstName lastName'),
            PickList.countDocuments(filter),
        ]);

        return { data: pickLists, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
    }

    static async getPickListsByPicker(pickerId: string, status?: string): Promise<IPickList[]> {
        const filter: any = { assignedTo: pickerId };
        if (status) filter.status = status;
        return PickList.find(filter).sort({ priority: -1, createdAt: 1 }).populate('warehouseId', 'name code');
    }

    static async assignPickList(data: IAssignPickListDTO): Promise<IPickList> {
        const pickList = await PickList.findById(data.pickListId);
        if (!pickList) throw new AppError('Pick list not found', 'PICK_LIST_NOT_FOUND', 404);

        pickList.assignedTo = new mongoose.Types.ObjectId(data.pickerId);
        pickList.assignedBy = new mongoose.Types.ObjectId(data.assignedBy);
        pickList.assignedAt = new Date();
        pickList.status = 'ASSIGNED';
        await pickList.save();

        logger.info('Pick list assigned to picker', {
            pickListId: String(data.pickListId),
            pickListNumber: pickList.pickListNumber,
            pickerId: data.pickerId,
            assignedBy: data.assignedBy,
        });

        return pickList;
    }

    static async unassignPickList(pickListId: string): Promise<IPickList> {
        const pickList = await PickList.findById(pickListId);
        if (!pickList) throw new AppError('Pick list not found', 'PICK_LIST_NOT_FOUND', 404);

        pickList.assignedTo = undefined;
        pickList.assignedBy = undefined;
        pickList.assignedAt = undefined;
        pickList.status = 'PENDING';
        await pickList.save();
        return pickList;
    }

    static async startPicking(data: IStartPickingDTO): Promise<IPickList> {
        const pickList = await PickList.findById(data.pickListId);
        if (!pickList) throw new AppError('Pick list not found', 'PICK_LIST_NOT_FOUND', 404);

        pickList.status = 'IN_PROGRESS';
        pickList.startedAt = new Date();
        await pickList.save();
        return pickList;
    }

    static async pickItem(data: IPickItemDTO): Promise<IPickList> {
        const pickList = await PickList.findById(data.pickListId);
        if (!pickList) throw new AppError('Pick list not found', 'PICK_LIST_NOT_FOUND', 404);

        const item = pickList.items.find((i) => i._id?.toString() === data.itemId);
        if (!item) throw new AppError('Item not found', 'ITEM_NOT_FOUND', 404);

        item.quantityPicked = data.quantityPicked;
        item.barcodeScanned = data.barcodeScanned;
        item.notes = data.notes;
        item.reason = data.reason;
        item.status = data.quantityPicked === item.quantityRequired ? 'PICKED' : 'SHORT_PICK';

        await pickList.save();
        return pickList;
    }

    static async skipItem(pickListId: string, itemId: string, reason: string): Promise<IPickList> {
        const pickList = await PickList.findById(pickListId);
        if (!pickList) throw new AppError('Pick list not found', 'PICK_LIST_NOT_FOUND', 404);

        const item = pickList.items.find((i) => i._id?.toString() === itemId);
        if (!item) throw new AppError('Item not found', 'ITEM_NOT_FOUND', 404);

        item.status = 'SKIPPED';
        item.reason = reason;
        await pickList.save();
        return pickList;
    }

    static async completePickList(data: ICompletePickListDTO): Promise<IPickList> {
        const pickList = await PickList.findById(data.pickListId);
        if (!pickList) throw new AppError('Pick list not found', 'PICK_LIST_NOT_FOUND', 404);

        pickList.status = 'COMPLETED';
        pickList.completedAt = new Date();
        pickList.pickerNotes = data.pickerNotes;
        await pickList.save();

        const stats = {
            totalItems: pickList.items.length,
            picked: pickList.items.filter(i => i.status === 'PICKED').length,
            short: pickList.items.filter(i => i.status === 'SHORT_PICK').length,
        };

        logger.info('Pick list completed', {
            pickListId: String(data.pickListId),
            pickListNumber: pickList.pickListNumber,
            ...stats,
            duration: pickList.startedAt ? Date.now() - pickList.startedAt.getTime() : null,
        });

        return pickList;
    }

    static async cancelPickList(data: ICancelPickListDTO): Promise<IPickList> {
        const pickList = await PickList.findById(data.pickListId);
        if (!pickList) throw new AppError('Pick list not found', 'PICK_LIST_NOT_FOUND', 404);

        pickList.status = 'CANCELLED';
        pickList.exceptions.push(`Cancelled by ${data.cancelledBy}: ${data.reason}`);
        await pickList.save();

        logger.warn('Pick list cancelled', {
            pickListId: String(data.pickListId),
            pickListNumber: pickList.pickListNumber,
            reason: data.reason,
            cancelledBy: data.cancelledBy,
        });

        return pickList;
    }

    static async verifyPickList(data: IVerifyPickListDTO): Promise<IPickList> {
        const pickList = await PickList.findById(data.pickListId);
        if (!pickList) throw new AppError('Pick list not found', 'PICK_LIST_NOT_FOUND', 404);

        pickList.verificationStatus = data.passed ? 'PASSED' : 'FAILED';
        pickList.verifiedBy = new mongoose.Types.ObjectId(data.verifierId);
        pickList.verifiedAt = new Date();
        if (data.notes) pickList.notes = (pickList.notes || '') + '\nVerification: ' + data.notes;

        await pickList.save();
        return pickList;
    }

    static async optimizePickPath(pickListId: string): Promise<IPickListItem[]> {
        const pickList = await PickList.findById(pickListId);
        if (!pickList) throw new AppError('Pick list not found', 'PICK_LIST_NOT_FOUND', 404);
        const optimized = this.optimizeByStrategy(pickList.items as IPickListItem[], pickList.pickingStrategy);
        pickList.items = optimized as any;
        await pickList.save();
        return optimized;
    }

    static async suggestNextItem(pickListId: string): Promise<IPickListItem | null> {
        const pickList = await PickList.findById(pickListId);
        if (!pickList) return null;
        return pickList.items.find((i) => i.status === 'PENDING') || null;
    }

    static async getPickerStats(pickerId: string, startDate: Date, endDate: Date): Promise<IPickerStats> {
        const pickLists = await PickList.find({
            assignedTo: pickerId,
            createdAt: { $gte: startDate, $lte: endDate },
        });

        return {
            pickerId,
            pickerName: 'Picker',
            totalPickLists: pickLists.length,
            completedPickLists: pickLists.filter((p) => p.status === 'COMPLETED').length,
            itemsPicked: pickLists.reduce((sum, p) => sum + p.pickedItems, 0),
            averagePickTime: 0,
            accuracy: 95,
            productivityScore: 85,
            period: { startDate, endDate },
        };
    }

    static async getPickListStats(warehouseId: string, startDate: Date, endDate: Date): Promise<IPickListStats> {
        const pickLists = await PickList.find({
            warehouseId,
            createdAt: { $gte: startDate, $lte: endDate },
        });

        return {
            total: pickLists.length,
            pending: pickLists.filter((p) => p.status === 'PENDING').length,
            inProgress: pickLists.filter((p) => p.status === 'IN_PROGRESS').length,
            completed: pickLists.filter((p) => p.status === 'COMPLETED').length,
            cancelled: pickLists.filter((p) => p.status === 'CANCELLED').length,
            averageCompletionTime: 25,
            averageItemsPerList: 12,
        };
    }

    static async generatePickListNumber(): Promise<string> {
        const year = new Date().getFullYear();
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `PL-${year}-${timestamp}-${random}`;
    }

    static estimatePickTime(items: IPickListItem[]): number {
        return Math.ceil(items.length * 0.5);
    }

    /**
     * Batch find optimal locations for multiple SKUs (prevents N+1 query problem)
     * @returns Map of SKU -> Location for O(1) lookups
     */
    private static async batchFindOptimalLocations(
        skus: string[],
        warehouseId: string,
        session?: mongoose.ClientSession | null
    ): Promise<Map<string, any>> {
        const locations = await WarehouseLocation.find({
            warehouseId,
            currentSKU: { $in: skus },
            currentStock: { $gt: 0 },
            status: 'OCCUPIED',
        })
            .sort({ isPickFace: -1, pickPriority: 1 })
            .session(session || null);

        // Group by SKU, keeping the first (best) location for each
        const locationMap = new Map();
        for (const location of locations) {
            if (!locationMap.has(location.currentSKU)) {
                locationMap.set(location.currentSKU, location);
            }
        }
        return locationMap;
    }

    private static async findOptimalLocation(sku: string, warehouseId: string, quantity: number): Promise<any> {
        return WarehouseLocation.findOne({
            warehouseId,
            currentSKU: sku,
            currentStock: { $gte: quantity },
            status: 'OCCUPIED',
        }).sort({ isPickFace: -1, pickPriority: 1 });
    }

    private static optimizeByStrategy(items: IPickListItem[], strategy: string): IPickListItem[] {
        const sorted = [...items];
        if (strategy === 'ZONE') {
            sorted.sort((a, b) => a.zone.localeCompare(b.zone) || a.locationCode.localeCompare(b.locationCode));
        }
        sorted.forEach((item, i) => (item.sequence = i + 1));
        return sorted;
    }
}
