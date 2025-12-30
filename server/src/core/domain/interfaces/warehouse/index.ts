/**
 * Warehouse Interfaces Index
 *
 * Re-exports all warehouse-related interfaces for easy importing.
 * IPaginatedResult is only exported from IPickingService to avoid duplicates.
 */

// Export everything from IPickingService (including IPaginatedResult)
export * from './IPickingService';

// Export specific items from IPackingService (excluding IPaginatedResult)
export type {
    ICreatePackingStationDTO,
    IUpdatePackingStationDTO,
    IAssignPackerDTO,
    IStartPackingSessionDTO,
    IPackItemDTO,
    ICreatePackageDTO,
    IVerifyWeightDTO,
    ICompletePackingSessionDTO,
    IPackingStationQueryOptions,
    IPackerStats,
    IPackingStationStats,
    IWeightVerificationResult,
    IPackingService,
} from './IPackingService';

// Export specific items from IInventoryService (excluding IPaginatedResult)
export type {
    ICreateInventoryDTO,
    IUpdateInventoryDTO,
    IAdjustStockDTO,
    IReceiveStockDTO,
    IReserveStockDTO,
    IReleaseReservationDTO,
    IPickStockDTO,
    ITransferStockDTO,
    IMarkDamagedDTO,
    IDisposeStockDTO,
    ICycleCountDTO,
    IInventoryQueryOptions,
    IStockMovementQueryOptions,
    ILowStockAlert,
    IStockAlert,
    IInventoryStats,
    IMovementSummary,
    IInventoryService,
} from './IInventoryService';
