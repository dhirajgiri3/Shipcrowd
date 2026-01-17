/**
 * useSecurity Hooks
 * 
 * Data fetching and mutation hooks for Security & Fraud modules.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SecurityFraudAlert as FraudAlert, SecurityFraudRule as FraudRule, UpdateFraudRulePayload, ResolveAlertPayload } from '@/src/types/security';

// Mock Data
const MOCK_ALERTS: FraudAlert[] = [
    {
        id: 'alt_1',
        orderId: 'ORD-2024-001',
        severity: 'high',
        reason: 'High RTO Probability (85%)',
        score: 85,
        status: 'active',
        detectedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
        customerName: 'Rahul Sharma',
        customerPhone: '+91 98765 43210',
        amount: 2499,
        details: { rtoHistory: '3/5 orders returned' }
    },
    {
        id: 'alt_2',
        orderId: 'ORD-2024-002',
        severity: 'medium',
        reason: 'Suspicious IP Address',
        score: 65,
        status: 'active',
        detectedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        customerName: 'Amit Verma',
        customerPhone: '+91 99887 76655',
        amount: 12500,
        details: { ip: '45.23.12.99', location: 'Different State' }
    },
    {
        id: 'alt_3',
        orderId: 'ORD-2024-003',
        severity: 'low',
        reason: 'Unusual Order Velocity',
        score: 45,
        status: 'resolved',
        detectedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
        resolvedAt: new Date().toISOString(),
        customerName: 'Priya Singh',
        customerPhone: '+91 88776 65544',
        amount: 899,
    }
];

const MOCK_RULES: FraudRule[] = [
    {
        id: 'rule_1',
        type: 'rto_probability',
        name: 'High RTO Risk',
        description: 'Flag orders efficiently predicted to be returned (RTO).',
        isEnabled: true,
        threshold: 70,
        action: 'review',
        severity: 'high'
    },
    {
        id: 'rule_2',
        type: 'order_amount',
        name: 'High Value Order',
        description: 'Flag orders exceeding a specific monetary value.',
        isEnabled: true,
        threshold: 10000,
        action: 'flag',
        severity: 'medium'
    },
    {
        id: 'rule_3',
        type: 'velocity',
        name: 'Order Velocity',
        description: 'Flag multiple orders from same customer in short duration.',
        isEnabled: false,
        threshold: 3,
        action: 'block',
        severity: 'high'
    }
];

// Hooks

export function useFraudAlerts(status?: string) {
    return useQuery({
        queryKey: ['security', 'alerts', status],
        queryFn: async () => {
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 800));
            if (status && status !== 'all') {
                return MOCK_ALERTS.filter(alert => alert.status === status);
            }
            return MOCK_ALERTS;
        }
    });
}

export function useFraudRules() {
    return useQuery({
        queryKey: ['security', 'rules'],
        queryFn: async () => {
            await new Promise(resolve => setTimeout(resolve, 600));
            return MOCK_RULES;
        }
    });
}

export function useUpdateFraudRule() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: UpdateFraudRulePayload) => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return { success: true, ...payload };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['security', 'rules'] });
        }
    });
}

export function useResolveAlert() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: ResolveAlertPayload) => {
            await new Promise(resolve => setTimeout(resolve, 800));
            return { success: true, id: payload.alertId };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['security', 'alerts'] });
        }
    });
}
