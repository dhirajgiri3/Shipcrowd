// Zone Management Types
export type ZoneType = 'LOCAL' | 'REGIONAL' | 'NATIONAL';

export interface Zone {
    _id: string;
    name: string;
    type: ZoneType;
    description: string;
    pincodes: string[];
    pincodeCount?: number;
    transitDays: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateZoneRequest {
    name: string;
    type: ZoneType;
    description?: string;
    pincodes: string[];
    transitDays: number;
}

export interface UpdateZoneRequest {
    name?: string;
    type?: ZoneType;
    description?: string;
    transitDays?: number;
    isActive?: boolean;
}

export interface AddPincodesToZoneRequest {
    pincodes: string[];
}

export interface RemovePincodesFromZoneRequest {
    pincodes: string[];
}

export interface ZoneListFilters {
    type?: ZoneType;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
}

export interface ZoneListResponse {
    success: boolean;
    data: Zone[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface ZoneDetailResponse {
    success: boolean;
    data: Zone;
}

export interface PincodeValidationResult {
    valid: string[];
    invalid: string[];
    duplicates: string[];
}

export interface BulkPincodeUploadResponse {
    success: boolean;
    data: PincodeValidationResult;
}
