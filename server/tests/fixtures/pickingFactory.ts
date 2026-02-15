/**
 * Picking Factory
 * Creates test data for PickList and Picking workflows
 */
import mongoose from 'mongoose';
import {
randomNumeric,
randomString,
} from '../helpers/randomData';

// Import models lazily
const getPickListModel = () => mongoose.model('PickList');
const getOrderModel = () => mongoose.model('Order');
void getOrderModel;

export interface CreatePickListOptions {
    warehouseId?: string;
    companyId?: string;
    status?: 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    pickingStrategy?: 'BATCH' | 'WAVE' | 'DISCRETE' | 'ZONE';
    assignedTo?: string;
    itemsCount?: number;
}

/**
 * Create a test pick list
 */
export const createTestPickList = async (
    overrides: CreatePickListOptions = {}
): Promise<any> => {
    const PickList = getPickListModel();

    // Create mock items if not provided
    const items = [];
    const count = overrides.itemsCount || 3;

    for (let i = 0; i < count; i++) {
        items.push({
            orderId: new mongoose.Types.ObjectId(),
            orderItemId: new mongoose.Types.ObjectId(),
            orderNumber: `ORD-${randomNumeric(6)}`,
            sku: `SKU-${randomString(5).toUpperCase()}`,
            productName: `Test Product ${i + 1}`,
            locationId: new mongoose.Types.ObjectId(),
            locationCode: `A-${randomNumeric(2)}-${randomNumeric(2)}`,
            zone: 'A',
            aisle: `A-${randomNumeric(2)}`,
            quantityRequired: 2,
            quantityPicked: overrides.status === 'COMPLETED' ? 2 : 0,
            quantityShort: 0,
            status: overrides.status === 'COMPLETED' ? 'PICKED' : 'PENDING',
            sequence: i + 1
        });
    }

    const pickListData = {
        warehouseId: overrides.warehouseId || new mongoose.Types.ObjectId(),
        companyId: overrides.companyId || new mongoose.Types.ObjectId(),
        pickListNumber: `PL-2025-${randomNumeric(5)}`,
        orders: [new mongoose.Types.ObjectId()],
        items,
        pickingStrategy: overrides.pickingStrategy || 'BATCH',
        status: overrides.status || 'PENDING',
        priority: 'MEDIUM',
        assignedTo: overrides.assignedTo ? new mongoose.Types.ObjectId(overrides.assignedTo) : undefined,
        assignedAt: overrides.assignedTo ? new Date() : undefined,
        startedAt: overrides.status === 'IN_PROGRESS' || overrides.status === 'COMPLETED' ? new Date() : undefined,
        completedAt: overrides.status === 'COMPLETED' ? new Date() : undefined,
        totalItems: items.length,
        pickedItems: overrides.status === 'COMPLETED' ? items.length : 0,
        ...overrides
    };

    return PickList.create(pickListData);
};

/**
 * Create multiple pick lists
 */
export const createTestPickLists = async (
    count: number,
    overrides: CreatePickListOptions = {}
): Promise<any[]> => {
    const pickLists = [];
    for (let i = 0; i < count; i++) {
        pickLists.push(await createTestPickList(overrides));
    }
    return pickLists;
};
