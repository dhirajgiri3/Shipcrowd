/**
 * Security & Fraud Detection Type Definitions
 */

export type FraudSeverity = 'high' | 'medium' | 'low';
export type FraudAlertStatus = 'active' | 'resolved' | 'dismissed';
export type FraudRuleType = 'rto_probability' | 'order_amount' | 'velocity' | 'address' | 'ip_reputation';

export interface FraudAlert {
    id: string;
    orderId: string;
    severity: FraudSeverity;
    reason: string;
    score: number; // 0-100
    status: FraudAlertStatus;
    detectedAt: string;
    resolvedAt?: string;
    resolvedBy?: string;
    customerName: string;
    customerPhone: string;
    amount: number;
    details?: Record<string, any>;
}

export interface FraudRule {
    id: string;
    type: FraudRuleType;
    name: string;
    description: string;
    isEnabled: boolean;
    threshold: number;
    action: 'flag' | 'block' | 'review';
    severity: FraudSeverity;
}

export interface UpdateFraudRulePayload {
    ruleId: string;
    isEnabled: boolean;
    threshold?: number;
    action?: 'flag' | 'block' | 'review';
}

export interface ResolveAlertPayload {
    alertId: string;
    action: 'resolve' | 'dismiss';
    notes?: string;
}
