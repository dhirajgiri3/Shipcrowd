/**
 * Pick Lists Seeder
 *
 * Generates pick lists for order fulfillment operations.
 * - Batches 5-15 orders per pick list
 * - Links to warehouse locations and staff
 * - Simulates picking, packing, and verification workflow
 */

import mongoose from 'mongoose';
import PickList from '../../mongoose/models/logistics/warehouse/activities/pick-list.model';
import Order from '../../mongoose/models/orders/core/order.model';
import Warehouse from '../../mongoose/models/logistics/warehouse/structure/warehouse.model';
import Inventory from '../../mongoose/models/logistics/inventory/store/inventory.model';
import User from '../../mongoose/models/iam/users/user.model';
import { SEED_CONFIG } from '../config';
import { randomInt, selectRandom, selectWeightedFromObject } from '../utils/random.utils';
import { logger, createTimer } from '../utils/logger.utils';
import { addDays, addMinutes } from '../utils/date.utils';

// Pick list status distribution
const PICKLIST_STATUS_DISTRIBUTION = {
    pending: 15,
    picking: 20,
    picked: 45,
    verified: 20,
};

/**
 * Generate pick list ID
 */
function generatePickListId(date: Date, warehouseId: string): string {
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const whCode = warehouseId.toString().slice(-4).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `PL-${dateStr}-${whCode}-${random}`;
}

/**
 * Generate pick list items from orders
 */
function generatePickListItems(orders: any[], warehouseId: string, inventory: Map<string, any>): any[] {
    const items: any[] = [];
    let itemNumber = 1;

    for (const order of orders) {
        if (!order.products || order.products.length === 0) continue;

        for (const product of order.products) {
            const inventoryKey = `${warehouseId}-${product.name}`;
            const inventoryItem = inventory.get(inventoryKey);

            // Find location code from inventory if available
            let locationCode = undefined;
            if (inventoryItem?.locations && inventoryItem.locations.length > 0) {
                const location = selectRandom(inventoryItem.locations) as any;
                locationCode = location?.locationCode;
            }

            items.push({
                itemNumber,
                orderId: order._id,
                orderNumber: order.orderNumber,
                sku: product.sku || inventoryItem?.sku || product.name,
                productName: product.name,
                quantityOrdered: product.quantity || 1,
                quantityPicked: 0, // Will be updated during picking
                locationCode,
                warehouseId,
                status: 'pending',
                flaggedForQC: Math.random() < 0.05, // 5% flagged
                qcNotes: Math.random() < 0.05 ? selectRandom([
                    'Check expiry date',
                    'Verify seal integrity',
                    'Check for damage',
                ]) : undefined,
            });

            itemNumber++;
        }
    }

    return items;
}

/**
 * Main seeder function
 */
