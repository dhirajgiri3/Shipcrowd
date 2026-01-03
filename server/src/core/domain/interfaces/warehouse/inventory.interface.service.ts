/**
 * IInventoryService Interface
 *
 * Defines the contract for inventory management operations.
 * Handles stock tracking, reservations, movements, and alerts.
 */

import { IInventory } from '@/infrastructure/database/mongoose/models';
import { IStockMovement } from '@/infrastructure/database/mongoose/models';

// =========================================
// DTOs for Inventory Service
// =========================================

export interface ICreateInventoryDTO {
    warehouseId: string;
    companyId: string;
    sku: string;
    productId?: string;
    productName: string;
    barcode?: string;
    category?: string;
    initialQuantity?: number;
    unitCost?: number;
    reorderPoint?: number;
    reorderQuantity?: number;
    safetyStock?: number;
    maxStock?: number;
}

export interface IUpdateInventoryDTO {
    inventoryId: string;
    productName?: string;
    barcode?: string;
    category?: string;
    unitCost?: number;
    reorderPoint?: number;
    reorderQuantity?: number;
    safetyStock?: number;
    maxStock?: number;
    isActive?: boolean;
}

export interface IAdjustStockDTO {
    inventoryId: string;
    quantity: number; // Positive or negative adjustment
    reason: string;
    notes?: string;
    performedBy: string;
    barcodeScanned?: boolean;
}

export interface IReceiveStockDTO {
    warehouseId: string;
    companyId: string;
    sku: string;
    quantity: number;
    locationId: string;
    purchaseOrderId?: string;
    purchaseOrderNumber?: string;
    unitCost?: number;
    batchNumber?: string;
    lotNumber?: string;
    expiryDate?: Date;
    performedBy: string;
    notes?: string;
}

export interface IReserveStockDTO {
    inventoryId: string;
    quantity: number;
    orderId: string;
    orderNumber: string;
    reservedBy: string;
}

export interface IReleaseReservationDTO {
    inventoryId: string;
    quantity: number;
    orderId: string;
    reason: string;
    releasedBy: string;
}

export interface IPickStockDTO {
    inventoryId: string;
    locationId: string;
    quantity: number;
    orderId: string;
    orderNumber: string;
    pickListId: string;
    pickListNumber: string;
    performedBy: string;
    barcodeScanned?: boolean;
}

export interface ITransferStockDTO {
    inventoryId: string;
    fromLocationId: string;
    toLocationId: string;
    quantity: number;
    reason: string;
    performedBy: string;
}

export interface IMarkDamagedDTO {
    inventoryId: string;
    locationId: string;
    quantity: number;
    reason: string;
    performedBy: string;
    notes?: string;
}

export interface IDisposeStockDTO {
    inventoryId: string;
    locationId: string;
    quantity: number;
    reason: string;
    approvedBy?: string;
    performedBy: string;
    notes?: string;
}

export interface ICycleCountDTO {
    inventoryId: string;
    locationId: string;
    countedQuantity: number;
    systemQuantity: number;
    performedBy: string;
    notes?: string;
}

// =========================================
// Query Options
// =========================================

