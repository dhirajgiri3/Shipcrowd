/**
 * Inventory Factory
 * Creates test data for Inventory and StockMovement models
 */
import mongoose from 'mongoose';
import {
randomInt,
randomNumeric,
randomProductName,
randomString,
} from '../helpers/randomData';

// Import models lazily
const getInventoryModel = () => mongoose.model('Inventory');
const getStockMovementModel = () => mongoose.model('StockMovement');

export interface CreateInventoryOptions {
    warehouseId?: string;
    companyId?: string;
    sku?: string;
    status?: 'ACTIVE' | 'DISCONTINUED' | 'LOW_STOCK' | 'OUT_OF_STOCK';
    onHand?: number;
    initialQuantity?: number;
    reserved?: number;
}

/**
 * Create a test inventory item
 */
export const createTestInventory = async (
    overrides: CreateInventoryOptions = {}
): Promise<any> => {
    const Inventory = getInventoryModel();

    const quantity = overrides.onHand ?? randomInt(10, 100);
    const sku = overrides.sku || `SKU-${randomString(5).toUpperCase()}`;

    const inventoryData = {
        warehouseId: overrides.warehouseId || new mongoose.Types.ObjectId(),
        companyId: overrides.companyId || new mongoose.Types.ObjectId(),
        sku,
        productId: new mongoose.Types.ObjectId(),
        productName: randomProductName(),
        barcode: sku,
        category: 'General',
        onHand: quantity,
        reserved: 0,
        damaged: 0,
        reorderPoint: 10,
        reorderQuantity: 50,
        safetyStock: 5,
        maxStock: 500,
        status: overrides.status || (quantity > 0 ? 'ACTIVE' : 'OUT_OF_STOCK'),
        locations: [
            {
                locationId: new mongoose.Types.ObjectId(),
                locationCode: `A-${randomNumeric(2)}-${randomNumeric(2)}`,
                quantity: quantity,
                isPickFace: true
            }
        ],
        ...overrides
    };

    return Inventory.create(inventoryData);
};

/**
 * Create a test stock movement audit log
 */
export const createTestStockMovement = async (
    inventoryId: string,
    overrides: any = {}
): Promise<any> => {
    const StockMovement = getStockMovementModel();

    return StockMovement.create({
        warehouseId: new mongoose.Types.ObjectId(),
        companyId: new mongoose.Types.ObjectId(),
        movementNumber: `SM-${randomNumeric(8)}`,
        type: overrides.type || 'ADJUSTMENT',
        direction: overrides.direction || 'IN',
        sku: overrides.sku || 'TEST-SKU',
        productName: 'Test Product',
        inventoryId: new mongoose.Types.ObjectId(inventoryId),
        quantity: 10,
        previousQuantity: 0,
        newQuantity: 10,
        reason: 'Test movement',
        performedBy: new mongoose.Types.ObjectId(),
        status: 'COMPLETED',
        ...overrides
    });
};
