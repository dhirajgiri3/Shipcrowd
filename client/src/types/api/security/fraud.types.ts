/**
 * Fraud Detection & Security Type Definitions
 * 
 * Types for fraud alerts, risk scoring, and fraud detection rules.
 */

// ==================== Fraud Alerts ====================

export type FraudRiskLevel = 'critical' | 'high' | 'medium' | 'low';
export type FraudAlertStatus = 'new' | 'investigating' | 'resolved' | 'false_positive' | 'confirmed_fraud';
export type FraudAlertType =
    | 'multiple_addresses'
    | 'high_value_cod'
    | 'suspicious_velocity'
    | 'fake_address'
    | 'repeated_failures'
    | 'unusual_pattern'
    | 'blacklisted_customer'
    | 'payment_mismatch'
    | 'location_anomaly';

export interface FraudAlert {
    id: string;
    type: FraudAlertType;
    riskLevel: FraudRiskLevel;
    status: FraudAlertStatus;
    title: string;
    description: string;
    affectedEntity: {
        type: 'customer' | 'order' | 'shipment' | 'address';
        id: string;
        name: string;
    };
    riskScore: number; // 0-100
    indicators: FraudIndicator[];
    metadata: {
        customerName?: string;
        customerEmail?: string;
        customerPhone?: string;
        orderId?: string;
        shipmentId?: string;
        amount?: number;
        location?: string;
        detectedAt: string;
    };
    investigationNotes?: string;
    assignedTo?: string;
    resolvedAt?: string;
    resolvedBy?: string;
    createdAt: string;
    updatedAt: string;
}

export interface FraudIndicator {
    id: string;
    type: string;
    severity: FraudRiskLevel;
    description: string;
    value: string | number;
    threshold?: string | number;
}

export interface FraudStats {
    total: number;
    byStatus: Record<FraudAlertStatus, number>;
    byRiskLevel: Record<FraudRiskLevel, number>;
    recentTrend: {
        period: string;
        count: number;
        change: number; // percentage
    };
    topTypes: Array<{
        type: FraudAlertType;
        count: number;
        percentage: number;
    }>;
}

// ==================== Fraud Rules ====================

export type FraudRuleStatus = 'active' | 'inactive' | 'testing';
export type FraudRuleAction = 'flag' | 'block' | 'review' | 'notify';

export interface FraudRuleCondition {
    field: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in_range';
    value: string | number | string[];
}

export interface FraudRule {
    id: string;
    name: string;
    description: string;
    status: FraudRuleStatus;
    priority: number; // 1-10, higher = more important
    riskLevel: FraudRiskLevel;
    conditions: FraudRuleCondition[];
    action: FraudRuleAction;
    enabled: boolean;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    stats?: {
        triggeredCount: number;
        confirmedFraudCount: number;
        falsePositiveCount: number;
        accuracy: number; // percentage
    };
}

export interface CreateFraudRulePayload {
    name: string;
    description: string;
    riskLevel: FraudRiskLevel;
    conditions: FraudRuleCondition[];
    action: FraudRuleAction;
    priority: number;
}

// ==================== Blocked Entities ====================

export interface BlockedEntity {
    id: string;
    type: 'customer' | 'phone' | 'email' | 'address' | 'ip';
    value: string;
    reason: string;
    blockedBy: string;
    blockedAt: string;
    expiresAt?: string;
    permanent: boolean;
}

export interface BlockEntityPayload {
    type: BlockedEntity['type'];
    value: string;
    reason: string;
    permanent: boolean;
    expiresAt?: string;
}

// ==================== Investigation ====================

export interface FraudInvestigation {
    alertId: string;
    status: FraudAlertStatus;
    notes: string;
    actions: Array<{
        type: 'commented' | 'status_changed' | 'blocked_entity' | 'resolved';
        description: string;
        performedBy: string;
        performedAt: string;
    }>;
    assignedTo?: string;
    priority: 'urgent' | 'high' | 'normal' | 'low';
}

export interface InvestigationAction {
    alertId: string;
    action: 'assign' | 'add_note' | 'change_status' | 'block_entity' | 'resolve';
    payload: {
        assignedTo?: string;
        note?: string;
        status?: FraudAlertStatus;
        blockEntity?: BlockEntityPayload;
        resolution?: string;
    };
}

// ==================== Filters & Queries ====================

export interface FraudAlertFilters {
    status?: FraudAlertStatus;
    riskLevel?: FraudRiskLevel;
    type?: FraudAlertType;
    startDate?: string;
    endDate?: string;
    assignedTo?: string;
    search?: string;
}

// ==================== API Responses ====================

export interface FraudResponse<T> {
    success: boolean;
    data: T;
}

export interface PaginatedFraudResponse<T> extends FraudResponse<T> {
    pagination: {
        page: number;
        limit: number;
        total: number;
    };
}

// ==================== Constants ====================

export const FRAUD_ALERT_TYPE_LABELS: Record<FraudAlertType, string> = {
    multiple_addresses: 'Multiple Delivery Addresses',
    high_value_cod: 'High-Value COD Order',
    suspicious_velocity: 'Suspicious Order Velocity',
    fake_address: 'Fake/Invalid Address',
    repeated_failures: 'Repeated Delivery Failures',
    unusual_pattern: 'Unusual Ordering Pattern',
    blacklisted_customer: 'Blacklisted Customer',
    payment_mismatch: 'Payment Information Mismatch',
    location_anomaly: 'Location Anomaly',
};

export const RISK_LEVEL_COLORS: Record<FraudRiskLevel, string> = {
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
};

export const ALERT_STATUS_COLORS: Record<FraudAlertStatus, string> = {
    new: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    investigating: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    false_positive: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    confirmed_fraud: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};
