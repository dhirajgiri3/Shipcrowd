/**
 * Fraud Detection Dashboard
 * 
 * Monitor and investigate fraud alerts with risk-based prioritization.
 */

'use client';

import { useState } from 'react';
import { useFraudAlerts, useFraudStats, useInvestigateAlert, useBlockEntity } from '@/src/core/api/hooks/useFraud';
import { Shield, AlertTriangle, CheckCircle, XCircle, Eye, Ban, User, Mail, Phone, MapPin } from 'lucide-react';
import { cn, formatDateTime, formatCurrency } from '@/src/lib/utils';
import type { FraudAlert, FraudAlertFilters, FraudRiskLevel, FraudAlertStatus, BlockEntityPayload } from '@/src/types/api/fraud.types';
import { FRAUD_ALERT_TYPE_LABELS, RISK_LEVEL_COLORS, ALERT_STATUS_COLORS } from '@/src/types/api/fraud.types';

export default function FraudDetectionPage() {
    const [filters, setFilters] = useState<FraudAlertFilters>({});
    const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);

    const { data: alertsData, isLoading } = useFraudAlerts(filters);
    const { data: stats } = useFraudStats();
    const { mutate: investigate } = useInvestigateAlert();
    const { mutate: blockEntity } = useBlockEntity();

    const handleStatusChange = (alertId: string, status: FraudAlertStatus) => {
        investigate({
            alertId,
            action: 'change_status',
            payload: { status },
        });
    };

    const handleBlockCustomer = (alert: FraudAlert) => {
        const payload: BlockEntityPayload = {
            type: 'customer',
            value: alert.metadata.customerEmail || alert.metadata.customerPhone || '',
            reason: `Blocked due to ${alert.type} alert`,
            permanent: false,
        };
        blockEntity(payload);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-600 rounded-lg flex items-center justify-center">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Fraud Detection</h1>
                            <p className="text-gray-600 dark:text-gray-400">Monitor and investigate suspicious activities</p>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <StatCard
                            label="Total Alerts"
                            value={stats.total}
                            trend={stats.recentTrend.change}
                            icon={AlertTriangle}
                            color="blue"
                        />
                        <StatCard
                            label="Critical Risk"
                            value={stats.byRiskLevel.critical}
                            icon={XCircle}
                            color="red"
                        />
                        <StatCard
                            label="Investigating"
                            value={stats.byStatus.investigating}
                            icon={Eye}
                            color="yellow"
                        />
                        <StatCard
                            label="Resolved"
                            value={stats.byStatus.resolved}
                            icon={CheckCircle}
                            color="green"
                        />
                    </div>
                )}

                {/* Filters */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Risk Level</label>
                            <select
                                value={filters.riskLevel || ''}
                                onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value as FraudRiskLevel || undefined })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                            >
                                <option value="">All Levels</option>
                                <option value="critical">Critical</option>
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                            <select
                                value={filters.status || ''}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value as FraudAlertStatus || undefined })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                            >
                                <option value="">All Statuses</option>
                                <option value="new">New</option>
                                <option value="investigating">Investigating</option>
                                <option value="resolved">Resolved</option>
                                <option value="false_positive">False Positive</option>
                                <option value="confirmed_fraud">Confirmed Fraud</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date</label>
                            <input
                                type="date"
                                value={filters.startDate || ''}
                                onChange={(e) => setFilters({ ...filters, startDate: e.target.value || undefined })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date</label>
                            <input
                                type="date"
                                value={filters.endDate || ''}
                                onChange={(e) => setFilters({ ...filters, endDate: e.target.value || undefined })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                            />
                        </div>
                    </div>
                </div>

                {/* Alerts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Alerts List */}
                    <div className="space-y-4">
                        {alertsData?.data.map((alert) => (
                            <AlertCard
                                key={alert.id}
                                alert={alert}
                                isSelected={selectedAlert?.id === alert.id}
                                onClick={() => setSelectedAlert(alert)}
                                onStatusChange={(status) => handleStatusChange(alert.id, status)}
                            />
                        ))}
                    </div>

                    {/* Investigation Panel */}
                    <div className="lg:sticky lg:top-4 lg:self-start">
                        {selectedAlert ? (
                            <InvestigationPanel
                                alert={selectedAlert}
                                onStatusChange={(status) => handleStatusChange(selectedAlert.id, status)}
                                onBlockCustomer={() => handleBlockCustomer(selectedAlert)}
                            />
                        ) : (
                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                                <Eye className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                <p className="text-gray-600 dark:text-gray-400">Select an alert to view details</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ==================== Components ====================

function StatCard({ label, value, trend, icon: Icon, color }: {
    label: string;
    value: number;
    trend?: number;
    icon: any;
    color: 'blue' | 'red' | 'yellow' | 'green';
}) {
    const colorClasses = {
        blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
        red: 'bg-red-100 dark:bg-red-900/30 text-red-600',
        yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600',
        green: 'bg-green-100 dark:bg-green-900/30 text-green-600',
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</span>
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', colorClasses[color])}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
            {trend !== undefined && (
                <p className={cn('text-sm mt-1', trend > 0 ? 'text-red-600' : 'text-green-600')}>
                    {trend > 0 ? '+' : ''}{trend.toFixed(1)}% from last period
                </p>
            )}
        </div>
    );
}

function AlertCard({ alert, isSelected, onClick, onStatusChange }: {
    alert: FraudAlert;
    isSelected: boolean;
    onClick: () => void;
    onStatusChange: (status: FraudAlertStatus) => void;
}) {
    return (
        <div
            onClick={onClick}
            className={cn(
                'bg-white dark:bg-gray-800 rounded-xl border-2 p-5 cursor-pointer transition-all',
                isSelected
                    ? 'border-primary-500 ring-2 ring-primary-200 dark:ring-primary-800'
                    : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
            )}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span className={cn('px-2 py-1 rounded text-xs font-medium', RISK_LEVEL_COLORS[alert.riskLevel])}>
                            {alert.riskLevel}
                        </span>
                        <span className={cn('px-2 py-1 rounded text-xs font-medium', ALERT_STATUS_COLORS[alert.status])}>
                            {alert.status.replace('_', ' ')}
                        </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{alert.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{alert.description}</p>
                </div>
                <div className="text-right ml-4">
                    <div className="text-2xl font-bold text-red-600">{alert.riskScore}</div>
                    <div className="text-xs text-gray-500">Risk Score</div>
                </div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700 pt-3 mt-3">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Type: {FRAUD_ALERT_TYPE_LABELS[alert.type]}</p>
                <p className="text-xs text-gray-400">{formatDateTime(alert.createdAt)}</p>
            </div>
        </div>
    );
}

function InvestigationPanel({ alert, onStatusChange, onBlockCustomer }: {
    alert: FraudAlert;
    onStatusChange: (status: FraudAlertStatus) => void;
    onBlockCustomer: () => void;
}) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Investigation Details</h2>

            {/* Customer Info */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Customer Information</h3>
                <div className="space-y-2">
                    {alert.metadata.customerName && (
                        <div className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-900 dark:text-white">{alert.metadata.customerName}</span>
                        </div>
                    )}
                    {alert.metadata.customerEmail && (
                        <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-900 dark:text-white">{alert.metadata.customerEmail}</span>
                        </div>
                    )}
                    {alert.metadata.customerPhone && (
                        <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-900 dark:text-white">{alert.metadata.customerPhone}</span>
                        </div>
                    )}
                    {alert.metadata.location && (
                        <div className="flex items-center gap-2 text-sm">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-900 dark:text-white">{alert.metadata.location}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Fraud Indicators */}
            <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Fraud Indicators</h3>
                <div className="space-y-2">
                    {alert.indicators.map((indicator) => (
                        <div key={indicator.id} className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <AlertTriangle className={cn(
                                'w-4 h-4 mt-0.5 flex-shrink-0',
                                indicator.severity === 'critical' ? 'text-red-600' :
                                    indicator.severity === 'high' ? 'text-orange-600' : 'text-yellow-600'
                            )} />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{indicator.description}</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                    Value: {indicator.value}
                                    {indicator.threshold && ` (Threshold: ${indicator.threshold})`}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
                <select
                    value={alert.status}
                    onChange={(e) => onStatusChange(e.target.value as FraudAlertStatus)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                >
                    <option value="new">New</option>
                    <option value="investigating">Investigating</option>
                    <option value="resolved">Resolved</option>
                    <option value="false_positive">False Positive</option>
                    <option value="confirmed_fraud">Confirmed Fraud</option>
                </select>

                <button
                    onClick={onBlockCustomer}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                    <Ban className="w-4 h-4" />
                    Block Customer
                </button>
            </div>
        </div>
    );
}
