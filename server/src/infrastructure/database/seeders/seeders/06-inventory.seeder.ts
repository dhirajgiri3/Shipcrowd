/**
 * Inventory Seeder
 * 
 * Generates inventory records (10-15 SKUs per warehouse).
 */

import mongoose from 'mongoose';
import Inventory from '../../mongoose/models/logistics/inventory/store/inventory.model';
import Warehouse from '../../mongoose/models/logistics/warehouse/structure/warehouse.model';
import Company from '../../mongoose/models/organization/core/company.model';
import { SEED_CONFIG, BusinessType } from '../config';
import { randomInt, randomFloat, selectRandom, selectMultipleRandom } from '../utils/random.utils';
import { logger, createTimer } from '../utils/logger.utils';
import { subDays, randomDateBetween } from '../utils/date.utils';
import { generateLocationCode, generateBarcode } from '../utils/address.utils';
import { getProductsForBusinessType, ProductData } from '../data/product-catalog';

/**
 * Determine business type from company/warehouse name
 */
function getBusinessType(name: string): BusinessType {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('wholesale') || lowerName.includes('trader') || lowerName.includes('b2b') ||
        lowerName.includes('industrial') || lowerName.includes('bulk')) {
        return 'b2b';
    }
    if (lowerName.includes('tech') || lowerName.includes('electronic') || lowerName.includes('digital') ||
        lowerName.includes('mobile') || lowerName.includes('gadget')) {
        return 'electronics';
    }
    return 'fashion';
}

/**
 * Calculate inventory status based on quantities
 */
function calculateInventoryStatus(
    available: number,
    reorderPoint: number
): 'active' | 'low_stock' | 'out_of_stock' | 'discontinued' {
    if (available <= 0) return 'out_of_stock';
    if (available <= reorderPoint) return 'low_stock';
    return 'active';
}

/**
 * Generate inventory record for a product in a warehouse
 */
function generateInventoryRecord(
    warehouse: any,
    company: any,
    product: ProductData,
    index: number
): any {
    const onHand = randomInt(0, 200);
    const reserved = Math.min(randomInt(0, 30), onHand);
    const damaged = Math.min(randomInt(0, 5), onHand - reserved);
    const inTransfer = Math.min(randomInt(0, 10), onHand - reserved - damaged);
    const available = onHand - reserved - damaged - inTransfer;

    const reorderPoint = randomInt(10, 50);
    const reorderQuantity = randomInt(100, 500);

    const skuSuffix = `${index.toString().padStart(2, '0')}`;
    const warehouseSku = `${product.sku}-${warehouse._id.toString().slice(-4).toUpperCase()}-${skuSuffix}`;

    return {
        warehouseId: warehouse._id,
        companyId: company._id,
        sku: warehouseSku,
        productName: product.name,
        barcode: generateBarcode(product.sku),
        category: product.category,
        onHand,
        available: Math.max(0, available),
        reserved,
        damaged,
        inTransfer,
        // Allocation not included as it's a separate subdoc
        reorderPoint,
        reorderQuantity,
        replenishmentStatus: available <= reorderPoint ? 'reorder_needed' : 'sufficient',
        status: calculateInventoryStatus(available, reorderPoint),
        unitCost: Math.round(product.price * randomFloat(0.4, 0.7, 2)),
        totalValue: Math.round(onHand * product.price * randomFloat(0.4, 0.7, 2)),
        currency: 'INR',
        lastReceivedDate: randomDateBetween(subDays(new Date(), 90), subDays(new Date(), 7)),
        lastPickedDate: onHand > 0 ? randomDateBetween(subDays(new Date(), 30), new Date()) : undefined,
        lastCountedDate: randomDateBetween(subDays(new Date(), 60), subDays(new Date(), 3)),
        lastMovementDate: randomDateBetween(subDays(new Date(), 14), new Date()),
        daysOfStock: available > 0 ? randomInt(10, 90) : 0,
        turnoverRate: randomFloat(0.5, 3.0, 2),
    };
}

/**
 * Main seeder function
 */
export async function seedInventory(): Promise<void> {
    const timer = createTimer();
    logger.step(6, 'Seeding Inventory');

    try {
        // Get warehouses with their companies
        const warehouses = await Warehouse.find({ isActive: true, isDeleted: false }).lean();
        const companies = await Company.find({ status: 'approved' }).lean();

        if (warehouses.length === 0) {
            logger.warn('No warehouses found. Skipping inventory seeder.');
            return;
        }

        // Create company lookup
        const companyMap = new Map<string, any>();
        for (const company of companies) {
            companyMap.set(company._id.toString(), company);
        }

        const inventoryRecords: any[] = [];
        let lowStockCount = 0;
        let outOfStockCount = 0;

        for (let i = 0; i < warehouses.length; i++) {
            const warehouse = warehouses[i];
            const company = companyMap.get(warehouse.companyId.toString());

            if (!company) continue;

            const businessType = getBusinessType(company.name || warehouse.name);
            const products = getProductsForBusinessType(businessType);

            // Select 10-15 random products
            const skuCount = randomInt(
                SEED_CONFIG.volume.skusPerWarehouse.min,
                SEED_CONFIG.volume.skusPerWarehouse.max
            );
            const selectedProducts = selectMultipleRandom(products, Math.min(skuCount, products.length));

            for (let j = 0; j < selectedProducts.length; j++) {
                const product = selectedProducts[j];
                const record = generateInventoryRecord(warehouse, company, product, j);
                inventoryRecords.push(record);

                if (record.status === 'low_stock') lowStockCount++;
                if (record.status === 'out_of_stock') outOfStockCount++;
            }

            if ((i + 1) % 50 === 0 || i === warehouses.length - 1) {
                logger.progress(i + 1, warehouses.length, 'Warehouses');
            }
        }

        // Insert in batches
        const batchSize = 1000;
        for (let i = 0; i < inventoryRecords.length; i += batchSize) {
            const batch = inventoryRecords.slice(i, i + batchSize);
            await Inventory.insertMany(batch);
        }

        const totalValue = inventoryRecords.reduce((sum, r) => sum + (r.totalValue || 0), 0);
        const totalUnits = inventoryRecords.reduce((sum, r) => sum + (r.onHand || 0), 0);

        logger.complete('inventory records', inventoryRecords.length, timer.elapsed());
        logger.table({
            'Total Records': inventoryRecords.length,
            'Total SKUs': inventoryRecords.length,
            'Total Units': totalUnits.toLocaleString(),
            'Total Value': `₹${(totalValue / 100000).toFixed(2)} Lac`,
            'Low Stock SKUs': lowStockCount,
            'Out of Stock SKUs': outOfStockCount,
        });

    } catch (error) {
        logger.error('Failed to seed inventory:', error);
        throw error;
    }
}
