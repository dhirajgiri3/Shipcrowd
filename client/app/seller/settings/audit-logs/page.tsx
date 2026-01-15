/**
 * Audit Logs Viewer
 * 
 * View and export audit trail of all system activities.
 */

'use client';

import { useState } from 'react';
import { useAuditLogs, useExportAuditLogs } from '@/src/core/api/hooks/useSettings';
import { Download, Calendar, Filter } from 'lucide-react';
import { formatDate, formatDateTime } from '@/src/lib/utils';
import type { AuditLogFilters, AuditAction, AuditResource } from '@/src/types/api/settings.types';

export default function AuditLogsPage() {
    const [filters, setFilters] = useState<AuditLogFilters>({});

    const { data: logsData, isLoading } = useAuditLogs(filters);
    const { mutate: exportLogs } = useExportAuditLogs();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Audit Logs</h1>
                        <p className="text-gray-600 dark:text-gray-400">Track all activities in your account</p>
                    </div>
                    <button
                        onClick={() => exportLogs(filters)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Action</label>
                            <select
                                value={filters.action || ''}
                                onChange={(e) => setFilters({ ...filters, action: e.target.value as AuditAction || undefined })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                            >
                                <option value="">All Actions</option>
                                <option value="create">Create</option>
                                <option value="update">Update</option>
                                <option value="delete">Delete</option>
                                <option value="login">Login</option>
                                <option value="logout">Logout</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Resource</label>
                            <select
                                value={filters.resource || ''}
                                onChange={(e) => setFilters({ ...filters, resource: e.target.value as AuditResource || undefined })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                            >
                                <option value="">All Resources</option>
                                <option value="shipment">Shipment</option>
                                <option value="order">Order</option>
                                <option value="user">User</option>
                                <option value="webhook">Webhook</option>
                                <option value="team_member">Team Member</option>
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

                {/* Logs Table */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left py-3 px-6 text-sm font-medium text-gray-700 dark:text-gray-300">Timestamp</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">User</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Action</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Resource</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">IP Address</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logsData?.data.map((log, index) => (
                                    <tr
                                        key={log.id}
                                        className={index !== (logsData.data.length - 1) ? 'border-b border-gray-100 dark:border-gray-700' : ''}
                                    >
                                        <td className="py-4 px-6 text-sm text-gray-900 dark:text-white">
                                            {formatDateTime(log.timestamp)}
                                        </td>
                                        <td className="py-4 px-4">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">{log.userName}</p>
                                                <p className="text-xs text-gray-600 dark:text-gray-400">{log.userEmail}</p>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded text-xs font-medium">
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-sm text-gray-900 dark:text-white">
                                            {log.resource}
                                            {log.resourceId && <span className="text-gray-500 dark:text-gray-400"> #{log.resourceId}</span>}
                                        </td>
                                        <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                                            {log.ip}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {isLoading && (
                        <div className="py-12 text-center">
                            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
                        </div>
                    )}

                    {!isLoading && logsData?.data.length === 0 && (
                        <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                            No audit logs found
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
