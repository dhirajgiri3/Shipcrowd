/**
 * NDR Client Component
 * Handles all interactive logic for NDR Management
 */

"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    AlertTriangle,
    Clock,
    CheckCircle2,
    TrendingUp,
    Phone,
    Mail,
    MessageSquare,
    AlertCircle,
    MapPin,
    Package,
    Search,
    MoreVertical,
    Filter
} from 'lucide-react';
import { Card, CardContent } from '@/src/components/ui/core/Card';
import { Badge } from '@/src/components/ui/core/Badge';
import { mockNDRCases, mockNDRMetrics } from '@/src/lib/mockData/enhanced';
import { useNDRCases, useNDRMetrics } from '@/src/core/api/hooks/returns/useNDR';

export function NDRClient() {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [riskFilter, setRiskFilter] = useState<string>('all');

    // --- REAL API INTEGRATION ---
    // WARNING: Backend endpoint mismatch detected!
    // - Frontend hook calls: /api/ndr/cases (doesn't exist)
    // - Backend has: /ndr/events (different endpoint)
    // - Mock data structure != Real API NDRCase type structure
    // TODO: Either fix hook to call /ndr/events OR create /api/ndr/cases endpoint
    // TODO: Align mock data structure with real NDRCase type
    const {
        data: ndrCasesResponse,
        isLoading: casesLoading,
        error: casesError
    } = useNDRCases({
        status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
        search: searchTerm || undefined,
    });

    const {
        data: metricsResponse,
        isLoading: metricsLoading
    } = useNDRMetrics();

    // Use real data if available, otherwise fallback to mock
    // Note: Mock data has different structure (awb, rtoRisk, etc.) vs real API (ndrId, shipmentId, etc.)
    // Using 'as any[]' because mock structure doesn't match real NDRCase type
    const cases: any[] = (ndrCasesResponse?.cases as any[]) || mockNDRCases;
    const metrics: any = metricsResponse || mockNDRMetrics;
    const isUsingMockData = !ndrCasesResponse?.cases;

    // Filter cases
    const filteredCases = cases.filter((c: any) => {
        const matchesSearch = c.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.awb?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (typeof c.orderId === 'string' ? c.orderId : c.orderId?.orderNumber || '')?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
        const matchesRisk = riskFilter === 'all' || c.rtoRisk === riskFilter;
        return matchesSearch && matchesStatus && matchesRisk;
    });

    const statusTabs = [
        { id: 'all', label: 'All Cases', count: cases.length },
        { id: 'open', label: 'Open', count: cases.filter((c: any) => c.status === 'open').length },
        { id: 'in_progress', label: 'In Progress', count: cases.filter((c: any) => c.status === 'in_progress').length },
        { id: 'customer_action', label: 'Awaiting Customer', count: cases.filter((c: any) => c.status === 'customer_action').length },
        { id: 'escalated', label: 'Escalated', count: cases.filter((c: any) => c.status === 'escalated').length }
    ];

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            open: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
            in_progress: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400',
            customer_action: 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400',
            reattempt_scheduled: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400',
            resolved: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400',
            escalated: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400',
            converted_to_rto: 'bg-gray-100 text-gray-700 dark:bg-gray-950/30 dark:text-gray-400'
        };
        return colors[status] || colors.open;
    };

    const getRiskBadge = (risk: string) => {
        const badges = {
            low: { color: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400', label: 'Low Risk' },
            medium: { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400', label: 'Medium Risk' },
            high: { color: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400', label: 'High Risk' }
        };
        return badges[risk as keyof typeof badges] || badges.low;
    };

    const getReasonLabel = (reason: string) => {
        const labels: Record<string, string> = {
            address_incomplete: 'Incomplete Address',
            address_incorrect: 'Incorrect Address',
            consignee_unavailable: 'Customer Unavailable',
            refused_to_accept: 'Delivery Refused',
            customer_requested_reschedule: 'Reschedule Request',
            payment_issue: 'Payment Issue',
            consignee_shifted: 'Customer Relocated',
            out_of_delivery_area: 'Out of Area',
            other: 'Other'
        };
        return labels[reason] || reason;
    };

    return (
        <div className="min-h-screen bg-[var(--bg-secondary)]">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between"
                >
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[var(--primary-blue-soft)] flex items-center justify-center">
                                    <AlertCircle className="w-6 h-6 text-[var(--primary-blue)]" />
                                </div>
                                NDR Management
                            </h1>
                            {isUsingMockData && (
                                <span className="px-2 py-1 text-xs font-semibold rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                    ⚠️ Mock Data (API endpoint mismatch)
                                </span>
                            )}
                        </div>
                        <p className="text-[var(--text-secondary)] mt-2">
                            Manage non-delivery reports and customer communications
                        </p>
                    </div>
                </motion.div>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0 }}
                    >
                        <Card className="border-[var(--border-default)]">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center">
                                        <AlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <TrendingUp className="w-5 h-5 text-[var(--text-tertiary)]" />
                                </div>
                                <p className="text-[var(--text-secondary)] text-sm font-medium mb-1">Open Cases</p>
                                <p className="text-3xl font-bold text-[var(--text-primary)]">{metrics?.open || 0}</p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Card className="border-[var(--border-default)]">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-950/30 flex items-center justify-center">
                                        <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                                    </div>
                                </div>
                                <p className="text-[var(--text-secondary)] text-sm font-medium mb-1">In Progress</p>
                                <p className="text-3xl font-bold text-[var(--text-primary)]">{metrics?.inProgress || 0}</p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Card className="border-[var(--border-default)]">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
                                        <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                                    </div>
                                </div>
                                <p className="text-[var(--text-secondary)] text-sm font-medium mb-1">SLA Breach</p>
                                <p className="text-3xl font-bold text-red-600 dark:text-red-400">{metrics?.slaBreach || 0}</p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Card className="border-[var(--border-default)]">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-950/30 flex items-center justify-center">
                                        <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                                    </div>
                                </div>
                                <p className="text-[var(--text-secondary)] text-sm font-medium mb-1">Resolution Rate</p>
                                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                                    {((metrics?.resolutionRate || 0) * 100).toFixed(0)}%
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>

                {/* Filters & Search */}
                <Card className="border-[var(--border-default)]">
                    <CardContent className="p-4">
                        <div className="flex flex-col lg:flex-row gap-4">
                            {/* Search */}
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-tertiary)]" />
                                    <input
                                        type="text"
                                        placeholder="Search by AWB, Order ID, or Customer Name..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)] focus:border-transparent transition-all"
                                    />
                                </div>
                            </div>

                            {/* Risk Filter */}
                            <div className="flex items-center gap-2">
                                <Filter className="w-5 h-5 text-[var(--text-tertiary)]" />
                                <select
                                    value={riskFilter}
                                    onChange={(e) => setRiskFilter(e.target.value)}
                                    className="px-4 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)] focus:border-transparent transition-all"
                                >
                                    <option value="all">All Risk Levels</option>
                                    <option value="high">High Risk</option>
                                    <option value="medium">Medium Risk</option>
                                    <option value="low">Low Risk</option>
                                </select>
                            </div>
                        </div>

                        {/* Status Tabs */}
                        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[var(--border-default)]">
                            {statusTabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setStatusFilter(tab.id)}
                                    className={`px-4 py-2 rounded-xl font-medium transition-all ${statusFilter === tab.id
                                        ? 'bg-[var(--primary-blue)] text-white shadow-sm'
                                        : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                                        }`}
                                >
                                    {tab.label} <span className="ml-1.5 opacity-75">({tab.count})</span>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Cases Table */}
                <Card className="border-[var(--border-default)] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border-default)]">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                                        NDR Details
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                                        Customer
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                                        Reason
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                                        Risk
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-default)] bg-[var(--bg-primary)]">
                                {filteredCases.map((ndrCase: any, index: number) => (
                                    <motion.tr
                                        key={ndrCase.id || ndrCase._id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-[var(--text-primary)]">{ndrCase.id}</span>
                                                    {ndrCase.slaBreached && (
                                                        <Badge variant="error" className="text-xs">
                                                            SLA Breach
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="text-sm text-[var(--text-secondary)]">
                                                    AWB: {ndrCase.awb}
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {ndrCase.daysSinceNDR}d ago
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Package className="w-3 h-3" />
                                                        {ndrCase.attempts} attempts
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <p className="font-medium text-[var(--text-primary)]">{ndrCase.customerName}</p>
                                                <p className="text-sm text-[var(--text-secondary)]">{ndrCase.customerPhone}</p>
                                                <div className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                                                    <MapPin className="w-3 h-3" />
                                                    {ndrCase.address.city}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-[var(--text-primary)] font-medium">
                                                {getReasonLabel(ndrCase.reason)}
                                            </p>
                                            {ndrCase.lastCommunicationChannel && (
                                                <div className="flex items-center gap-1 mt-1 text-xs text-[var(--text-secondary)]">
                                                    {ndrCase.lastCommunicationChannel === 'whatsapp' && <MessageSquare className="w-3 h-3" />}
                                                    {ndrCase.lastCommunicationChannel === 'call' && <Phone className="w-3 h-3" />}
                                                    {ndrCase.lastCommunicationChannel === 'email' && <Mail className="w-3 h-3" />}
                                                    {ndrCase.customerCommunications} communications
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge className={getStatusColor(ndrCase.status)}>
                                                {ndrCase.status.replace(/_/g, ' ')}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge className={getRiskBadge(ndrCase.rtoRisk).color}>
                                                {getRiskBadge(ndrCase.rtoRisk).label}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">
                                                <MoreVertical className="w-5 h-5 text-[var(--text-tertiary)]" />
                                            </button>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredCases.length === 0 && (
                        <div className="text-center py-12 bg-[var(--bg-primary)]">
                            <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mx-auto mb-4">
                                <Package className="w-8 h-8 text-[var(--text-tertiary)]" />
                            </div>
                            <p className="text-[var(--text-secondary)] font-medium">No NDR cases found</p>
                            <p className="text-sm text-[var(--text-tertiary)] mt-1">
                                Try adjusting your filters or search criteria
                            </p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
