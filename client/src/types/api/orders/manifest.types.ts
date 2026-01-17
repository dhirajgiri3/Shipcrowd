/**
 * Manifest Types
 * 
 * Type definitions for manifest management, pickup coordination,
 * and reconciliation features.
 */

// ==================== Core Manifest Types ====================

export type ManifestStatus =
    | 'DRAFT'
    | 'CREATED'
    | 'PICKUP_SCHEDULED'
    | 'PICKUP_IN_PROGRESS'
    | 'PICKED_UP'
    | 'PARTIALLY_PICKED'
    | 'CANCELLED';

export type CourierPartner =
    | 'velocity'
    | 'delhivery'
    | 'ekart'
    | 'xpressbees'
    | 'bluedart'
    | 'shadowfax'
    | 'ecom_express';

export interface Manifest {
    _id: string;
    manifestId: string;
    sellerId: string;
    courierPartner: CourierPartner;
    courierDisplayName: string;

    // Pickup details
    pickupDate: string;
    pickupSlot?: {
        start: string;
        end: string;
    };
    pickupAddress: {
        name: string;
        address: string;
        city: string;
        state: string;
        pincode: string;
        phone: string;
    };

    // Shipment details
    shipments: ManifestShipment[];
    totalShipments: number;
    totalWeight: number;
    totalCodAmount: number;

    // Status tracking
    status: ManifestStatus;
    pickedUpCount: number;
    notPickedCount: number;

    // Reconciliation
    reconciliationStatus?: 'PENDING' | 'COMPLETED' | 'DISCREPANCY';
    reconciliationNotes?: string;

    // Metadata
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
}

export interface ManifestShipment {
    shipmentId: string;
    awbNumber: string;
    orderId: string;
    destination: {
        city: string;
        state: string;
        pincode: string;
    };
    weight: number;
    paymentMode: 'COD' | 'PREPAID';
    codAmount?: number;
    productDetails?: string;
    isPickedUp: boolean;
    pickupTime?: string;
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
    courierPartner?: CourierPartner;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
}

export interface ManifestListResponse {
    manifests: Manifest[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}

export interface CreateManifestPayload {
    courierPartner: CourierPartner;
    shipmentIds: string[];
    pickupDate: string;
    pickupSlot?: {
        start: string;
        end: string;
    };
    warehouseId?: string;
}

export interface CreateManifestResponse {
    manifest: Manifest;
    manifestPdfUrl?: string;
}

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

// ==================== Wizard Types ====================

export interface ManifestWizardStep1Data {
    courierPartner: CourierPartner | null;
}

export interface ManifestWizardStep2Data {
    selectedShipmentIds: string[];
}

export interface ManifestWizardStep3Data {
    pickupDate: string;
    pickupSlot: {
        start: string;
        end: string;
    } | null;
    warehouseId: string | null;
}

export interface ManifestWizardData {
    step1: ManifestWizardStep1Data;
    step2: ManifestWizardStep2Data;
    step3: ManifestWizardStep3Data;
}

// ==================== Component Prop Types ====================

export interface ManifestTableProps {
    manifests: Manifest[];
    isLoading: boolean;
    onManifestClick?: (manifest: Manifest) => void;
    onDownloadPdf?: (manifestId: string) => void;
    onReconcile?: (manifestId: string) => void;
}

export interface ManifestStatsCardProps {
    stats: ManifestStats;
    isLoading: boolean;
}

export interface CreateManifestWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (manifest: Manifest) => void;
}

// ==================== PDF Generation Types ====================

export interface ManifestPdfData {
    manifest: Manifest;
    companyName: string;
    companyLogo?: string;
    generatedAt: string;
}