export async function seedPickLists(): Promise<void> {
    const timer = createTimer();
    logger.step(5, 'Seeding Pick Lists');

    try {
        // Get orders that need picking (confirmed, processing, or a sample of delivered for historical data)
        const orders = await Order.find({
            currentStatus: { $in: ['confirmed', 'processing', 'shipped'] },
            isDeleted: false,
        }).limit(500).lean(); // Limit to 500 for reasonable pick list generation

        if (orders.length === 0) {
            logger.warn('No orders found for pick list generation. Skipping pick lists seeder.');
            return;
        }

        // Get warehouses
        const warehouses = await Warehouse.find({ isActive: true, isDeleted: false }).lean();
        const warehouseMap = new Map(warehouses.map(w => [w._id.toString(), w]));

        // Get inventory with locations
        const inventoryRecords = await Inventory.find({
            isActive: true,
            isDeleted: false,
        }).lean();

        // Create inventory lookup map
        const inventoryMap = new Map<string, any>();
        for (const inv of inventoryRecords) {
            const key = `${inv.warehouseId.toString()}-${inv.productName}`;
            inventoryMap.set(key, inv);
        }

        // Get staff users for assignment
        const staffUsers = await User.find({ role: 'staff', isActive: true }).lean();

        // Group orders by warehouse
        const ordersByWarehouse = new Map<string, any[]>();
        for (const order of orders) {
            const warehouseId = order.warehouseId?.toString();
            if (!warehouseId) continue;

            if (!ordersByWarehouse.has(warehouseId)) {
                ordersByWarehouse.set(warehouseId, []);
            }
            ordersByWarehouse.get(warehouseId)!.push(order);
        }

        const pickLists: any[] = [];
        let totalItems = 0;
        let flaggedItems = 0;

        // Create pick lists for each warehouse
        for (const [warehouseId, warehouseOrders] of ordersByWarehouse.entries()) {
            const warehouse = warehouseMap.get(warehouseId);
            if (!warehouseOrders || warehouseOrders.length === 0 || !warehouse) continue;

            // Create batches of 5-15 orders
            const batchSize = randomInt(5, 15);
            const batchCount = Math.ceil(warehouseOrders.length / batchSize);

            for (let batchNum = 0; batchNum < batchCount; batchNum++) {
                const startIdx = batchNum * batchSize;
                const endIdx = Math.min(startIdx + batchSize, warehouseOrders.length);
                const batchOrders = warehouseOrders.slice(startIdx, endIdx);

                if (batchOrders.length === 0) continue;

                const createdDate = new Date(Date.now() - randomInt(1, 3) * 24 * 60 * 60 * 1000);
                const status = selectWeightedFromObject(PICKLIST_STATUS_DISTRIBUTION);
                const items = generatePickListItems(batchOrders, warehouseId, inventoryMap);

                // Count flagged items
                const flagged = items.filter(i => i.flaggedForQC).length;
                flaggedItems += flagged;

                // Assign picker if not pending
                let assignedTo = undefined;
                let startedAt = undefined;
                let completedAt = undefined;
                let verifiedBy = undefined;
                let verifiedAt = undefined;

                if (status !== 'pending' && staffUsers.length > 0) {
                    const picker = selectRandom(staffUsers);
                    assignedTo = picker._id;
                    startedAt = addDays(createdDate, randomInt(0, 1));

                    if (status === 'picked' || status === 'verified') {
                        completedAt = addMinutes(startedAt || createdDate, randomInt(15, 45));
                    }

                    if (status === 'verified' && staffUsers.length > 0) {
                        const verifier = selectRandom(staffUsers);
                        verifiedBy = verifier._id;
                        verifiedAt = addMinutes(completedAt || createdDate, randomInt(5, 10));
                    }
                }

                pickLists.push({
                    pickListId: generatePickListId(createdDate, warehouseId),
                    warehouseId: new mongoose.Types.ObjectId(warehouseId),
                    company: batchOrders[0]?.companyId,
                    orders: batchOrders.map(o => o._id),
                    items,
                    totalItems: items.length,
                    totalOrders: batchOrders.length,
                    status,
                    assignedTo,
                    startedAt,
                    completedAt,
                    verifiedBy,
                    verifiedAt,
                    timeline: [{
                        status: 'created',
                        timestamp: createdDate,
                        actor: 'system',
                        action: `Pick list created with ${items.length} items from ${batchOrders.length} orders`,
                    }],
                    createdAt: createdDate,
                    updatedAt: verifiedAt || completedAt || startedAt || createdDate,
                    isDeleted: false,
                });

                totalItems += items.length;
            }
        }

        // Insert pick lists
        if (pickLists.length > 0) {
            await PickList.insertMany(pickLists);
        }

        const completedCount = pickLists.filter(p => p.status === 'verified').length;
        const inProgressCount = pickLists.filter(p => ['picking', 'picked'].includes(p.status)).length;
        const pendingCount = pickLists.filter(p => p.status === 'pending').length;

        logger.complete('pick lists', pickLists.length, timer.elapsed());
        logger.table({
            'Total Pick Lists': pickLists.length,
            'Total Items': totalItems,
            'Items Flagged for QC': flaggedItems,
            'Status: Completed': completedCount,
            'Status: In Progress': inProgressCount,
            'Status: Pending': pendingCount,
            'Avg Items per List': totalItems > 0 ? Math.round(totalItems / pickLists.length) : 0,
        });

    } catch (error) {
        logger.error('Failed to seed pick lists:', error);
        throw error;
    }
}

/**
 * Get pick lists by warehouse
 */
export async function getPickListsByWarehouse(warehouseId: mongoose.Types.ObjectId) {
    return PickList.find({ warehouseId, isDeleted: false }).lean();
}

/**
 * Get pending pick lists
 */
export async function getPendingPickLists() {
    return PickList.find({ status: { $in: ['pending', 'picking'] }, isDeleted: false }).lean();
}
