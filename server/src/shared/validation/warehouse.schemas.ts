/**
 * Warehouse Validation Schemas
 * 
 * Centralized Zod schemas for warehouse workflow operations.
 * Used by controllers for validation and by services for type inference.
 */

import { z } from 'zod';

// =========================================
// Common Schemas
// =========================================

export const paginationQuerySchema = z.object({
    page: z.string().optional()
        .transform(val => parseInt(val || '1', 10))
        .refine(val => val >= 1 && val <= 10000, 'Page must be between 1 and 10000'),
    limit: z.string().optional()
        .transform(val => parseInt(val || '20', 10))
        .refine(val => val >= 1 && val <= 100, 'Limit must be between 1 and 100'),
});

// =========================================
// Picking Schemas
// =========================================

export const createPickListSchema = z.object({
    warehouseId: z.string().min(1).max(100),
    orderIds: z.array(z.string().min(1).max(100)).min(1).max(100), // Max 100 orders per pick list
    pickingStrategy: z.enum(['BATCH', 'WAVE', 'DISCRETE', 'ZONE']),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    assignTo: z.string().min(1).max(100).optional(),
    notes: z.string().max(1000).optional(), // Max 1000 chars for notes
    scheduledAt: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
});

export const assignPickListSchema = z.object({
    pickerId: z.string().min(1).max(100),
});

export const pickItemSchema = z.object({
    itemId: z.string().min(1).max(100),
    quantityPicked: z.number().min(0).max(100000), // Max 100k units per pick
    barcodeScanned: z.boolean(),
    scannedBarcode: z.string().max(200).optional(),
    notes: z.string().max(500).optional(),
    reason: z.string().max(500).optional(),
});

export const skipItemSchema = z.object({
    itemId: z.string().min(1).max(100),
    reason: z.string().min(1).max(500),
});

export const completePickListSchema = z.object({
    pickerNotes: z.string().max(1000).optional(),
});

export const cancelPickListSchema = z.object({
    reason: z.string().min(1).max(500),
});

export const verifyPickListSchema = z.object({
    passed: z.boolean(),
    notes: z.string().max(1000).optional(),
});

// =========================================
// Packing Schemas
// =========================================

export const createPackingStationSchema = z.object({
    warehouseId: z.string().min(1).max(100),
    stationCode: z.string().min(1).max(50),
    name: z.string().min(1).max(200),
    type: z.enum(['STANDARD', 'FRAGILE', 'OVERSIZED', 'EXPRESS', 'MULTI_ITEM']).optional(),
    zoneId: z.string().max(100).optional(),
    locationDescription: z.string().max(500).optional(),
    hasScale: z.boolean().optional(),
    hasScanner: z.boolean().optional(),
    hasPrinter: z.boolean().optional(),
    hasLabelPrinter: z.boolean().optional(),
    scaleMaxWeight: z.number().min(0).max(10000).optional(), // Max 10000 kg
    supportedBoxSizes: z.array(z.string().max(50)).max(50).optional(), // Max 50 box sizes
});

export const startPackingSessionSchema = z.object({
    pickListId: z.string().min(1).max(100),
    orderId: z.string().min(1).max(100),
    orderNumber: z.string().min(1).max(100),
    items: z.array(z.object({
        sku: z.string().min(1).max(200),
        productName: z.string().min(1).max(500),
        quantity: z.number().min(1).max(100000),
    })).min(1).max(1000), // Max 1000 items per session
});

export const createPackageSchema = z.object({
    weight: z.number().min(0).max(10000), // Max 10000 kg
    dimensions: z.object({
        length: z.number().min(0).max(10000), // Max 10000 cm
        width: z.number().min(0).max(10000),
        height: z.number().min(0).max(10000),
    }),
    items: z.array(z.object({
        sku: z.string().min(1).max(200),
        quantity: z.number().min(1).max(100000),
    })).min(1).max(1000), // Max 1000 items per package
    boxType: z.string().max(100).optional(),
    isFragile: z.boolean().optional(),
    requiresInsurance: z.boolean().optional(),
});

export const verifyWeightSchema = z.object({
    packageNumber: z.number().min(1).max(1000),
    actualWeight: z.number().min(0).max(10000),
    expectedWeight: z.number().min(0).max(10000),
    tolerance: z.number().min(0).max(100).optional(), // Max 100% tolerance
});

export const assignPackerSchema = z.object({
    packerId: z.string().min(1).max(100),
});

export const setStationOfflineSchema = z.object({
    reason: z.string().max(500).optional(),
});

