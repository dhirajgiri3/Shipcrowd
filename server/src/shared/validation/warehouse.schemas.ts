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
    page: z.string().optional().transform(val => parseInt(val || '1', 10)),
    limit: z.string().optional().transform(val => parseInt(val || '20', 10)),
});

// =========================================
// Picking Schemas
// =========================================

export const createPickListSchema = z.object({
    warehouseId: z.string(),
    orderIds: z.array(z.string()).min(1),
    pickingStrategy: z.enum(['BATCH', 'WAVE', 'DISCRETE', 'ZONE']),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    assignTo: z.string().optional(),
    notes: z.string().optional(),
    scheduledAt: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
});

export const assignPickListSchema = z.object({
    pickerId: z.string(),
});

export const pickItemSchema = z.object({
    itemId: z.string(),
    quantityPicked: z.number().min(0),
    barcodeScanned: z.boolean(),
    scannedBarcode: z.string().optional(),
    notes: z.string().optional(),
    reason: z.string().optional(),
});

export const skipItemSchema = z.object({
    itemId: z.string(),
    reason: z.string(),
});

export const completePickListSchema = z.object({
    pickerNotes: z.string().optional(),
});

export const cancelPickListSchema = z.object({
    reason: z.string(),
});

export const verifyPickListSchema = z.object({
    passed: z.boolean(),
    notes: z.string().optional(),
});

// =========================================
// Packing Schemas
// =========================================

export const createPackingStationSchema = z.object({
    warehouseId: z.string(),
    stationCode: z.string(),
    name: z.string(),
    type: z.enum(['STANDARD', 'FRAGILE', 'OVERSIZED', 'EXPRESS', 'MULTI_ITEM']).optional(),
    zoneId: z.string().optional(),
    locationDescription: z.string().optional(),
    hasScale: z.boolean().optional(),
    hasScanner: z.boolean().optional(),
    hasPrinter: z.boolean().optional(),
    hasLabelPrinter: z.boolean().optional(),
    scaleMaxWeight: z.number().optional(),
    supportedBoxSizes: z.array(z.string()).optional(),
});

export const startPackingSessionSchema = z.object({
    pickListId: z.string(),
    orderId: z.string(),
    orderNumber: z.string(),
    items: z.array(z.object({
        sku: z.string(),
        productName: z.string(),
        quantity: z.number(),
    })),
});

export const createPackageSchema = z.object({
    weight: z.number().min(0),
    dimensions: z.object({
        length: z.number().min(0),
        width: z.number().min(0),
        height: z.number().min(0),
    }),
    items: z.array(z.object({
        sku: z.string(),
        quantity: z.number().min(1),
    })),
    boxType: z.string().optional(),
    isFragile: z.boolean().optional(),
    requiresInsurance: z.boolean().optional(),
});

export const verifyWeightSchema = z.object({
    packageNumber: z.number(),
    actualWeight: z.number(),
    expectedWeight: z.number(),
    tolerance: z.number().optional(),
});

export const assignPackerSchema = z.object({
    packerId: z.string(),
});

export const setStationOfflineSchema = z.object({
    reason: z.string().optional(),
});

export const packItemSchema = z.object({
    sku: z.string(),
    quantity: z.number(),
    packageNumber: z.number().optional(),
});

export const completePackingSessionSchema = z.object({
    notes: z.string().optional(),
});

export const cancelPackingSessionSchema = z.object({
    reason: z.string(),
});

// =========================================
// Inventory Schemas
// =========================================

export const createInventorySchema = z.object({
    warehouseId: z.string(),
    sku: z.string(),
    productId: z.string().optional(),
    productName: z.string(),
    barcode: z.string().optional(),
    category: z.string().optional(),
    initialQuantity: z.number().min(0).optional(),
    unitCost: z.number().min(0).optional(),
    reorderPoint: z.number().min(0).optional(),
    reorderQuantity: z.number().min(0).optional(),
    safetyStock: z.number().min(0).optional(),
    maxStock: z.number().min(0).optional(),
});

export const receiveStockSchema = z.object({
    warehouseId: z.string(),
    sku: z.string(),
    quantity: z.number().min(1),
    locationId: z.string(),
    purchaseOrderId: z.string().optional(),
    purchaseOrderNumber: z.string().optional(),
    unitCost: z.number().optional(),
    batchNumber: z.string().optional(),
    lotNumber: z.string().optional(),
    expiryDate: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
    notes: z.string().optional(),
});

export const adjustStockSchema = z.object({
    quantity: z.number(), // Can be positive or negative
    reason: z.string(),
    notes: z.string().optional(),
    barcodeScanned: z.boolean().optional(),
});

export const reserveStockSchema = z.object({
    quantity: z.number().min(1),
    orderId: z.string(),
    orderNumber: z.string(),
});

export const releaseReservationSchema = z.object({
    quantity: z.number().min(1),
    orderId: z.string(),
    reason: z.string(),
});

export const transferStockSchema = z.object({
    fromLocationId: z.string(),
    toLocationId: z.string(),
    quantity: z.number().min(1),
    reason: z.string(),
});

export const markDamagedSchema = z.object({
    locationId: z.string(),
    quantity: z.number().min(1),
    reason: z.string(),
    notes: z.string().optional(),
});

export const cycleCountSchema = z.object({
    locationId: z.string(),
    countedQuantity: z.number().min(0),
    systemQuantity: z.number().min(0),
    notes: z.string().optional(),
});

export const checkAvailabilitySchema = z.object({
    warehouseId: z.string(),
    items: z.array(z.object({
        sku: z.string(),
        quantity: z.number(),
    })),
});