export interface IInventoryQueryOptions {
    warehouseId?: string;
    companyId?: string;
    sku?: string;
    status?: string | string[];
    category?: string;
    lowStockOnly?: boolean;
    outOfStockOnly?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface IStockMovementQueryOptions {
    warehouseId?: string;
    companyId?: string;
    inventoryId?: string;
    sku?: string;
    type?: string | string[];
    startDate?: Date;
    endDate?: Date;
    performedBy?: string;
    page?: number;
    limit?: number;
}

// =========================================
// Stock Alerts
// =========================================

export interface ILowStockAlert {
    inventoryId: string;
    sku: string;
    productName: string;
    warehouseId: string;
    warehouseName: string;
    currentStock: number;
    reorderPoint: number;
    suggestedOrderQuantity: number;
    daysOfStockRemaining?: number;
}

export interface IStockAlert {
    type: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'EXPIRING' | 'OVERSTOCK';
    inventoryId: string;
    sku: string;
    productName: string;
    message: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    createdAt: Date;
}

// =========================================
// Inventory Statistics
// =========================================

export interface IInventoryStats {
    totalSKUs: number;
    totalStock: number;
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    averageTurnoverRate: number;
}

export interface IMovementSummary {
    received: number;
    picked: number;
    transferred: number;
    damaged: number;
    disposed: number;
    adjusted: number;
    period: {
        startDate: Date;
        endDate: Date;
    };
}

// =========================================
// Paginated Result
// =========================================

export interface IPaginatedResult<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

// =========================================
// Inventory Service Interface
// =========================================

export interface IInventoryService {
    // Inventory CRUD
    createInventory(data: ICreateInventoryDTO): Promise<IInventory>;
    updateInventory(data: IUpdateInventoryDTO): Promise<IInventory>;
    getInventoryById(id: string): Promise<IInventory | null>;
    getInventoryBySKU(warehouseId: string, sku: string): Promise<IInventory | null>;
    getInventoryByBarcode(warehouseId: string, barcode: string): Promise<IInventory | null>;
    getInventoryList(options: IInventoryQueryOptions): Promise<IPaginatedResult<IInventory>>;
    discontinueInventory(inventoryId: string): Promise<IInventory>;

    // Stock operations
    receiveStock(data: IReceiveStockDTO): Promise<{ inventory: IInventory; movement: IStockMovement }>;
    adjustStock(data: IAdjustStockDTO): Promise<{ inventory: IInventory; movement: IStockMovement }>;
    reserveStock(data: IReserveStockDTO): Promise<IInventory>;
    releaseReservation(data: IReleaseReservationDTO): Promise<IInventory>;
    pickStock(data: IPickStockDTO): Promise<{ inventory: IInventory; movement: IStockMovement }>;
    transferStock(data: ITransferStockDTO): Promise<{ inventory: IInventory; movement: IStockMovement }>;
    markDamaged(data: IMarkDamagedDTO): Promise<{ inventory: IInventory; movement: IStockMovement }>;
    disposeStock(data: IDisposeStockDTO): Promise<{ inventory: IInventory; movement: IStockMovement }>;
    cycleCount(data: ICycleCountDTO): Promise<{ inventory: IInventory; movement?: IStockMovement }>;

    // Stock queries
    getAvailableStock(warehouseId: string, sku: string): Promise<number>;
    checkStockAvailability(warehouseId: string, items: Array<{ sku: string; quantity: number }>): Promise<{
        available: boolean;
        items: Array<{
            sku: string;
            requested: number;
            available: number;
            sufficient: boolean;
        }>;
    }>;

    // Location management
    addLocation(inventoryId: string, locationId: string, quantity: number): Promise<IInventory>;
    removeLocation(inventoryId: string, locationId: string): Promise<IInventory>;
    getStockByLocation(locationId: string): Promise<IInventory[]>;

    // Alerts
    getLowStockAlerts(companyId: string): Promise<ILowStockAlert[]>;
    getStockAlerts(warehouseId: string): Promise<IStockAlert[]>;
    dismissAlert(alertId: string): Promise<void>;

    // Stock movements
    getMovements(options: IStockMovementQueryOptions): Promise<IPaginatedResult<IStockMovement>>;
    getMovementsByInventory(inventoryId: string, limit?: number): Promise<IStockMovement[]>;

    // Reporting
    getInventoryStats(warehouseId: string): Promise<IInventoryStats>;
    getMovementSummary(warehouseId: string, startDate: Date, endDate: Date): Promise<IMovementSummary>;
    getInventoryValuation(companyId: string): Promise<{ totalValue: number; byWarehouse: Array<{ warehouseId: string; value: number }> }>;

    // Replenishment
    getReplenishmentSuggestions(warehouseId: string): Promise<ILowStockAlert[]>;
    createReplenishmentOrder(inventoryId: string, quantity: number, createdBy: string): Promise<void>;

    // Utilities
    generateMovementNumber(): Promise<string>;
    recalculateStock(inventoryId: string): Promise<IInventory>;
}
