/**
 * COD Remittance API Types
 * 
 * Centralized type definitions for COD remittance API responses.
 * Matches backend schemas from:
 * - /server/src/infrastructure/database/mongoose/models/finance/payouts/cod-remittance.model.ts
 * - /server/src/presentation/http/controllers/finance/cod-remittance.controller.ts
 */

// ==================== COD Remittance Types ====================

export type RemittanceStatus =
    | 'pending_approval'
    | 'approved'
    | 'payout_initiated'
    | 'completed'
    | 'failed'
    | 'cancelled';

export type PayoutStatus =
    | 'pending'
    | 'processing'
    | 'processed'
    | 'reversed'
    | 'failed';

export interface BatchInfo {
    batchNumber: string;
    shipmentsCount: number;
    totalCODCollected: number;
    totalShippingCost: number;
    totalOtherDeductions: number;
    netPayable: number;
}

export interface ShipmentDeductions {
    shippingCharge: number;
    weightDispute?: number;
    rtoCharge?: number;
    insuranceCharge?: number;
    platformFee?: number;
    otherFees?: number;
    total: number;
}

export interface ShipmentInRemittance {
    shipmentId: {
        _id: string;
        awb: string;
        orderId: {
            _id: string;
            orderNumber: string;
            productDetails?: {
                name: string;
                quantity: number;
            };
            customerDetails?: {
                name: string;
                phone: string;
            };
        };
        deliveredAt: string;
        status: string;
        courierPartner?: string;
        weight?: {
            actual: number;
            volumetric: number;
            charged: number;
        };
    };
    awb: string;
    codAmount: number;
    deliveredAt: string;
    status: 'delivered' | 'rto' | 'disputed';
    deductions: ShipmentDeductions;
    netAmount: number;
}

export interface DeductionBreakdown {
    shippingCost: number;
    codHandlingCharges: number;
    rtoCharges: number;
    weightDiscrepancyCharges: number;
    otherCharges: number;
    tds: number;
    total: number;
}

export interface PayoutInfo {
    razorpayPayoutId?: string;
    utr?: string;
    status: PayoutStatus;
    initiatedAt?: string;
    processedAt?: string;
    failureReason?: string;
}

export interface Timeline {
    batchCreated: string;
    approvedAt?: string;
    payoutInitiatedAt?: string;
    completedAt?: string;
    cancelledAt?: string;
}

export interface BankAccount {
    accountNumber: string;
    ifsc: string;
    accountHolderName: string;
    bankName: string;
}

export interface CODRemittance {
    _id: string;
    companyId: string;
    remittanceId: string;
    batch: BatchInfo;
    shipments: ShipmentInRemittance[]; // Updated to full shipment details
    deductions: DeductionBreakdown;
    finalPayable: number;
    status: RemittanceStatus;
    payout?: PayoutInfo;
    bankAccount: BankAccount;
    timeline: Timeline;
    approvedBy?: string;
    approvalNotes?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

// ==================== Dashboard Stats ====================

export interface CODStats {
    pending: {
        count: number;
        amount: number;
    };
    thisMonth: {
        count: number;
        totalCODCollected: number;
        totalDeductions: number;
        netPaid: number;
    };
    lastRemittance?: {
        date: string;
        amount: number;
        utr: string;
    };
}

// ==================== Filters & Pagination ====================

export interface RemittanceFilters {
    status?: RemittanceStatus;
    startDate?: string;
    endDate?: string;
    minAmount?: number;
    maxAmount?: number;
    search?: string; // Batch number or UTR
    page?: number;
    limit?: number;
}

export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

export interface CODRemittanceResponse {
    remittances: CODRemittance[];
    pagination: PaginationMeta;
}

// ==================== Eligible Shipments ====================

export interface EligibleShipment {
    awb: string;
    orderId: string;
    codAmount: number;
    deliveredAt: string;
    shippingCost: number;
}

export interface EligibleShipmentsResponse {
    shipments: EligibleShipment[];
    summary: {
        totalShipments: number;
        totalCODAmount: number;
        totalShippingCost: number;
        estimatedPayable: number;
    };
}

// ==================== Mutation Payloads ====================

export interface CreateBatchPayload {
    shipmentIds: string[];
    notes?: string;
}

export interface ApproveRemittancePayload {
    notes?: string;
}

export interface RequestPayoutPayload {
    amount: number;
}

export interface SchedulePayoutPayload {
    frequency: 'weekly' | 'bi-weekly' | 'monthly';
    dayOfWeek?: number; // 0-6
    dayOfMonth?: number; // 1-31
}
