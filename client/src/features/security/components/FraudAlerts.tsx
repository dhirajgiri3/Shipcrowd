/**
 * FraudAlerts Component
 * 
 * Displays a list of security alerts with severity indicators and resolution actions.
 */

'use client';

import { useState } from 'react';
import { useFraudAlerts, useResolveAlert } from '@/src/core/api/hooks/security/useSecurity';
import { AlertTriangle, CheckCircle, XCircle, ShieldAlert, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { cn, formatDate } from '@/src/lib/utils';
import { Button, Card, Badge, Loader } from '@/src/components/ui';
import type { SecurityFraudAlert as FraudAlert, FraudSeverity } from '@/src/types/security';

export function FraudAlerts() {
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'resolved'>('active');

    // FETCH DATA
    const { data: alerts, isLoading } = useFraudAlerts(filterStatus === 'all' ? undefined : filterStatus);
    const { mutate: resolveAlert, isPending: isResolving } = useResolveAlert();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader variant="spinner" />
            </div>
        );
    }

    // HELPER: Severity Badge Color
    const getSeverityColor = (severity: FraudSeverity) => {
        switch (severity) {
            case 'high': return 'destructive';
            case 'medium': return 'warning';
            case 'low': return 'secondary'; // or 'info' if available
            default: return 'outline';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header / Filter */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-[var(--primary-blue)]" />
                    Security Alerts
                </h2>
                <div className="flex gap-2">
                    {(['active', 'resolved', 'all'] as const).map((status) => (
                        <Button
                            key={status}
                            variant={filterStatus === status ? 'primary' : 'ghost'}
                            size="sm"
                            onClick={() => setFilterStatus(status)}
                            className="capitalize"
                        >
                            {status}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Alerts List */}
            <div className="grid gap-4">
                {alerts?.map((alert) => (
                    <AlertCard
                        key={alert.id}
                        alert={alert}
                        onResolve={(action) => resolveAlert({ alertId: alert.id, action })}
                        isProcessing={isResolving}
                    />
                ))}

                {alerts?.length === 0 && (
                    <div className="text-center py-12 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                        <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
                        <h3 className="text-lg font-medium text-[var(--text-primary)]">No alerts found</h3>
                        <p className="text-[var(--text-muted)]">System is monitoring for suspicious activity.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function AlertCard({ alert, onResolve, isProcessing }: {
    alert: FraudAlert;
    onResolve: (action: 'resolve' | 'dismiss') => void;
    isProcessing: boolean;
}) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <Card className={cn(
            "group overflow-hidden transition-all duration-200 border-l-4",
            alert.severity === 'high' ? "border-l-red-500" :
                alert.severity === 'medium' ? "border-l-yellow-500" : "border-l-blue-500"
        )}>
            <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                    {/* Icon & Main Info */}
                    <div className="flex items-start gap-4 flex-1">
                        <div className={cn(
                            "p-2 rounded-lg mt-1",
                            alert.severity === 'high' ? "bg-red-100 text-red-600 dark:bg-red-900/20" :
                                alert.severity === 'medium' ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20" :
                                    "bg-blue-100 text-blue-600 dark:bg-blue-900/20"
                        )}>
                            <AlertTriangle className="w-5 h-5" />
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-[var(--text-primary)]">{alert.reason}</h3>
                                <Badge variant={
                                    alert.severity === 'high' ? 'destructive' :
                                        alert.severity === 'medium' ? 'warning' : 'secondary'
                                } className="uppercase text-[10px] tracking-wider">
                                    {alert.severity}
                                </Badge>
                                {alert.status !== 'active' && (
                                    <Badge variant="outline" className="capitalize text-[var(--text-muted)]">
                                        {alert.status}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-sm text-[var(--text-secondary)] mb-2">
                                Order #{alert.orderId} • Risk Score: <span className={cn(
                                    "font-medium",
                                    alert.score > 80 ? "text-red-600" : "text-yellow-600"
                                )}>{alert.score}/100</span>
                            </p>
                            <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatDate(alert.detectedAt)}
                                </span>
                                <span>Customer: {alert.customerName}</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-end gap-2">
                        {alert.status === 'active' ? (
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onResolve('dismiss')}
                                    disabled={isProcessing}
                                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                >
                                    Dismiss
                                </Button>
                                <Button
                                    size="sm"
                                    // Using standard 'default' variant or custom if defined. 
                                    // 'success' might not be in standard variants, using style overrides if needed.
                                    className="bg-green-600 hover:bg-green-700 text-white border-transparent"
                                    onClick={() => onResolve('resolve')}
                                    disabled={isProcessing}
                                >
                                    Refuse Order
                                </Button>
                            </div>
                        ) : (
                            <span className="text-sm text-[var(--text-muted)] italic">
                                Action taken {alert.resolvedAt ? formatDate(alert.resolvedAt) : ''}
                            </span>
                        )}

                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 mt-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            {isExpanded ? 'Hide Details' : 'View Details'}
                            {isExpanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                        </Button>
                    </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] grid grid-cols-1 md:grid-cols-2 gap-4 text-sm animate-fade-in">
                        <div>
                            <p className="font-medium text-[var(--text-secondary)] mb-1">Customer Details</p>
                            <div className="bg-[var(--bg-secondary)] p-3 rounded-md space-y-1">
                                <p><span className="text-[var(--text-muted)]">Name:</span> {alert.customerName}</p>
                                <p><span className="text-[var(--text-muted)]">Phone:</span> {alert.customerPhone}</p>
                                <p><span className="text-[var(--text-muted)]">Order Amount:</span> ₹{alert.amount.toLocaleString()}</p>
                            </div>
                        </div>
                        <div>
                            <p className="font-medium text-[var(--text-secondary)] mb-1">Investigation Data</p>
                            <div className="bg-[var(--bg-secondary)] p-3 rounded-md space-y-1">
                                {Object.entries(alert.details || {}).map(([key, value]) => (
                                    <p key={key}><span className="text-[var(--text-muted)] capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span> {String(value)}</p>
                                ))}
                                <p><span className="text-[var(--text-muted)]">System Decision:</span> {alert.score > 80 ? 'Block Recommended' : 'Manual Review'}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
}
