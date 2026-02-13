/**
 * Returns Management Type Definitions
 */

export type ReturnStatus =
    | 'requested'
    | 'pickup_scheduled'
    | 'in_transit'
    | 'qc_pending'
    | 'qc_in_progress'
    | 'approved'
    | 'rejected'
    | 'refunding'
    | 'completed'
    | 'cancelled'
    // legacy aliases retained for backward compatibility
    | 'received'
    | 'qc_passed'
    | 'qc_failed'
    | 'refund_initiated'
    | 'refund_completed'
    | 'closed';

export type SellerReviewStatus = 'pending' | 'approved' | 'rejected';

export type ReturnReason =
    | 'defective'
    | 'wrong_item'
    | 'size_issue'
    | 'color_mismatch'
    | 'not_as_described'
    | 'damaged_in_transit'
    | 'changed_mind'
    | 'quality_issue'
    | 'duplicate_order'
    | 'other'
    // legacy aliases retained for backward compatibility
    | 'defective_product'
    | 'wrong_item_shipped'
    | 'size_fit_issue'
    | 'product_not_as_described'
    | 'arrived_late'
    | 'better_price_elsewhere'
    | 'quality_not_satisfied';

export type QCStatus = 'pass' | 'partial_pass' | 'fail';

export type RefundMethod = 'original_payment' | 'wallet' | 'bank_transfer' | 'store_credit';

export interface ReturnItem {
    productId: string;
    productName: string;
    sku?: string;
    quantity?: number;
    sellingPrice?: number;
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
    status: string;
    timestamp: string;
    actor?: string | 'system' | 'customer';
    action?: string;
    notes?: string;
    location?: string;
}

export interface ReturnRequest {
    _id: string;
    returnId: string;
    orderId:
        | {
            _id: string;
            orderNumber: string;
            totalAmount: number;
        }
        | string;
    shipmentId?:
        | {
            _id: string;
            trackingNumber: string;
            carrier?: string;
        }
        | string;
    companyId: string;

    customerName: string;
    customerEmail?: string;
    customerPhone: string;

    status: ReturnStatus;
    sellerReview?: {
        status: SellerReviewStatus;
        reviewedBy?: string;
        reviewedAt?: string;
        rejectionReason?: string;
    };
    items: ReturnItem[];
    primaryReason: ReturnReason;
    returnReason?: ReturnReason;
    customerNotes?: string;
    images?: string[];

    pickupAddress?: string;
    pickupScheduledAt?: string;
    pickupTrackingNumber?: string;

    receivedAt?: string;
    warehouseLocation?: string;
    qualityCheck?: QualityCheck;

    refundDetails?: RefundDetails;
    refundEligible?: boolean;
    estimatedRefund: number;

    pickup?: {
        status?: string;
        scheduledDate?: string;
        awb?: string;
        trackingUrl?: string;
    };
    qc?: {
        status?: string;
        result?: string;
        completedAt?: string;
        notes?: string;
    };
    refund?: {
        status?: string;
        completedAt?: string;
        transactionId?: string;
    };
    sla?: {
        isBreached?: boolean;
    };

    timeline: ReturnTimeline[];

    requestedAt: string;
    approvedAt?: string;
    rejectedAt?: string;
    rejectionReason?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ReturnFilters {
    status?: ReturnStatus;
    sellerReviewStatus?: SellerReviewStatus;
    reason?: ReturnReason;
    returnReason?: ReturnReason;
    startDate?: string;
    endDate?: string;
    search?: string;
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

export interface ReviewReturnPayload {
    decision: 'approved' | 'rejected';
    reason?: string;
}

// legacy alias for backward compatibility with old imports
export interface ApproveReturnPayload extends ReviewReturnPayload {
    approved?: boolean;
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
    sellerReviewPending: number;
    qcPending: number;
    completed: number;
    totalRefundAmount: number;
    averageProcessingTimeHours: number;
    returnRate: number;
    byStatus?: Record<string, number>;
    byReason?: Record<string, number>;
    period?: {
        startDate: string;
        endDate: string;
    };
}

export interface ReturnAnalytics {
    summary: ReturnMetrics;
    byStatus: Record<string, number>;
    byReason: Record<string, number>;
    topReasons: Array<{
        reason: ReturnReason;
        count: number;
        percentage: number;
    }>;
    period: {
        startDate: string;
        endDate: string;
    };
}
