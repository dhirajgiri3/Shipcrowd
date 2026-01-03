/**
 * IPackingService Interface
 *
 * Defines the contract for packing station operations.
 * Handles packing station management, packing sessions, and package creation.
 */

import { IPackingStation, IPackage, IPackingSession } from '@/infrastructure/database/mongoose/models';

// =========================================
// DTOs for Packing Service
// =========================================

export interface ICreatePackingStationDTO {
    warehouseId: string;
    companyId: string;
    stationCode: string;
    name: string;
    type?: 'STANDARD' | 'FRAGILE' | 'OVERSIZED' | 'EXPRESS' | 'MULTI_ITEM';
    zoneId?: string;
    locationDescription?: string;
    hasScale?: boolean;
    hasScanner?: boolean;
    hasPrinter?: boolean;
    hasLabelPrinter?: boolean;
    scaleMaxWeight?: number;
    supportedBoxSizes?: string[];
}

export interface IUpdatePackingStationDTO {
    stationId: string;
    name?: string;
    type?: string;
    locationDescription?: string;
    hasScale?: boolean;
    hasScanner?: boolean;
    hasPrinter?: boolean;
    hasLabelPrinter?: boolean;
    scaleMaxWeight?: number;
    supportedBoxSizes?: string[];
    isActive?: boolean;
}

export interface IAssignPackerDTO {
    stationId: string;
    packerId: string;
}

export interface IStartPackingSessionDTO {
    stationId: string;
    packerId: string;
    pickListId: string;
    orderId: string;
    orderNumber: string;
    items: Array<{
        sku: string;
        productName: string;
        quantity: number;
    }>;
}

export interface IPackItemDTO {
    stationId: string;
    sku: string;
    quantity: number;
    packageNumber?: number; // If adding to existing package
}

export interface ICreatePackageDTO {
    stationId: string;
    weight: number;
    dimensions: {
        length: number;
        width: number;
        height: number;
    };
    items: Array<{
        sku: string;
        quantity: number;
    }>;
    boxType?: string;
    isFragile?: boolean;
    requiresInsurance?: boolean;
}

export interface IVerifyWeightDTO {
    stationId: string;
    packageNumber: number;
    actualWeight: number;
    expectedWeight: number;
    tolerance?: number; // Percentage tolerance
}

export interface ICompletePackingSessionDTO {
    stationId: string;
    packerId: string;
    notes?: string;
}

// =========================================
// Query Options
// =========================================

export interface IPackingStationQueryOptions {
    warehouseId?: string;
    companyId?: string;
    status?: string | string[];
    type?: string | string[];
    assignedTo?: string;
    page?: number;
    limit?: number;
}

// =========================================
// Station Statistics
// =========================================

export interface IPackerStats {
    packerId: string;
    packerName: string;
    totalOrdersPacked: number;
    totalPackagesCreated: number;
    averagePackTime: number; // minutes
    accuracyRate: number; // percentage
    period: {
        startDate: Date;
        endDate: Date;
    };
}

export interface IPackingStationStats {
    stationId: string;
    stationCode: string;
    ordersPackedToday: number;
    ordersPackedWeek: number;
    ordersPackedMonth: number;
    averagePackTime: number;
    utilizationPercent: number;
}

// =========================================
// Weight Verification Result
// =========================================

export interface IWeightVerificationResult {
    passed: boolean;
    actualWeight: number;
    expectedWeight: number;
    variance: number;
    variancePercent: number;
    withinTolerance: boolean;
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
// Packing Service Interface
// =========================================

export interface IPackingService {
    // Station management
    createStation(data: ICreatePackingStationDTO): Promise<IPackingStation>;
    updateStation(data: IUpdatePackingStationDTO): Promise<IPackingStation>;
    getStationById(id: string): Promise<IPackingStation | null>;
    getStations(options: IPackingStationQueryOptions): Promise<IPaginatedResult<IPackingStation>>;
    getAvailableStations(warehouseId: string): Promise<IPackingStation[]>;
    setStationOffline(stationId: string, reason?: string): Promise<IPackingStation>;
    setStationOnline(stationId: string): Promise<IPackingStation>;

    // Packer assignment
    assignPacker(data: IAssignPackerDTO): Promise<IPackingStation>;
    unassignPacker(stationId: string): Promise<IPackingStation>;

    // Packing session
    startPackingSession(data: IStartPackingSessionDTO): Promise<IPackingStation>;
    packItem(data: IPackItemDTO): Promise<IPackingStation>;
    createPackage(data: ICreatePackageDTO): Promise<IPackage>;
    updatePackage(stationId: string, packageNumber: number, updates: Partial<IPackage>): Promise<IPackage>;
    removePackage(stationId: string, packageNumber: number): Promise<IPackingStation>;
    completePackingSession(data: ICompletePackingSessionDTO): Promise<IPackingStation>;
    cancelPackingSession(stationId: string, reason: string): Promise<IPackingStation>;

    // Weight verification
    verifyWeight(data: IVerifyWeightDTO): Promise<IWeightVerificationResult>;

    // Label generation (integrates with PDF service)
    generatePackageLabel(stationId: string, packageNumber: number): Promise<string>; // Returns label URL

    // Statistics
    getStationStats(stationId: string, startDate: Date, endDate: Date): Promise<IPackingStationStats>;
    getPackerStats(packerId: string, startDate: Date, endDate: Date): Promise<IPackerStats>;

    // Daily operations
    resetDailyCounters(warehouseId: string): Promise<void>;
}
