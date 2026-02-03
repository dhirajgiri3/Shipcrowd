/**
 * Manifest Types (Shipping)
 *
 * Type definitions for manifest management and pickup coordination.
 */

// ==================== Core Manifest Types ====================

export type ManifestStatus = 'open' | 'closed' | 'handed_over';

export type CourierPartner =
    | 'velocity'
    | 'delhivery'
    | 'ekart'
    | 'xpressbees'
    | 'india_post';

export interface ManifestShipment {
    shipmentId: string;
    awb: string;
    weight: number;
    packages: number;
    codAmount: number;
}

export interface Manifest {
    _id: string;
    manifestNumber: string;
    companyId: string;
    warehouseId: string | {
        _id: string;
        name?: string;
        address?: any;
        contactInfo?: any;
    };
    carrier: CourierPartner;
    shipments: ManifestShipment[];
    pickup: {
        scheduledDate: string;
        timeSlot: string;
        contactPerson: string;
        contactPhone: string;
        pickupReference?: string;
    };
    summary: {
        totalShipments: number;
        totalWeight: number;
        totalPackages: number;
        totalCODAmount: number;
    };
    status: ManifestStatus;
    notes?: string;
    closedAt?: string;
    closedBy?: string;
    handedOverAt?: string;
    handedOverBy?: string;
    createdAt: string;
    updatedAt: string;
    metadata?: {
        carrierManifestId?: string;
        carrierManifestUrl?: string;
        generatedAt?: string;
    };
}

export interface EligibleManifestShipment {
    shipmentId: string;
    awb: string;
    weight: number;
    packages: number;
    codAmount: number;
    destination: {
        city?: string;
        state?: string;
        pincode?: string;
    };
    warehouseId?: string;
    warehouseName?: string;
    warehouseContact?: {
        phone?: string;
        name?: string;
        email?: string;
    };
}

// ==================== Stats Types ====================

export interface ManifestStats {
    totalManifests: number;
    pendingPickup: number;
    pickedUpToday: number;
    scheduledToday: number;
    averageShipmentsPerManifest: number;
    courierBreakdown: {
        courier: CourierPartner;
        count: number;
    }[];
}

// ==================== API Request/Response Types ====================

export interface ManifestListFilters {
    page?: number;
    limit?: number;
    status?: ManifestStatus | ManifestStatus[];
    carrier?: CourierPartner;
    warehouseId?: string;
    search?: string;
}

export interface ManifestListResponse {
    manifests: Manifest[];
    total: number;
    page: number;
    pages: number;
}

export interface CreateManifestPayload {
    carrier: CourierPartner;
    shipmentIds: string[];
    pickup: {
        scheduledDate: string;
        timeSlot: string;
        contactPerson: string;
        contactPhone: string;
    };
    warehouseId?: string;
    notes?: string;
}

export interface CreateManifestResponse {
    manifest: Manifest;
}

// ==================== Reconciliation (Legacy placeholders) ====================

export interface ReconciliationPayload {
    manifestId: string;
    shipments: {
        shipmentId: string;
        isPickedUp: boolean;
        notes?: string;
    }[];
    overallNotes?: string;
}

export interface ReconciliationResult {
    manifestId: string;
    totalShipments: number;
    pickedUp: number;
    notPicked: number;
    discrepancies: {
        shipmentId: string;
        reason: string;
    }[];
    status: 'COMPLETED' | 'DISCREPANCY';
}
