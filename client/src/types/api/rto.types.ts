/**
 * RTO (Return to Origin) API types
 * Aligned with server RTOEvent model and controller responses.
 */

export type RTOReason =
    | 'ndr_unresolved'
    | 'customer_cancellation'
    | 'qc_failure'
    | 'refused'
    | 'damaged_in_transit'
    | 'incorrect_product'
    | 'other';

export type RTOReturnStatus =
    | 'initiated'
    | 'in_transit'
    | 'delivered_to_warehouse'
    | 'qc_pending'
    | 'qc_completed'
    | 'restocked'
    | 'disposed'
    | 'refurbishing'
    | 'claim_filed';

/** Disposition action: restock | refurb | dispose | claim */
export type RTODispositionAction = 'restock' | 'refurb' | 'dispose' | 'claim';

export interface RTODisposition {
    action: RTODispositionAction;
    decidedAt: string;
    decidedBy?: string;
    automated?: boolean;
    reason?: string;
    notes?: string;
}

export interface RTOQCPhoto {
    url: string;
    label?: string;
}

export interface RTOQCResult {
    passed: boolean;
    remarks?: string;
    images?: string[];
    inspectedBy?: string;
    inspectedAt?: string;
    condition?: string;
    damageTypes?: string[];
    photos?: RTOQCPhoto[];
}

export interface RTOShipmentRef {
    _id: string;
    awb?: string;
    trackingNumber?: string;
    currentStatus?: string;
    deliveryDetails?: { recipientName?: string; recipientPhone?: string; address?: { city?: string; postalCode?: string } };
    packageDetails?: { weight?: number };
    carrier?: string;
}

export interface RTOOrderRef {
    _id: string;
    orderNumber?: string;
    products?: Array<{ name?: string; sku?: string; quantity: number; productName?: string }>;
    items?: Array<{ sku: string; quantity: number; productName?: string }>;
}

export interface RTOWarehouseRef {
    _id: string;
    name?: string;
}

export interface RTOEventDetail {
    _id: string;
    shipment: string | RTOShipmentRef;
    order: string | RTOOrderRef;
    reverseAwb?: string;
    rtoReason: RTOReason;
    ndrEvent?: string;
    triggeredBy: 'auto' | 'manual';
    triggeredByUser?: string;
    triggeredAt: string;
    rtoCharges: number;
    chargesDeducted: boolean;
    chargesDeductedAt?: string;
    warehouse: string | RTOWarehouseRef;
    expectedReturnDate?: string;
    actualReturnDate?: string;
    returnStatus: RTOReturnStatus;
    qcResult?: RTOQCResult;
    disposition?: RTODisposition;
    company: string;
    customerNotified?: boolean;
    warehouseNotified?: boolean;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

export interface RTOListPagination {
    page: number;
    limit: number;
    total: number;
    pages: number;
}

export const RTO_REASON_LABELS: Record<RTOReason, string> = {
    ndr_unresolved: 'Customer Unavailable',
    customer_cancellation: 'Customer Cancelled',
    qc_failure: 'QC Failure',
    refused: 'Order Refused',
    damaged_in_transit: 'Damaged in Transit',
    incorrect_product: 'Incorrect / Address',
    other: 'Other',
};

export const RTO_STATUS_LABELS: Record<RTOReturnStatus, string> = {
    initiated: 'Initiated',
    in_transit: 'In Transit',
    delivered_to_warehouse: 'At Warehouse',
    qc_pending: 'QC Pending',
    qc_completed: 'QC Completed',
    restocked: 'Restocked',
    disposed: 'Disposed',
    refurbishing: 'Refurbishing',
    claim_filed: 'Claim Filed',
};

export const RTO_DISPOSITION_LABELS: Record<RTODispositionAction, string> = {
    restock: 'Restock',
    refurb: 'Send for Refurb',
    dispose: 'Dispose',
    claim: 'File Claim',
};
