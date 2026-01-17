/**
 * AuditLogsViewer Component
 * 
 * View and export audit trail of all system activities with filtering capabilities.
 */

'use client';

import { useState } from 'react';
import { useAuditLogs, useExportAuditLogs } from '@/src/core/api/hooks/useSettings';
import { Download, Calendar, Filter, Loader2, Search } from 'lucide-react';
import { formatDate, formatDateTime } from '@/src/lib/utils';
import { Button, Card, Input, Label, Select, Badge } from '@/src/components/ui';
import type { AuditLogFilters, AuditAction, AuditResource, AuditLog } from '@/src/types/api/settings.types';

export function AuditLogsViewer() {
    const [filters, setFilters] = useState<AuditLogFilters>({});

    const { data: logsData, isLoading } = useAuditLogs(filters);
    const { mutate: exportLogs, isPending: isExporting } = useExportAuditLogs();

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button
                    onClick={() => exportLogs({ format: 'csv', filters })}
                    disabled={isExporting}
                    className="flex items-center gap-2"
                >
                    {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Export CSV
                </Button>
            </div>

            <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <Label>Action</Label>
                        <select
                            value={filters.action || ''}
                            onChange={(e) => setFilters({ ...filters, action: e.target.value as AuditAction || undefined })}
                            className="w-full mt-1.5 px-3 py-2 rounded-md border border-[var(--border-input)] bg-[var(--bg-background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
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
                        <Label>Resource</Label>
                        <select
                            value={filters.resource || ''}
                            onChange={(e) => setFilters({ ...filters, resource: e.target.value as AuditResource || undefined })}
                            className="w-full mt-1.5 px-3 py-2 rounded-md border border-[var(--border-input)] bg-[var(--bg-background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
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
                        <Label>Start Date</Label>
                        <Input
                            type="date"
                            value={filters.startDate || ''}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value || undefined })}
                            className="mt-1.5"
                        />
                    </div>

                    <div>
                        <Label>End Date</Label>
                        <Input
                            type="date"
                            value={filters.endDate || ''}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value || undefined })}
                            className="mt-1.5"
                        />
                    </div>
                </div>
            </Card>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
                                <th className="text-left py-3 px-6 text-sm font-medium text-[var(--text-secondary)]">Timestamp</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">User</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">Action</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">Resource</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">IP Address</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logsData?.logs.map((log: AuditLog, index: number) => (
                                <tr
                                    key={log._id}
                                    className={index !== ((logsData?.logs.length || 0) - 1) ? 'border-b border-[var(--border-subtle)]' : ''}
                                >
                                    <td className="py-4 px-6 text-sm text-[var(--text-primary)]">
                                        {formatDateTime(log.timestamp)}
                                    </td>
                                    <td className="py-4 px-4">
                                        <div>
                                            <p className="text-sm font-medium text-[var(--text-primary)]">{log.userName}</p>
                                            <p className="text-xs text-[var(--text-muted)]">{log.userEmail}</p>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <Badge variant="outline" className="bg-[var(--bg-secondary)]">
                                            {log.action}
                                        </Badge>
                                    </td>
                                    <td className="py-4 px-4 text-sm text-[var(--text-primary)]">
                                        {log.entity}
                                        {log.entityId && <span className="text-[var(--text-muted)]"> #{log.entityId}</span>}
                                    </td>
                                    <td className="py-4 px-4 text-sm text-[var(--text-muted)]">
                                        {log.ipAddress || 'N/A'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {isLoading && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-[var(--primary-blue)] animate-spin" />
                    </div>
                )}

                {!isLoading && (!logsData?.logs || logsData.logs.length === 0) && (
                    <div className="py-12 text-center text-[var(--text-muted)]">
                        No audit logs found matching your filters
                    </div>
                )}
            </Card>
        </div>
    );
}
