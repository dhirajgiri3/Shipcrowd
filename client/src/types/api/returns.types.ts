/**
 * Returns Management Type Definitions
 * 
 * Comprehensive types for reverse logistics:
 * - Return requests
 * - QC (Quality Check) workflow
 * - Refund processing
 * - RTO integration
 */

export type ReturnStatus =
    | 'requested'           // Return requested by customer
    | 'approved'            // Approved by seller
    | 'rejected'            // Rejected by seller
    | 'pickup_scheduled'    // Pickup scheduled
    | 'in_transit'          // Being returned
    | 'received'            // Received at warehouse
    | 'qc_pending'          // Awaiting quality check
    | 'qc_passed'           // QC passed
    | 'qc_failed'           // QC failed
    | 'refund_initiated'    // Refund processing
    | 'refund_completed'    // Refund completed
    | 'closed';             // Return closed

export type ReturnReason =
    | 'defective_product'
    | 'wrong_item_shipped'
    | 'size_fit_issue'
    | 'product_not_as_described'
    | 'arrived_late'
    | 'damaged_in_transit'
    | 'changed_mind'
    | 'better_price_elsewhere'
    | 'quality_not_satisfied'
    | 'duplicate_order'
    | 'other';

export type QCStatus = 'pass' | 'partial_pass' | 'fail';

export type RefundMethod = 'original_payment' | 'wallet' | 'bank_transfer' | 'store_credit';

export interface ReturnItem {
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    sellingPrice: number;
    returnQuantity: number;
    returnReason: ReturnReason;
    images?: string[];
    condition?: 'new' | 'used' | 'damaged';
}

export interface QualityCheck {
    performedBy: string;
    performedAt: string;
    status: QCStatus;
    items: Array<{
        productId: string;
        productName: string;
        expectedQuantity: number;
        receivedQuantity: number;
        condition: 'new' | 'used' | 'damaged' | 'defective';
        notes: string;
        images: string[];
        passed: boolean;
    }>;
    overallNotes: string;
    refundAmount: number;
    restockable: boolean;
}

export interface RefundDetails {
    method: RefundMethod;
    amount: number;
    shippingRefund: number;
    deductions: {
        restockingFee?: number;
        shippingCost?: number;
        damageFee?: number;
        other?: number;
    };
    totalRefund: number;
    initiatedAt?: string;
    completedAt?: string;
    transactionId?: string;
}

export interface ReturnTimeline {
    status: ReturnStatus;
    timestamp: string;
    actor: string | 'system' | 'customer';
    notes?: string;
    location?: string;
}

// Main Return Request Interface
export interface ReturnRequest {
    _id: string;
    returnId: string; // RET-YYYYMMDD-XXXXX
    orderId: {
        _id: string;
        orderNumber: string;
        totalAmount: number;
    } | string;
    shipmentId?: {
        _id: string;
        trackingNumber: string;
        carrier?: string;
    } | string;
    companyId: string;

    // Customer Information
    customerName: string;
    customerEmail: string;
    customerPhone: string;

    // Return Details
    status: ReturnStatus;
    items: ReturnItem[];
    primaryReason: ReturnReason;
    customerNotes?: string;
    images?: string[];

    // Pickup Details
    pickupAddress: string;
    pickupScheduledAt?: string;
    pickupTrackingNumber?: string;

    // Warehouse Processing
    receivedAt?: string;
    warehouseLocation?: string;
    qualityCheck?: QualityCheck;

    // Refund Information
    refundDetails?: RefundDetails;
    refundEligible: boolean;
    estimatedRefund: number;

    // Timeline & Audit
    timeline: ReturnTimeline[];

    // Metadata
    requestedAt: string;
    approvedAt?: string;
    rejectedAt?: string;
    rejectionReason?: string;
    createdAt: string;
    updatedAt: string;
}

// API Request/Response Types
export interface ReturnFilters {
    status?: ReturnStatus;
    reason?: ReturnReason;
    startDate?: string;
    endDate?: string;
    search?: string; // Search by return ID, order number
    page?: number;
    limit?: number;
}

export interface ReturnListResponse {
    returns: ReturnRequest[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface CreateReturnPayload {
    orderId: string;
    items: Array<{
        productId: string;
        returnQuantity: number;
        returnReason: ReturnReason;
        notes?: string;
        images?: string[];
    }>;
    customerNotes?: string;
    refundMethod: RefundMethod;
}

export interface ApproveReturnPayload {
    approved: boolean;
    rejectionReason?: string;
    pickupScheduledAt?: string;
}

export interface PerformQCPayload {
    items: QualityCheck['items'];
    overallNotes: string;
    restockable: boolean;
}

export interface ProcessRefundPayload {
    refundAmount: number;
    refundMethod: RefundMethod;
    deductions?: RefundDetails['deductions'];
}

export interface ReturnMetrics {
    total: number;
    requested: number;
    qcPending: number;
    refundInitiated: number;
    completed: number;
    totalRefundAmount: number;
    averageProcessingTime: number; // in hours
    returnRate: number; // percentage
}

export interface ReturnAnalytics {
    stats: {
        totalReturns: number;
        returnRate: number;
        averageRefundAmount: number;
        averageProcessingTime: number;
        qcPassRate: number;
        restockRate: number;
    };
    reasonBreakdown: Array<{
        reason: ReturnReason;
        count: number;
        percentage: number;
    }>;
    refundMethodDistribution: Array<{
        method: RefundMethod;
        count: number;
        totalAmount: number;
    }>;
    trends: Array<{
        date: string;
        requested: number;
        completed: number;
        refundAmount: number;
    }>;
    topReturnedProducts: Array<{
        productId: string;
        productName: string;
        returnCount: number;
        returnRate: number;
    }>;
}
