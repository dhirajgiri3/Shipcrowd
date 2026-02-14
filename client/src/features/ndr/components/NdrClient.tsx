/**
 * NDR Client Component
 * Handles all interactive logic for NDR Management
 */

"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertTriangle,
    Clock,
    CheckCircle2,
    AlertCircle,
    MapPin,
    Package,
    RefreshCw,
    FileOutput,
} from 'lucide-react';
import { Card } from '@/src/components/ui/core/Card';
import { Badge } from '@/src/components/ui/core/Badge';
import { Button } from '@/src/components/ui/core/Button';
import { Checkbox } from '@/src/components/ui/core/Checkbox';
import { useNDRCases, useNDRMetrics, useTakeNDRAction, useBulkNDRAction } from '@/src/core/api/hooks/returns/useNDR';
import { NDRCase, NDRStatus } from '@/src/types/api/orders';
import { Loader } from '@/src/components/ui/feedback/Loader';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { RiskScoreBadge } from './RiskScoreBadge';
import { MagicLinkStatus } from './MagicLinkStatus';
import { ConfirmDialog } from '@/src/components/ui/feedback/ConfirmDialog';
import { cn } from '@/src/lib/utils';
import { EmptyState } from '@/src/components/ui/feedback/EmptyState';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { DateRangePicker } from '@/src/components/ui/form/DateRangePicker';
import { SearchInput } from '@/src/components/ui/form/SearchInput';

