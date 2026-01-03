/**
 * IPickingService Interface
 *
 * Defines the contract for picking service operations.
 * Handles pick list creation, assignment, picking operations, and completion.
 */

import { IPickList, IPickListItem } from '@/infrastructure/database/mongoose/models';

// =========================================
// DTOs for Picking Service
// =========================================

export type PickingStrategy = 'BATCH' | 'WAVE' | 'DISCRETE' | 'ZONE';
export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface ICreatePickListDTO {
    warehouseId: string;
    companyId: string;
    orderIds: string[];
    pickingStrategy: PickingStrategy;
    priority?: PriorityLevel;
    assignTo?: string; // User ID
    notes?: string;
    scheduledAt?: Date;
}

export interface IAssignPickListDTO {
    pickListId: string;
    pickerId: string;
    assignedBy: string;
}

export interface IStartPickingDTO {
    pickListId: string;
    pickerId: string;
}

export interface IPickItemDTO {
    pickListId: string;
    itemId: string;
    quantityPicked: number;
    barcodeScanned: boolean;
    scannedBarcode?: string;
    notes?: string;
    reason?: string; // For short picks
}

export interface ICompletePickListDTO {
    pickListId: string;
    pickerId: string;
    pickerNotes?: string;
}

export interface IVerifyPickListDTO {
    pickListId: string;
    verifierId: string;
    passed: boolean;
    notes?: string;
}

export interface ICancelPickListDTO {
    pickListId: string;
    cancelledBy: string;
    reason: string;
}

// =========================================
// Query Options
// =========================================

export interface IPickListQueryOptions {
    warehouseId?: string;
    companyId?: string;
    status?: string | string[];
    assignedTo?: string;
    priority?: string | string[];
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

// =========================================
// Picker Statistics
// =========================================

export interface IPickerStats {
    pickerId: string;
    pickerName: string;
    totalPickLists: number;
    completedPickLists: number;
    itemsPicked: number;
    averagePickTime: number; // minutes
    accuracy: number; // percentage
    productivityScore: number;
    period: {
        startDate: Date;
        endDate: Date;
    };
}

export interface IPickListStats {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    averageCompletionTime: number;
    averageItemsPerList: number;
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
// Picking Service Interface
// =========================================

export interface IPickingService {
    // Pick list management
    createPickList(data: ICreatePickListDTO): Promise<IPickList>;
    getPickListById(id: string): Promise<IPickList | null>;
    getPickLists(options: IPickListQueryOptions): Promise<IPaginatedResult<IPickList>>;
    getPickListsByPicker(pickerId: string, status?: string): Promise<IPickList[]>;
    assignPickList(data: IAssignPickListDTO): Promise<IPickList>;
    unassignPickList(pickListId: string): Promise<IPickList>;

    // Picking operations
    startPicking(data: IStartPickingDTO): Promise<IPickList>;
    pickItem(data: IPickItemDTO): Promise<IPickList>;
    skipItem(pickListId: string, itemId: string, reason: string): Promise<IPickList>;
    completePickList(data: ICompletePickListDTO): Promise<IPickList>;
    cancelPickList(data: ICancelPickListDTO): Promise<IPickList>;

    // Verification
    verifyPickList(data: IVerifyPickListDTO): Promise<IPickList>;

    // Pick list optimization
    optimizePickPath(pickListId: string): Promise<IPickListItem[]>;
    suggestNextItem(pickListId: string): Promise<IPickListItem | null>;

    // Reporting
    getPickerStats(pickerId: string, startDate: Date, endDate: Date): Promise<IPickerStats>;
    getPickListStats(warehouseId: string, startDate: Date, endDate: Date): Promise<IPickListStats>;

    // Utilities
    generatePickListNumber(): Promise<string>;
    estimatePickTime(items: IPickListItem[]): number;
}
