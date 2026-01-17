/**
 * Weight Dispute Type Definitions
 * 
 * Frontend types matching backend weight dispute models.
 * Supports full lifecycle: detection → evidence → resolution → settlement
 */

export type DisputeStatus =
    | 'pending'          // Awaiting seller response
    | 'under_review'     // Seller submitted evidence
    | 'seller_response'  // Seller responded
    | 'auto_resolved'    // Auto-resolved after 7 days
    | 'manual_resolved'  // Admin manually resolved
    | 'closed';          // Final state

export type ResolutionOutcome =
    | 'seller_favor'     // Refund to seller
    | 'shipcrowd_favor'  // Deduct from seller
    | 'split'            // Partial adjustment
    | 'waived';          // No financial impact

export type WeightUnit = 'kg' | 'g';
export type ChargeDirection = 'debit' | 'credit';

export interface Weight {
    value: number;
    unit: WeightUnit;
}

export interface WeightDiscrepancy {
    value: number;          // Absolute difference in kg
    percentage: number;     // Percentage difference
    thresholdExceeded: boolean; // If >5%
}

export interface SellerEvidence {
    sellerPhotos?: string[];     // S3/CloudFlare URLs
    sellerDocuments?: string[];  // Invoice/receipt URLs
    submittedAt?: string;
    notes?: string;
}

export interface CarrierEvidence {
    scanPhoto?: string;
    scanTimestamp?: string;
    scanLocation?: string;
    carrierNotes?: string;
}

export interface FinancialImpact {
    originalCharge: number;   // Based on declared weight
    revisedCharge: number;    // Based on actual weight
    difference: number;       // Adjustment amount
    chargeDirection: ChargeDirection;
}

export interface DisputeResolution {
    outcome: ResolutionOutcome;
    adjustedWeight?: Weight;
    refundAmount?: number;
    deductionAmount?: number;
    reasonCode: string;
    resolvedAt: string;
    resolvedBy: string | 'system';
    notes: string;
}

export interface TimelineEntry {
    status: string;
    timestamp: string;
    actor: string | 'system' | 'carrier';
    action: string;
    notes?: string;
}

// Main Weight Dispute Interface
export interface WeightDispute {
    _id: string;
    disputeId: string; // WD-YYYYMMDD-XXXXX
    shipmentId: {
        _id: string;
        trackingNumber: string;
        carrier?: string;
        currentStatus?: string;
        packageDetails?: any;
        deliveryDetails?: any;
    } | string;
    orderId: {
        _id: string;
        orderNumber: string;
        customerInfo?: any;
    } | string;
    companyId: string;

    // Weight Information
    declaredWeight: Weight;
    actualWeight: Weight;
    discrepancy: WeightDiscrepancy;

    // Status & Detection
    status: DisputeStatus;
    detectedAt: string;
    detectedBy: 'carrier_webhook' | 'system_scan';

    // Evidence
    evidence?: SellerEvidence;
    carrierEvidence?: CarrierEvidence;

    // Financial
    financialImpact: FinancialImpact;

    // Resolution
    resolution?: DisputeResolution;

    // Audit
    timeline: TimelineEntry[];
    walletTransactionId?: string;

    // Metadata
    createdAt: string;
    updatedAt: string;
}

// API Request/Response Types
export interface DisputeFilters {
    status?: DisputeStatus;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: number;
    limit?: number;
}

export interface DisputeListResponse {
    disputes: WeightDispute[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface SubmitEvidencePayload {
    photos?: string[];
    documents?: string[];
    notes?: string;
}

export interface ResolveDisputePayload {
    outcome: ResolutionOutcome;
    adjustedWeight?: Weight;
    refundAmount?: number;
    deductionAmount?: number;
    reasonCode: string;
    notes: string;
}

export interface DisputeMetrics {
    total: number;
    pending: number;
    underReview: number;
    resolved: number;
    autoResolved: number;
    totalFinancialImpact: number;
    averageResolutionTime: number; // in hours
}

export interface DisputeAnalytics {
    stats: {
        totalDisputes: number;
        totalFinancialImpact: number;
        averageDiscrepancy: number;
        sellerResponseRate: number;
        autoResolveRate: number;
        resolutionOutcomes: {
            seller_favor: number;
            shipcrowd_favor: number;
            split: number;
            waived: number;
        };
    };
    trends: Array<{
        date: string;
        count: number;
        totalImpact: number;
    }>;
    highRiskSellers: Array<{
        companyId: string;
        companyName: string;
        disputeCount: number;
        totalDiscrepancy: number;
        averageDiscrepancy: number;
    }>;
}
