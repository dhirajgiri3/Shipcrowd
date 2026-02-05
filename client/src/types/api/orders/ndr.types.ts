/**
 * NDR (Non-Delivery Report) Type Definitions
 * 
 * Frontend types for NDR management system.
 * Handles failed delivery attempts and automated customer communication.
 */

export type NDRStatus =
    | 'open'              // New NDR case
    | 'in_progress'       // Action taken, awaiting response
    | 'customer_action'   // Awaiting customer response
    | 'reattempt_scheduled' // Delivery reattempt scheduled
    | 'resolved'          // Successfully resolved
    | 'escalated'         // Escalated to admin
    | 'converted_to_rto'; // Failed, converting to RTO

export type NDRReason =
    | 'address_incomplete'
    | 'address_incorrect'
    | 'consignee_unavailable'
    | 'consignee_refused'
    | 'door_locked'
    | 'customer_out_of_town'
    | 'payment_issue_cod'
    | 'customer_wants_open_delivery'
    | 'shipment_damaged'
    | 'other';

export type NDRAction =
    | 'reattempt_delivery'      // Try delivery again
    | 'address_correction'      // Update delivery address
    | 'reschedule_delivery'     // Customer reschedule
    | 'cancel_order'            // Customer cancellation
    | 'convert_prepaid'         // Convert COD to prepaid
    | 'contact_customer'        // Manual customer contact
    | 'return_to_origin';       // Initiate RTO

export type CommunicationChannel = 'sms' | 'email' | 'whatsapp' | 'call';

export interface NDRAttempt {
    attemptNumber: number;
    attemptDate: string;
    reason: NDRReason;
    reasonDescription: string;
    courierRemarks?: string;
    location?: string;
}

export interface CustomerCommunication {
    channel: CommunicationChannel;
    sentAt: string;
    deliveredAt?: string;
    readAt?: string;
    responseReceivedAt?: string;
    customerResponse?: string;
    template: string;
}

export interface AutomatedAction {
    actionType: NDRAction;
    triggeredAt: string;
    triggeredBy: 'system' | 'admin' | 'seller';
    status: 'pending' | 'completed' | 'failed';
    completedAt?: string;
    failureReason?: string;
    notes?: string;
}

export interface AddressCorrection {
    originalAddress: {
        name: string;
        phone: string;
        addressLine1: string;
        addressLine2?: string;
        city: string;
        state: string;
        pincode: string;
        landmark?: string;
    };
    correctedAddress: {
        name: string;
        phone: string;
        addressLine1: string;
        addressLine2?: string;
        city: string;
        state: string;
        pincode: string;
        landmark?: string;
    };
    correctedBy: 'customer' | 'seller' | 'admin';
    correctedAt: string;
    verified: boolean;
}

export interface NDRResolution {
    action: NDRAction;
    resolvedAt: string;
    resolvedBy: string | 'system';
    outcome: 'delivered' | 'rto' | 'cancelled';
    notes?: string;
    newDeliveryDate?: string;
    rtoId?: string;
}

// Main NDR Case Interface
export interface NDRCase {
    _id: string;
    ndrId: string; // NDR-YYYYMMDD-XXXXX
    shipmentId: {
        _id: string;
        trackingNumber: string;
        carrier?: string;
        currentStatus?: string;
    } | string;
    orderId: {
        _id: string;
        orderNumber: string;
        paymentMethod?: 'COD' | 'PREPAID';
    } | string;
    companyId: string;

    // NDR Details
    status: NDRStatus;
    primaryReason: NDRReason;
    currentAttempt: NDRAttempt;
    allAttempts: NDRAttempt[];

    // Customer Information
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    deliveryAddress: string;

    // Communication History
    communications: CustomerCommunication[];
    lastCommunicationAt?: string;

    // Actions & Resolution
    automatedActions: AutomatedAction[];
    addressCorrection?: AddressCorrection;
    resolution?: NDRResolution;

    // SLA & Timing
    reportedAt: string;
    slaDeadline: string; // Based on carrier SLA
    slaBreach: boolean;
    daysSinceReported: number;

    // Escalation
    escalatedAt?: string;
    escalationReason?: string;

    // Metadata
    createdAt: string;
    updatedAt: string;
}

// API Request/Response Types
export interface NDRFilters {
    status?: NDRStatus;
    reason?: NDRReason;
    carrier?: string;
    startDate?: string;
    endDate?: string;
    slaBreach?: boolean;
    search?: string; // Search by AWB, NDR ID, customer
    page?: number;
    limit?: number;
}

export interface NDRListResponse {
    cases: NDRCase[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface TakeNDRActionPayload {
    action: NDRAction;
    notes?: string;
    newAddress?: AddressCorrection['correctedAddress'];
    newDeliveryDate?: string;
    communicationChannel?: CommunicationChannel;
}

export interface BulkNDRActionPayload {
    caseIds: string[];
    action: NDRAction;
    notes?: string;
}

export interface NDRMetrics {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    escalated: number;
    convertedToRTO: number;
    slaBreach: number;
    resolutionRate: number;
    averageResolutionTime: number; // in hours
}

export interface NDRAnalytics {
    stats: {
        totalCases: number;
        resolutionRate: number;
        averageResolutionTime: number;
        slaBreachRate: number;
        rtoConversionRate: number;
    };
    reasonBreakdown: Array<{
        reason: NDRReason;
        count: number;
        percentage: number;
    }>;
    actionEffectiveness: Array<{
        action: NDRAction;
        totalAttempts: number;
        successRate: number;
        averageTime: number;
    }>;
    communicationStats: {
        smsDeliveryRate: number;
        emailOpenRate: number;
        whatsappDeliveryRate: number;
        customerResponseRate: number;
    };
    trends: Array<{
        date: string;
        created: number;
        resolved: number;
        rtoConverted: number;
    }>;
}

export interface NDRSettings {
    autoReattemptEnabled: boolean;
    autoReattemptAfterHours: number;
    maxReattempts: number;
    smsNotificationsEnabled: boolean;
    emailNotificationsEnabled: boolean;
    whatsappNotificationsEnabled: boolean;
    autoEscalateAfterDays: number;
    enableCustomerPortal: boolean;
}

export interface NDRSelfServiceMetrics {
    magicLinksSent: number;
    magicLinksClicked: number;
    ctr: number;
    customerResponses: number;
    responseRate: number;
    actionBreakdown: Record<string, number>;
}

export interface NDRPreventionMetrics {
    addressValidationBlocks: number;
    phoneVerificationFailures: number;
    highRiskOrders: number;
    codVerificationBlocks: number;
    totalPrevented: number;
}

export interface NDRROIMetrics {
    baselineRTOCost: number;
    currentRTOCost: number;
    savings: number;
    operationalCosts: number;
    netSavings: number;
    roi: number;
}

export interface NDRWeeklyTrends {
    currentWeek: any;
    trends: Array<{
        date: string;
        count: number;
        resolved: number;
        rtoTriggered: number;
    }>;
    insights: string[];
}
