/**
 * NDR Cases Table Component
 * 
 * Features:
 * - Status filtering tabs
 * - SLA breach indicators
 * - Action history preview
 * - Quick actions
 * - Pagination
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNDRCases } from '@/src/core/api/hooks';
import type { NDRStatus, NDRFilters } from '@/src/types/api/orders';
import { useDebouncedValue } from '@/src/hooks/data';

import { StatusBadge } from '@/src/components/ui/data/StatusBadge';

const STATUS_TABS: { status: NDRStatus | 'all'; label: string }[] = [
    { status: 'all', label: 'All Cases' },
    { status: 'open', label: 'Open' },
    { status: 'in_progress', label: 'In Progress' },
    { status: 'customer_action', label: 'Customer Action' },
    { status: 'escalated', label: 'Escalated' },
    { status: 'resolved', label: 'Resolved' },
];

export function NDRCasesTable() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<NDRStatus | 'all'>('all');
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedValue(search, 300);
    const [filters, setFilters] = useState<NDRFilters>({
        page: 1,
        limit: 20,
    });

    // Auto-update filters when debounced search changes
    useEffect(() => {
        setFilters(prev => ({
            ...prev,
            search: debouncedSearch || undefined,
            page: 1,
        }));
    }, [debouncedSearch]);

    const updateFilters = (newFilters: Partial<NDRFilters>) => {
        setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
    };

    const { data, isLoading } = useNDRCases({
        ...filters,
        ...(activeTab !== 'all' && { status: activeTab }),
    });

    const handleTabChange = (status: NDRStatus | 'all') => {
        setActiveTab(status);
        setFilters(prev => ({ ...prev, page: 1 }));
    };

    const handleRowClick = (caseId: string) => {
        router.push(`/seller/ndr/${caseId}`);
    };

    const getDaysSinceBadge = (days: number) => {
        if (days >= 5) return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
        if (days >= 3) return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400';
        if (days >= 1) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            {/* Status Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex space-x-4 px-6" aria-label="Tabs">
                    {STATUS_TABS.map(tab => (
                        <button
                            key={tab.status}
                            onClick={() => handleTabChange(tab.status)}
                            className={`py-4 px-3 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.status
                                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                        >
                            {tab.label}
                            {data && tab.status !== 'all' && (
                                <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-gray-100 dark:bg-gray-700">
                                    {data.cases.filter(c => c.status === tab.status).length}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Search and Filters */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            value={search}
                            placeholder="Search by AWB, NDR ID, or customer name..."
                            aria-label="Search NDR cases"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500"
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button
                        aria-label="Open filter options"
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        Filters
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                {isLoading ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                        <p className="text-gray-500 dark:text-gray-400 mt-4">Loading NDR cases...</p>
                    </div>
                ) : !data?.cases.length ? (
                    <div className="p-12 text-center">
                        <svg className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No NDR cases found</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">All deliveries are going smoothly!</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">NDR ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tracking</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reason</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Attempts</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Days Since</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">SLA</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {data.cases.map((ndrCase) => {
                                const shipment = typeof ndrCase.shipmentId === 'object' ? ndrCase.shipmentId : null;

                                return (
                                    <tr
                                        key={ndrCase._id}
                                        onClick={() => handleRowClick(ndrCase._id)}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-primary-600 dark:text-primary-400">
                                                {ndrCase.ndrId}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900 dark:text-white font-mono">
                                                {shipment?.trackingNumber || 'N/A'}
                                            </div>
                                            {shipment?.carrier && (
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {shipment.carrier}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 dark:text-white">
                                                {ndrCase.customerName}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {ndrCase.customerPhone}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 dark:text-white capitalize">
                                                {ndrCase.primaryReason.replace(/_/g, ' ')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900 dark:text-white">
                                                {ndrCase.allAttempts.length}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDaysSinceBadge(ndrCase.daysSinceReported)}`}>
                                                {ndrCase.daysSinceReported}d
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <StatusBadge domain="ndr" status={ndrCase.status} size="sm" />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {ndrCase.slaBreach ? (
                                                <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                    </svg>
                                                    <span className="text-xs font-medium">Breach</span>
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                    <span className="text-xs font-medium">OK</span>
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {data && data.pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                        Showing <span className="font-medium">{(data.pagination.page - 1) * data.pagination.limit + 1}</span> to{' '}
                        <span className="font-medium">
                            {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)}
                        </span>{' '}
                        of <span className="font-medium">{data.pagination.total}</span> cases
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, prev.page! - 1) }))}
                            disabled={data.pagination.page === 1}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setFilters(prev => ({ ...prev, page: prev.page! + 1 }))}
                            disabled={data.pagination.page >= data.pagination.totalPages}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