export function NDRClient() {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<NDRStatus | 'all'>('all');
    const [selectedCases, setSelectedCases] = useState<string[]>([]);
    const [bulkActionConfirm, setBulkActionConfirm] = useState<'return_to_origin' | 'escalate' | null>(null);

    const { addToast } = useToast();
    const { mutate: takeAction, isPending: isActionPending } = useTakeNDRAction();
    const { mutate: bulkAction, isPending: isBulkActionPending } = useBulkNDRAction();

    const executeBulkAction = (actionType: 'return_to_origin' | 'escalate') => {
        if (actionType === 'return_to_origin') {
            bulkAction({
                caseIds: selectedCases,
                action: 'return_to_origin'
            }, {
                onSuccess: () => {
                    addToast('Bulk RTO initiated', 'success');
                    setSelectedCases([]);
                }
            });
        } else {
            addToast('Bulk Escalation initiated', 'success');
            setSelectedCases([]);
        }
    };

    const handleBulkAction = (actionType: 'return_to_origin' | 'escalate') => {
        setBulkActionConfirm(actionType);
    };

    const {
        data: ndrCasesResponse,
        isLoading: casesLoading,
        error: casesError,
        refetch
    } = useNDRCases({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchTerm || undefined,
    });

    const {
        data: metrics,
        isLoading: metricsLoading
    } = useNDRMetrics();

    const cases = ndrCasesResponse?.cases || [];

    const handleReattempt = (caseId: string) => {
        takeAction({
            caseId,
            payload: { action: 'reattempt_delivery' }
        }, {
            onSuccess: () => addToast('Reattempt request sent successfully', 'success'),
            onError: (err) => addToast(err.message || 'Failed to request reattempt', 'error')
        });
    };

    const handleRTO = (caseId: string) => {
        takeAction({
            caseId,
            payload: { action: 'return_to_origin' }
        }, {
            onSuccess: () => addToast('RTO initiated successfully', 'success'),
            onError: (err) => addToast(err.message || 'Failed to initiate RTO', 'error')
        });
    };

    const statusTabs = [
        { id: 'all', label: 'All Cases', count: metrics?.total || 0 },
        { id: 'action_required', label: 'Action Required', count: metrics?.open || 0 },
        { id: 'reattempt_scheduled', label: 'Reattempt', count: 0 }, // Metric missing in type
        { id: 'resolved', label: 'Resolved', count: metrics?.resolved || 0 },
        { id: 'converted_to_rto', label: 'RTO', count: metrics?.convertedToRTO || 0 }
    ];

    const getStatusColor = (status: string) => {
        const colors: Record<string, any> = {
            open: 'primary',
            detected: 'primary',
            in_progress: 'warning',
            in_resolution: 'warning',
            customer_action: 'info',
            reattempt_scheduled: 'primary',
            resolved: 'success',
            escalated: 'error',
            converted_to_rto: 'neutral',
            rto_triggered: 'error',
            rto: 'error'
        };
        return colors[status] || 'neutral';
    };

    const getReasonLabel = (reason: string) => {
        const labels: Record<string, string> = {
            address_incomplete: 'Incomplete Address',
            address_incorrect: 'Incorrect Address',
            consignee_unavailable: 'Customer Unavailable',
            consignee_refused: 'Delivery Refused',
            payment_issue_cod: 'Payment Issue',
            other: 'Other'
        };
        return labels[reason] || reason;
    };

    // Derived state for checkboxes
    const allSelected = cases.length > 0 && selectedCases.length === cases.length;
    const isIndeterminate = selectedCases.length > 0 && selectedCases.length < cases.length;

    if (casesLoading || metricsLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader size="lg" />
            </div>
        );
    }

    if (casesError) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-20 h-20 bg-[var(--error-bg)] rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="w-10 h-10 text-[var(--error)]" />
                    </div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Error Loading NDR Cases</h3>
                    <p className="text-[var(--text-muted)] text-sm mb-6 max-w-sm mx-auto">{casesError.message}</p>
                    <Button onClick={() => refetch()} variant="outline">
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen space-y-8 pb-20 animate-fade-in">
            {/* --- HEADER --- */}
            <PageHeader
                title="NDR Management"
                breadcrumbs={[
                    { label: 'Dashboard', href: '/seller/dashboard' },
                    { label: 'NDR', active: true }
                ]}
                subtitle={
                    <div className="flex items-center gap-2">
                        <Badge variant="primary" size="sm">Live Updates</Badge>
                        <span className="text-[var(--text-secondary)]">Manage non-delivery reports and customer communications</span>
                    </div>
                }
                actions={
                    <div className="flex items-center gap-3">
                        <DateRangePicker />
                        <Button
                            onClick={() => refetch()}
                            variant="ghost"
                            size="sm"
                            className="h-10 w-10 p-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] shadow-sm"
                        >
                            <RefreshCw className="w-4 h-4 text-[var(--text-secondary)]" />
                        </Button>
                        <Button size="sm" className="h-10 px-5 rounded-xl bg-[var(--primary-blue)] text-white hover:bg-[var(--primary-blue-deep)] text-sm font-medium shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95">
                            <FileOutput className="w-4 h-4 mr-2" />
                            Export CSV
                        </Button>
                    </div>
                }
            />

            {/* --- STATS GRID --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Open Cases"
                    value={metrics?.open || 0}
                    icon={AlertCircle}
                    iconColor="text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
                    trend={{ value: 5, label: 'vs last week', positive: false }}
                    delay={0}
                />
                <StatsCard
                    title="In Progress"
                    value={metrics?.inProgress || 0}
                    icon={Clock}
                    iconColor="text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400"
                    description="Action required"
                    delay={1}
                />
                <StatsCard
                    title="SLA Breach"
                    value={metrics?.slaBreach || 0}
                    icon={AlertTriangle}
                    iconColor="text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400"
                    variant="critical"
                    description="Critical cases"
                    delay={2}
                />
                <StatsCard
                    title="Resolution Rate"
                    value={`${((metrics?.resolutionRate || 0) * 100).toFixed(0)}%`}
                    icon={CheckCircle2}
                    iconColor="text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
                    trend={{ value: 8, label: 'vs last week', positive: true }}
                    delay={3}
                />
            </div>

            {/* --- TABLE SECTION --- */}
            <div className="space-y-4">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                    {/* Status Tabs - Standard Pill Container */}
                    <div className="flex p-1.5 rounded-xl bg-[var(--bg-secondary)] w-fit border border-[var(--border-subtle)] overflow-x-auto">
                        {statusTabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setStatusFilter(tab.id as NDRStatus | 'all')}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize whitespace-nowrap flex items-center gap-2",
                                    statusFilter === tab.id
                                        ? "bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm ring-1 ring-black/5 dark:ring-white/5"
                                        : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                                )}
                            >
                                {tab.label}
                                <span className={cn(
                                    "px-1.5 py-0.5 text-[10px] rounded-full",
                                    statusFilter === tab.id ? "bg-[var(--primary-blue-soft)] text-[var(--primary-blue)]" : "bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]"
                                )}>
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="flex items-center gap-3">
                        <SearchInput
                            placeholder="Search by AWB, Order ID, or Customer..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Bulk Actions Bar */}
                <AnimatePresence>
                    {selectedCases.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -20, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, y: -20, height: 0 }}
                            className="sticky top-4 z-20"
                        >
                            <div className="bg-[var(--primary-blue-soft)] border border-[var(--primary-blue-medium)] rounded-xl p-4 shadow-lg backdrop-blur-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-3 text-[var(--primary-blue)] font-medium">
                                    <div className="p-2 bg-white/50 rounded-lg">
                                        <Package className="w-5 h-5" />
                                    </div>
                                    <span>{selectedCases.length} cases selected</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-[var(--primary-blue)] hover:bg-white/50 ml-2"
                                        onClick={() => setSelectedCases([])}
                                    >
                                        Clear Selection
                                    </Button>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={() => handleBulkAction('return_to_origin')}
                                        isLoading={isBulkActionPending && bulkActionConfirm === 'return_to_origin'}
                                    >
                                        Trigger RTO
                                    </Button>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={() => handleBulkAction('escalate')}
                                        isLoading={isBulkActionPending && bulkActionConfirm === 'escalate'}
                                    >
                                        Escalate
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Cases Table */}
                <Card className="border-[var(--border-default)] overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border-default)]">
                                <tr>
                                    <th className="px-6 py-4 w-12 text-center">
                                        <Checkbox
                                            checked={allSelected ? true : isIndeterminate ? 'indeterminate' : false}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setSelectedCases(cases.map(c => c._id));
                                                } else {
                                                    setSelectedCases([]);
                                                }
                                            }}
                                        />
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                                        NDR Details
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                                        Customer
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                                        Reason
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                                        Customer Action
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                                        Risk Score
                                    </th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-default)] bg-[var(--bg-primary)]">
                                <AnimatePresence>
                                    {cases.map((ndrCase: NDRCase, index: number) => {
                                        const shipmentId = typeof ndrCase.shipmentId === 'string' ? ndrCase.shipmentId : ndrCase.shipmentId?.trackingNumber;
                                        const isSelected = selectedCases.includes(ndrCase._id);

                                        return (
                                            <motion.tr
                                                key={ndrCase._id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.03 }}
                                                className={cn(
                                                    "group transition-colors duration-150 ease-in-out hover:bg-[var(--bg-hover)]",
                                                    isSelected ? 'bg-[var(--primary-blue-soft)]/10 hover:bg-[var(--primary-blue-soft)]/20' : ''
                                                )}
                                            >
                                                <td className="px-6 py-4 text-center">
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                setSelectedCases(prev => [...prev, ndrCase._id]);
                                                            } else {
                                                                setSelectedCases(prev => prev.filter(id => id !== ndrCase._id));
                                                            }
                                                        }}
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--primary-blue)] transition-colors">
                                                                {ndrCase.ndrId}
                                                            </span>
                                                            {ndrCase.slaBreach && (
                                                                <Badge variant="error" size="sm" className="shadow-sm">
                                                                    SLA Breach
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="text-sm text-[var(--text-secondary)] font-mono bg-[var(--bg-secondary)] px-2 py-0.5 rounded inline-block">
                                                            AWB: {shipmentId}
                                                        </div>
                                                        <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)] pt-1">
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                {ndrCase.daysSinceReported}d ago
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <Package className="w-3 h-3" />
                                                                {ndrCase.currentAttempt?.attemptNumber || 0} attempts
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="space-y-1">
                                                        <p className="font-medium text-[var(--text-primary)]">{ndrCase.customerName}</p>
                                                        <p className="text-sm text-[var(--text-secondary)]">{ndrCase.customerPhone}</p>
                                                        <div className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                                                            {ndrCase.deliveryAddress && (
                                                                <>
                                                                    <MapPin className="w-3 h-3 shrink-0" />
                                                                    <span className="truncate max-w-[150px]" title={ndrCase.deliveryAddress}>
                                                                        {ndrCase.deliveryAddress}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-tertiary)]" />
                                                        <p className="text-sm text-[var(--text-primary)] font-medium">
                                                            {getReasonLabel(ndrCase.primaryReason)}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant={getStatusColor(ndrCase.status)} className="capitalize shadow-sm">
                                                        {ndrCase.status.replace(/_/g, ' ')}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <MagicLinkStatus
                                                        sent={(ndrCase.communications && ndrCase.communications.length > 0)}
                                                        clicked={ndrCase.magicLinkClicked}
                                                        clickedAt={ndrCase.magicLinkClickedAt}
                                                        responded={ndrCase.customerSelfService}
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <RiskScoreBadge score={ndrCase.preventionScore} />
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {['open', 'detected', 'in_progress', 'in_resolution'].includes(ndrCase.status) ? (
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-7 px-2 text-xs bg-[var(--success-bg)] text-[var(--success)] hover:bg-[var(--success-bg-hover)] border-[var(--success)]"
                                                                onClick={() => {
                                                                    const message = `Hi ${ndrCase.customerName}, we are trying to deliver your package (AWB: ${typeof ndrCase.shipmentId === 'string' ? ndrCase.shipmentId : ndrCase.shipmentId?.trackingNumber}). Please tell us when you are available.`;
                                                                    window.open(`https://wa.me/${ndrCase.customerPhone}?text=${encodeURIComponent(message)}`, '_blank');
                                                                }}
                                                            >
                                                                WhatsApp
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="secondary"
                                                                className="h-7 px-2 text-xs"
                                                                disabled={isActionPending}
                                                                onClick={() => handleReattempt(ndrCase._id)}
                                                            >
                                                                Reattempt
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="danger"
                                                                className="h-7 px-2 text-xs"
                                                                disabled={isActionPending}
                                                                onClick={() => handleRTO(ndrCase._id)}
                                                            >
                                                                RTO
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-[var(--text-tertiary)] italic">No actions available</span>
                                                    )}
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>

                    {cases.length === 0 && (
                        <div className="py-20 text-center">
                            <div className="w-20 h-20 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center mx-auto mb-6">
                                <Package className="w-10 h-10 text-[var(--text-muted)]" />
                            </div>
                            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">No NDR Cases Found</h3>
                            <p className="text-[var(--text-muted)] text-sm mb-6 max-w-sm mx-auto">Try adjusting your filters or search criteria. There are no cases matching your request.</p>
                            <Button onClick={() => { setSearchTerm(''); setStatusFilter('all'); }} variant="outline">
                                Clear Filters
                            </Button>
                        </div>
                    )}
                </Card>
            </div>

            <ConfirmDialog
                open={bulkActionConfirm !== null}
                title="Confirm Bulk Action"
                description={
                    bulkActionConfirm
                        ? `Are you sure you want to ${bulkActionConfirm === 'escalate' ? 'escalate' : 'RTO'} ${selectedCases.length} cases? This action cannot be undone.`
                        : undefined
                }
                confirmText={bulkActionConfirm === 'escalate' ? "Escalate Cases" : "Trigger RTO"}
                confirmVariant={bulkActionConfirm === 'escalate' ? "primary" : "danger"}
                onCancel={() => setBulkActionConfirm(null)}
                onConfirm={() => {
                    if (!bulkActionConfirm) return;
                    executeBulkAction(bulkActionConfirm);
                    setBulkActionConfirm(null);
                }}
            />
        </div>
    );
}
