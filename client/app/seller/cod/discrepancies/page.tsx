'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { codDiscrepancyApi, CODDiscrepancy } from '@/src/core/api/clients/finance/codDiscrepancyApi';
import { Card } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button'; // Assuming Button exists
import { Badge } from '@/src/components/ui/core/Badge'; // Assuming Badge exists
import { ConfirmDialog } from '@/src/components/ui/feedback/ConfirmDialog';
import { Loader2, Filter, CheckCircle, AlertTriangle, FileText, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function CODDiscrepancyPage() {
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [resolveTarget, setResolveTarget] = useState<string | null>(null);
    const queryClient = useQueryClient();

    // Fetch Discrepancies
    const { data: response, isLoading } = useQuery({
        queryKey: ['cod-discrepancies', page, statusFilter],
        queryFn: () => codDiscrepancyApi.getDiscrepancies({ page, limit: 10, status: statusFilter || undefined })
    });

    // Resolve Mutation
    const resolveMutation = useMutation({
        mutationFn: ({ id, method }: { id: string, method: any }) =>
            codDiscrepancyApi.resolveDiscrepancy(id, { method, remarks: 'Manual resolution via dashboard' }),
        onSuccess: () => {
            toast.success('Discrepancy resolved successfully');
            queryClient.invalidateQueries({ queryKey: ['cod-discrepancies'] });
        },
        onError: (err) => {
            toast.error('Failed to resolve discrepancy');
        }
    });

    const handleQuickResolve = (id: string) => {
        setResolveTarget(id);
    };

    if (isLoading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const discrepancies: CODDiscrepancy[] = response?.data || [];
    const pagination = response?.pagination || {};

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Discrepancy Management</h1>
                    <p className="text-muted-foreground">Review and resolve COD payment mismatches</p>
                </div>
                <div className="flex gap-2">
                    <select
                        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">All Statuses</option>
                        <option value="detected">Detected</option>
                        <option value="under_review">Under Review</option>
                        <option value="resolved">Resolved</option>
                    </select>
                </div>
            </div>

            <Card>
                <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm text-left">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">ID</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">AWB</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Type</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Expected</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Actual</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Diff</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Status</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {discrepancies.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-4 text-center text-muted-foreground">No discrepancies found</td>
                                </tr>
                            ) : (
                                discrepancies.map((item) => (
                                    <tr key={item._id} className="border-b transition-colors hover:bg-muted/50">
                                        <td className="p-4 font-medium">{item.discrepancyNumber}</td>
                                        <td className="p-4">{item.awb}</td>
                                        <td className="p-4 capitalize">{item.type.replace(/_/g, ' ')}</td>
                                        <td className="p-4">₹{item.amounts.expected.total}</td>
                                        <td className="p-4">₹{item.amounts.actual.collected}</td>
                                        <td className="p-4 font-bold text-red-500">
                                            {item.amounts.difference > 0 ? '+' : ''}₹{item.amounts.difference}
                                        </td>
                                        <td className="p-4">
                                            <Badge variant={item.status === 'resolved' ? 'success' : 'warning'}>
                                                {item.status.replace(/_/g, ' ')}
                                            </Badge>
                                        </td>
                                        <td className="p-4">
                                            {item.status === 'detected' && (
                                                <div className="flex gap-2">
                                                    <Button size="sm" variant="outline" onClick={() => handleQuickResolve(item._id)}>
                                                        Accept
                                                    </Button>
                                                </div>
                                            )}
                                            {item.status === 'resolved' && (
                                                <span className="text-muted-foreground text-xs">Resolved</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Pagination Controls */}
            <div className="flex items-center justify-end space-x-2 py-4">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                    Previous
                </Button>
                <div className="text-sm font-medium">Page {page} of {pagination.pages || 1}</div>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= (pagination.pages || 1)}>
                    Next
                </Button>
            </div>

            <ConfirmDialog
                open={!!resolveTarget}
                title="Accept courier amount"
                description="Are you sure you want to accept the courier amount? This will close the discrepancy."
                confirmText="Accept"
                onCancel={() => setResolveTarget(null)}
                onConfirm={() => {
                    if (!resolveTarget) return;
                    resolveMutation.mutate({ id: resolveTarget, method: 'merchant_writeoff' });
                    setResolveTarget(null);
                }}
            />
        </div>
    );
}
