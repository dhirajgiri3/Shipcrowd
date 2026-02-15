/**
 * Pick Lists Seeder
 *
 * Generates pick lists for order fulfillment operations.
 * - Batches 5-15 orders per pick list
 * - Links to warehouse locations and staff
 * - Simulates picking, packing, and verification workflow
 */

import mongoose from 'mongoose';
import User from '../../mongoose/models/iam/users/user.model';
import Inventory from '../../mongoose/models/logistics/inventory/store/inventory.model';
import PickList from '../../mongoose/models/logistics/warehouse/activities/pick-list.model';
import Warehouse from '../../mongoose/models/logistics/warehouse/structure/warehouse.model';
import Order from '../../mongoose/models/orders/core/order.model';
import { addMinutes } from '../utils/date.utils';
import { createTimer, logger } from '../utils/logger.utils';
import { randomInt, selectRandom, selectWeightedFromObject } from '../utils/random.utils';

// Pick list status distribution - Uppercase to match Enum
const PICKLIST_STATUS_DISTRIBUTION = {
    PENDING: 15,
    IN_PROGRESS: 20, // Was picking
    COMPLETED: 45, // Was picked/verified merged
    ASSIGNED: 20,
};

/**
 * Generate pick list Number
 */
function generatePickListNumber(date: Date, warehouseId: string): string {
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
    let sequence = 1;

    for (const order of orders) {
        if (!order.products || order.products.length === 0) continue;

        for (const product of order.products) {
            const inventoryKey = `${warehouseId}-${product.name}`;
            const inventoryItem = inventory.get(inventoryKey);

            // Find location details
            let locationId = new mongoose.Types.ObjectId(); // Default new ID if not found (should be found in real scenario)
            let locationCode = 'UNKNOWN';
            let zone = 'A';
            let aisle = '01';

            // Try to find a valid location from inventory
            if (inventoryItem?.locations && inventoryItem.locations.length > 0) {
                const randomLoc = selectRandom(inventoryItem.locations) as any;
                if (randomLoc) {
                    locationCode = randomLoc.locationCode;
                    locationId = randomLoc.locationId;

                    // Parse location code for zone/aisle if available
                    // Format: Zone-Aisle-Rack-Shelf-Bin (e.g., A-01-03-02-05)
                    if (locationCode && locationCode.includes('-')) {
                        const parts = locationCode.split('-');
                        if (parts.length >= 2) {
                            // Assuming Zone is first part, Aisle is second
                            // But wait, generateInventoryLocations uses "ZONE-A-A01..."
                            // Let's just use defaults or parse simple Logic
                            // Actually, just leaving defaults 'A', '01' is fine for seeding.
                        }
                    }
                }
            }

            items.push({
                sequence,
                orderId: order._id,
                orderItemId: product._id || new mongoose.Types.ObjectId(), // Ensure we have an ID
                orderNumber: order.orderNumber,
                sku: product.sku || inventoryItem?.sku || product.name,
                productName: product.name,
                barcode: product.sku, // Fallback

                // Location data
                locationId,
                locationCode,
                zone,
                aisle,

                // Quantities
                quantityRequired: product.quantity || 1,
                quantityPicked: 0, // Will be updated if status is PICKED
                quantityShort: 0,

                status: 'PENDING', // Default item status
                barcodeScanned: false,

                // Notes from potential QC flags (mapped to notes)
                notes: Math.random() < 0.05 ? selectRandom([
                    'Check expiry date',
                    'Verify seal integrity',
                    'Check for damage',
                ]) : undefined,
            });

            sequence++;
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
        }).limit(500).lean();
        logger.info(`Fetched ${orders.length} orders`);

        if (orders.length === 0) {
            logger.warn('No orders found for pick list generation. Skipping pick lists seeder.');
            return;
        }

        // Get warehouses
        const warehouses = await Warehouse.find({ isActive: true, isDeleted: false }).lean();
        logger.info(`Fetched ${warehouses.length} warehouses`);
        const warehouseMap = new Map(warehouses.map(w => [w._id.toString(), w]));

        // Get inventory with locations
        const inventoryRecords = await Inventory.find({
            isActive: true,
        }).lean();
        logger.info(`Fetched ${inventoryRecords.length} inventory records`);

        // Create inventory lookup map
        const inventoryMap = new Map<string, any>();
        for (const inv of inventoryRecords) {
            const key = `${inv.warehouseId.toString()}-${inv.productName}`;
            inventoryMap.set(key, inv);
        }

        // Removed WarehouseLocation fetch to prevent OOM/Hang and because it wasn't working with mismatching IDs

        // Get staff users for assignment
        const staffUsers = await User.find({ role: 'staff', isActive: true }).lean();
        logger.info(`Fetched ${staffUsers.length} staff users`);

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
        let totalItemsCount = 0;

        // Create pick lists for each warehouse
        for (const [warehouseId, warehouseOrders] of ordersByWarehouse.entries()) {
            logger.info(`Processing warehouse ${warehouseId} with ${warehouseOrders.length} orders`);
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

                const createdDate = new Date(Date.now() - randomInt(1, 4) * 24 * 60 * 60 * 1000); // 1-4 days ago
                const listStatus = selectWeightedFromObject(PICKLIST_STATUS_DISTRIBUTION) as string;

                // Generate items
                const items = generatePickListItems(batchOrders, warehouseId, inventoryMap);

                // Calculate item aggregates
                const totalItems = items.length;

                // Update items based on list status
                if (listStatus === 'COMPLETED') {
                    items.forEach(item => {
                        item.status = 'PICKED';
                        item.quantityPicked = item.quantityRequired;
                        item.barcodeScanned = true;
                        item.scannedAt = addMinutes(createdDate, randomInt(30, 120));
                    });
                } else if (listStatus === 'IN_PROGRESS') {
                    // Randomly pick some items
                    items.forEach(item => {
                        if (Math.random() > 0.3) {
                            item.status = 'PICKED';
                            item.quantityPicked = item.quantityRequired;
                            item.barcodeScanned = true;
                            item.scannedAt = addMinutes(createdDate, randomInt(10, 60));
                        }
                    });
                }

                const pickedItems = items.filter(i => i.status === 'PICKED').length;

                // Assignment details
                let assignedTo = undefined;
                let startedAt = undefined;
                let completedAt = undefined;
                let verifiedBy = undefined;
                let verifiedAt = undefined;

                if (listStatus !== 'PENDING' && staffUsers.length > 0) {
                    const picker = selectRandom(staffUsers);
                    assignedTo = picker._id;
                    const assignDate = addMinutes(createdDate, randomInt(10, 60));

                    if (listStatus === 'IN_PROGRESS' || listStatus === 'COMPLETED') {
                        startedAt = addMinutes(assignDate, randomInt(5, 30));
                    }

                    if (listStatus === 'COMPLETED') {
                        completedAt = addMinutes(startedAt || assignDate, randomInt(20, 90));

                        // Add verification randomly for completed
                        if (Math.random() > 0.2) {
                            const verifier = selectRandom(staffUsers);
                            verifiedBy = verifier._id;
                            verifiedAt = addMinutes(completedAt, randomInt(5, 15));
                        }
                    }
                }

                pickLists.push({
                    pickListNumber: generatePickListNumber(createdDate, warehouseId),
                    warehouseId: new mongoose.Types.ObjectId(warehouseId),
                    companyId: batchOrders[0]?.companyId,
                    orders: batchOrders.map(o => o._id),
                    items,
                    totalItems,
                    pickedItems,
                    orderCount: batchOrders.length,

                    pickingStrategy: 'BATCH', // Schema required
                    priority: 'MEDIUM', // Schema required

                    status: listStatus,
                    assignedTo,
                    assignedAt: assignedTo ? addMinutes(createdDate, 30) : undefined,
                    startedAt,
                    completedAt,
                    verifiedBy,
                    verifiedAt,

                    requiresVerification: true,
                    verificationStatus: verifiedAt ? 'PASSED' : (listStatus === 'COMPLETED' ? 'PENDING' : undefined),

                    createdAt: createdDate,
                    updatedAt: verifiedAt || completedAt || startedAt || createdDate,
                });

                totalItemsCount += items.length;
            }
        }

        // Insert pick lists
        if (pickLists.length > 0) {
            logger.info(`Inserting ${pickLists.length} pick lists...`);
            await PickList.insertMany(pickLists);
            logger.info('Pick lists inserted successfully');
        }

        const completedCount = pickLists.filter(p => p.status === 'COMPLETED').length;
        const inProgressCount = pickLists.filter(p => p.status === 'IN_PROGRESS').length;
        const pendingCount = pickLists.filter(p => p.status === 'PENDING').length;

        logger.complete('pick lists', pickLists.length, timer.elapsed());
        logger.table({
            'Total Pick Lists': pickLists.length,
            'Total Items': totalItemsCount,
            'Status: Completed': completedCount,
            'Status: In Progress': inProgressCount,
            'Status: Pending': pendingCount,
            'Avg Items per List': totalItemsCount > 0 ? Math.round(totalItemsCount / pickLists.length) : 0,
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
    return PickList.find({ status: { $in: ['PENDING', 'ASSIGNED'] }, isDeleted: false }).lean();
}
