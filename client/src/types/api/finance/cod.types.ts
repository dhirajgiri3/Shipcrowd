/**
 * COD Remittance API Types
 *
 * UI-facing types plus backend DTOs used by COD mappers.
 */

// ==================== COD Remittance Types ====================

export type RemittanceStatus =
    | 'draft'
    | 'pending_approval'
    | 'approved'
    | 'paid'
    | 'settled'
    | 'failed'
    | 'cancelled';

export type PayoutStatus =
    | 'pending'
    | 'processing'
    | 'completed'
    | 'failed'
    | 'cancelled';

export interface BatchInfo {
    batchNumber: number;
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
    processedAt?: string; // mapped to completedAt when available
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
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
}

// ==================== Dashboard Stats ====================
// Matches backend: CODRemittanceService.getDashboardStats()

export interface CODStats {
    pendingCollection: {
        amount: number;
        orders: number;
        estimatedDate: string;
    };
    inSettlement: {
        amount: number;
        orders: number;
        estimatedDate: string;
    };
    available: {
        amount: number;
        estimatedPayoutDate: string;
    };
    thisMonth: {
        collected: number;
        deducted: number;
        received: number;
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

// ==================== Backend DTOs (for mappers/hooks) ====================

export interface APIEnvelope<T> {
    success: boolean;
    data: T;
    message?: string;
    timestamp?: string;
}

export interface APIPaginatedEnvelope<T> extends APIEnvelope<T[]> {
    pagination: PaginationMeta;
}

export interface BackendRemittanceTimelineEntry {
    status: string;
    timestamp: string;
    actor?: string;
    action?: string;
    notes?: string;
}

export interface BackendRemittance {
    _id: string;
    companyId: string;
    remittanceId: string;
    batch: {
        batchNumber: number;
        createdDate: string;
        cutoffDate: string;
        shippingPeriod: {
            start: string;
            end: string;
        };
    };
    schedule?: {
        type?: 'scheduled' | 'on_demand' | 'manual';
        scheduledDate?: string;
        requestedBy?: string;
    };
    shipments: Array<{
        shipmentId?:
            | string
            | {
                  _id?: string;
                  awb?: string;
                  trackingNumber?: string;
                  orderId?: {
                      _id?: string;
                      orderNumber?: string;
                      productDetails?: {
                          name: string;
                          quantity: number;
                      };
                      customerDetails?: {
                          name?: string;
                          phone?: string;
                      };
                  };
                  actualDelivery?: string;
                  currentStatus?: string;
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
    }>;
    financial: {
        totalCODCollected: number;
        totalShipments: number;
        successfulDeliveries: number;
        rtoCount: number;
        disputedCount: number;
        deductionsSummary: {
            totalShippingCharges: number;
            totalWeightDisputes: number;
            totalRTOCharges: number;
            totalInsuranceCharges: number;
            totalPlatformFees: number;
            totalOtherFees: number;
            grandTotal: number;
        };
        netPayable: number;
    };
    payout?: {
        status: PayoutStatus;
        method?: string;
        razorpayPayoutId?: string;
        initiatedAt?: string;
        processedAt?: string;
        completedAt?: string;
        failureReason?: string;
        accountDetails?: {
            accountNumber: string;
            ifscCode: string;
            accountHolderName: string;
            bankName?: string;
        };
    };
    settlementDetails?: {
        utrNumber?: string;
    };
    status: RemittanceStatus;
    timeline?: BackendRemittanceTimelineEntry[];
    approvedBy?: string;
    approvalNotes?: string;
    createdAt: string;
    updatedAt: string;
    cancelledAt?: string;
}

export interface BackendEligibleShipmentsResponse {
    shipments: Array<{
        shipmentId: string;
        awb: string;
        codAmount: number;
        deliveredAt: string;
        deductions?: {
            shippingCharge?: number;
        };
        shippingCost?: number;
    }>;
    summary: {
        totalShipments: number;
        totalCOD: number;
        totalDeductions: number;
        netPayable: number;
    };
}
