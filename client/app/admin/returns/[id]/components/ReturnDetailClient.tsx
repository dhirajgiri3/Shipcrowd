'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Package,
    User,
    MapPin,
    Calendar,
    DollarSign,
    Clock,
    CheckCircle2,
    XCircle,
    TrendingDown,
    AlertCircle,
    FileText,
    Truck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { Loader } from '@/src/components/ui/feedback/Loader';
import { useAdminReturn, useAdminUpdateReturnStatus, useAdminProcessRefund } from '@/src/core/api/hooks/logistics/useAdminReturns';
import { formatCurrency, formatDate, cn } from '@/src/lib/utils';
import { toast } from 'sonner';

interface ReturnDetailClientProps {
    returnId: string;
}

export function ReturnDetailClient({ returnId }: ReturnDetailClientProps) {
    const router = useRouter();
    const { data: returnData, isLoading } = useAdminReturn(returnId);
    const { mutate: updateStatus, isPending: isUpdating } = useAdminUpdateReturnStatus();
    const { mutate: processRefund, isPending: isProcessing } = useAdminProcessRefund();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader centered />
            </div>
        );
    }

    if (!returnData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Package className="h-16 w-16 text-[var(--text-muted)] opacity-50" />
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">Return not found</h2>
                <Button onClick={() => router.push('/admin/returns')} variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Returns
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <PageHeader
                title={`Return ${returnData.returnId}`}
                description={`Order: ${returnData.orderId}`}
                showBack={true}
                backUrl="/admin/returns"
                breadcrumbs={[
                    { label: 'Admin', href: '/admin' },
                    { label: 'Returns', href: '/admin/returns' },
                    { label: returnData.returnId, active: true }
                ]}
                actions={<StatusBadge domain="return" status={returnData.status} />}
            />

            {/* Overview Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Return Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Customer & Company */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm">
                                    <User className="h-4 w-4" />
                                    Customer
                                </div>
                                <p className="text-[var(--text-primary)] font-medium">
                                    {returnData.customerName || 'Unknown'}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm">
                                    <Package className="h-4 w-4" />
                                    Company
                                </div>
                                <p className="text-[var(--text-primary)] font-medium">
                                    {returnData.companyName || 'N/A'}
                                </p>
                            </div>
                        </div>

                        {/* Return Reason */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm">
                                <FileText className="h-4 w-4" />
                                Return Reason
                            </div>
                            <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                                <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
                                    {returnData.returnReason}
                                </p>
                                {returnData.returnReasonText && (
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        {returnData.returnReasonText}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Customer Comments */}
                        {returnData.customerComments && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm">
                                    <AlertCircle className="h-4 w-4" />
                                    Customer Comments
                                </div>
                                <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        {returnData.customerComments}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--border-subtle)]">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm">
                                    <Calendar className="h-4 w-4" />
                                    Created
                                </div>
                                <p className="text-sm text-[var(--text-primary)]">
                                    {formatDate(returnData.createdAt)}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm">
                                    <Clock className="h-4 w-4" />
                                    Last Updated
                                </div>
                                <p className="text-sm text-[var(--text-primary)]">
                                    {formatDate(returnData.updatedAt)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Stats */}
                <div className="space-y-4">
                    {/* Refund Amount */}
                    <Card className="border-[var(--primary-blue)] border-2">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-[var(--text-muted)]">Refund Amount</p>
                                    <p className="text-2xl font-bold text-[var(--primary-blue)]">
                                        {formatCurrency(returnData.refundAmount)}
                                    </p>
                                </div>
                                <DollarSign className="h-8 w-8 text-[var(--primary-blue)]" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Pickup Status */}
                    {returnData.pickup && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Pickup Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-[var(--text-muted)]">Status</span>
                                    <StatusBadge domain="pickup" status={returnData.pickup.status || 'pending'} />
                                </div>
                                {returnData.pickup.scheduledDate && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-[var(--text-muted)]">Scheduled</span>
                                        <span className="text-sm text-[var(--text-primary)]">
                                            {formatDate(returnData.pickup.scheduledDate)}
                                        </span>
                                    </div>
                                )}
                                {returnData.pickup.awb && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-[var(--text-muted)]">AWB</span>
                                        <code className="text-sm text-[var(--text-primary)] font-mono">
                                            {returnData.pickup.awb}
                                        </code>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* QC Status */}
                    {returnData.qc && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Quality Check</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-[var(--text-muted)]">Status</span>
                                    <StatusBadge domain="qc" status={returnData.qc.status || 'pending'} />
                                </div>
                                {returnData.qc.result && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-[var(--text-muted)]">Result</span>
                                        <StatusBadge domain="qc" status={returnData.qc.result} />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Items */}
            {returnData.items && returnData.items.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Return Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <table className="w-full">
                            <thead className="border-b border-[var(--border-subtle)]">
                                <tr>
                                    <th className="text-left py-2 text-sm font-medium text-[var(--text-muted)]">Product</th>
                                    <th className="text-right py-2 text-sm font-medium text-[var(--text-muted)]">Quantity</th>
                                    <th className="text-right py-2 text-sm font-medium text-[var(--text-muted)]">Unit Price</th>
                                    <th className="text-right py-2 text-sm font-medium text-[var(--text-muted)]">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-subtle)]">
                                {returnData.items.map((item: any, index: number) => (
                                    <tr key={index}>
                                        <td className="py-3">
                                            <div>
                                                <p className="text-sm font-medium text-[var(--text-primary)]">
                                                    {item.productName}
                                                </p>
                                                {item.sku && (
                                                    <p className="text-xs text-[var(--text-muted)]">SKU: {item.sku}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3 text-right text-sm text-[var(--text-primary)]">
                                            {item.quantity}
                                        </td>
                                        <td className="py-3 text-right text-sm text-[var(--text-primary)]">
                                            {formatCurrency(item.unitPrice)}
                                        </td>
                                        <td className="py-3 text-right text-sm font-medium text-[var(--text-primary)]">
                                            {formatCurrency(item.quantity * item.unitPrice)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            )}

            {/* Timeline */}
            {returnData.timeline && returnData.timeline.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Timeline</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {returnData.timeline.map((event: any, index: number) => (
                                <div key={index} className="flex gap-4">
                                    <div className="flex flex-col items-center">
                                        <div className="h-8 w-8 rounded-full bg-[var(--primary-blue-soft)] flex items-center justify-center">
                                            <CheckCircle2 className="h-4 w-4 text-[var(--primary-blue)]" />
                                        </div>
                                        {index < returnData.timeline.length - 1 && (
                                            <div className="flex-1 w-0.5 bg-[var(--border-subtle)] min-h-[30px]" />
                                        )}
                                    </div>
                                    <div className="flex-1 pb-4">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="font-medium text-[var(--text-primary)]">{event.action}</p>
                                                {event.notes && (
                                                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                                                        {event.notes}
                                                    </p>
                                                )}
                                            </div>
                                            <span className="text-xs text-[var(--text-muted)]">
                                                {formatDate(event.timestamp)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Admin Actions */}
            <Card className="border-2 border-[var(--border-subtle)]">
                <CardHeader>
                    <CardTitle>Admin Actions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-3 flex-wrap">
                        {returnData.refund?.status !== 'completed' && (
                            <Button
                                variant="primary"
                                onClick={() => {
                                    if (confirm('Process refund for this return?')) {
                                        processRefund(returnId, {
                                            onSuccess: () => {
                                                toast.success('Refund processed successfully');
                                            }
                                        });
                                    }
                                }}
                                disabled={isProcessing}
                            >
                                {isProcessing ? 'Processing...' : 'Process Refund'}
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            onClick={() => router.push('/admin/returns')}
                        >
                            Back to List
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