export const packItemSchema = z.object({
    sku: z.string().min(1).max(200),
    quantity: z.number().min(1).max(100000),
    packageNumber: z.number().min(1).max(1000).optional(),
});

export const completePackingSessionSchema = z.object({
    notes: z.string().max(1000).optional(),
});

export const cancelPackingSessionSchema = z.object({
    reason: z.string().min(1).max(500),
});

// =========================================
// Inventory Schemas
// =========================================

export const createInventorySchema = z.object({
    warehouseId: z.string().min(1).max(100),
    sku: z.string().min(1).max(200),
    productId: z.string().max(100).optional(),
    productName: z.string().min(1).max(500),
    barcode: z.string().max(200).optional(),
    category: z.string().max(200).optional(),
    initialQuantity: z.number().min(0).max(10000000).optional(), // Max 10M units
    unitCost: z.number().min(0).max(1000000).optional(), // Max $1M per unit
    reorderPoint: z.number().min(0).max(10000000).optional(),
    reorderQuantity: z.number().min(0).max(10000000).optional(),
    safetyStock: z.number().min(0).max(10000000).optional(),
    maxStock: z.number().min(0).max(10000000).optional(),
}).refine(
    data => !data.maxStock || !data.reorderPoint || data.maxStock >= data.reorderPoint,
    { message: 'maxStock must be greater than or equal to reorderPoint', path: ['maxStock'] }
).refine(
    data => !data.reorderPoint || !data.safetyStock || data.reorderPoint >= data.safetyStock,
    { message: 'reorderPoint must be greater than or equal to safetyStock', path: ['reorderPoint'] }
);

export const receiveStockSchema = z.object({
    warehouseId: z.string().min(1).max(100),
    sku: z.string().min(1).max(200),
    quantity: z.number().min(1).max(10000000), // Max 10M units
    locationId: z.string().min(1).max(100),
    purchaseOrderId: z.string().max(100).optional(),
    purchaseOrderNumber: z.string().max(100).optional(),
    unitCost: z.number().min(0).max(1000000).optional(),
    batchNumber: z.string().max(100).optional(),
    lotNumber: z.string().max(100).optional(),
    expiryDate: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
    notes: z.string().max(1000).optional(),
});

export const adjustStockSchema = z.object({
    quantity: z.number().min(-10000000).max(10000000), // Can be positive or negative
    reason: z.string().min(1).max(500),
    notes: z.string().max(1000).optional(),
    barcodeScanned: z.boolean().optional(),
});

export const reserveStockSchema = z.object({
    quantity: z.number().min(1).max(10000000),
    orderId: z.string().min(1).max(100),
    orderNumber: z.string().min(1).max(100),
});

export const releaseReservationSchema = z.object({
    quantity: z.number().min(1).max(10000000),
    orderId: z.string().min(1).max(100),
    reason: z.string().min(1).max(500),
});

export const transferStockSchema = z.object({
    fromLocationId: z.string().min(1).max(100),
    toLocationId: z.string().min(1).max(100),
    quantity: z.number().min(1).max(10000000),
    reason: z.string().min(1).max(500),
}).refine(
    data => data.fromLocationId !== data.toLocationId,
    { message: 'Cannot transfer to the same location', path: ['toLocationId'] }
);

export const markDamagedSchema = z.object({
    locationId: z.string().min(1).max(100),
    quantity: z.number().min(1).max(10000000),
    reason: z.string().min(1).max(500),
    notes: z.string().max(1000).optional(),
});

export const cycleCountSchema = z.object({
    locationId: z.string().min(1).max(100),
    countedQuantity: z.number().min(0).max(10000000),
    systemQuantity: z.number().min(0).max(10000000),
    notes: z.string().max(1000).optional(),
});

export const checkAvailabilitySchema = z.object({
    warehouseId: z.string().min(1).max(100),
    items: z.array(z.object({
        sku: z.string().min(1).max(200),
        quantity: z.number().min(1).max(10000000),
    })).min(1).max(1000), // Max 1000 items to check
});

// Inventory query schema with security constraints
export const inventoryQuerySchema = z.object({
    warehouseId: z.string().max(100).optional(),
    sku: z.string().max(200).optional(),
    status: z.enum(['ACTIVE', 'DISCONTINUED', 'OUT_OF_STOCK']).optional(),
    category: z.string().max(200).optional(),
    lowStockOnly: z.boolean().optional(),
    page: z.number().min(1).max(10000).optional(),
    limit: z.number().min(1).max(100).optional(),
});
