'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { RotateCcw, Package, Loader2, Truck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { RTOStatusBadge } from '../components/RTOStatusBadge';
import { RTOTimeline } from '../components/RTOTimeline';
import { useRTODetails, useUpdateRTOStatus } from '@/src/core/api/hooks/rto/useRTOManagement';
import type {
    RTOEventDetail,
    RTOShipmentRef,
    RTOOrderRef,
    RTOWarehouseRef,
    RTOQCResult,
} from '@/src/types/api/rto.types';
import { RTO_REASON_LABELS } from '@/src/types/api/rto.types';

function getAwb(rto: RTOEventDetail): string {
    const s = rto.shipment;
    if (!s || typeof s !== 'object') return '';
    return (s as RTOShipmentRef).awb ?? (s as RTOShipmentRef).trackingNumber ?? '';
}

function getOrderNumber(rto: RTOEventDetail): string {
    const o = rto.order;
    if (!o || typeof o !== 'object') return '';
    return (o as RTOOrderRef).orderNumber ?? (o as RTOOrderRef)._id ?? '';
}

function getCustomer(rto: RTOEventDetail): { name: string; phone: string } {
    const s = rto.shipment;
    if (!s || typeof s !== 'object') return { name: '—', phone: '—' };
    const d = (s as RTOShipmentRef).deliveryDetails;
    return {
        name: d?.recipientName ?? '—',
        phone: (d as { recipientPhone?: string })?.recipientPhone ?? '—',
    };
}

function getProductSummary(rto: RTOEventDetail): { sku: string; name: string; quantity: number }[] {
    const o = rto.order;
    if (!o || typeof o !== 'object') return [];
    const items = (o as RTOOrderRef).products ?? (o as RTOOrderRef).items;
    if (!Array.isArray(items)) return [];
    return items.map((it) => ({
        sku: (it as { sku?: string }).sku ?? '',
        name: (it as { name?: string }).name ?? (it as { productName?: string }).productName ?? (it as { sku?: string }).sku ?? '—',
        quantity: it.quantity ?? 1,
    }));
}

function formatDate(val: string | undefined): string {
    if (!val) return '—';
    try {
        return new Date(val).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return '—';
    }
}

export function RTODetailsPage() {
    const params = useParams();
    const router = useRouter();
    const rtoId = params?.id as string;

    const { data: rto, isLoading, error } = useRTODetails(rtoId);
    const updateStatus = useUpdateRTOStatus();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary-blue)]" />
            </div>
        );
    }

    if (error || !rto) {
        return (
            <div className="text-center py-12">
                <p className="text-[var(--error)]">Failed to load RTO details.</p>
                <Button variant="outline" className="mt-4" onClick={() => router.push('/seller/rto')}>
                    Back to RTO List
                </Button>
            </div>
        );
    }

    const customer = getCustomer(rto);
    const awb = getAwb(rto);
    const orderNumber = getOrderNumber(rto);
    const products = getProductSummary(rto);
    const canRestock =
        rto.returnStatus === 'qc_completed' && rto.qcResult?.passed === true;

    const handleRestock = () => {
        updateStatus.mutate(
            { rtoId, returnStatus: 'restocked' },
            {
                onSuccess: () => router.push('/seller/rto'),
                onError: (e) => console.error(e),
            }
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <Link
                        href="/seller/rto"
                        className="text-sm text-[var(--text-secondary)] hover:underline"
                    >
                        ← RTO List
                    </Link>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                        <RotateCcw className="w-6 h-6 text-[var(--error)]" />
                        RTO #{rto._id.slice(-8).toUpperCase()}
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <RTOStatusBadge status={rto.returnStatus} size="large" />
                    {canRestock && (
                        <Button
                            onClick={handleRestock}
                            disabled={updateStatus.isPending}
                            className="bg-[var(--success)] hover:opacity-90"
                        >
                            {updateStatus.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                                <Package className="w-4 h-4 mr-2" />
                            )}
                            Restock Item
                        </Button>
                    )}
                    {rto.returnStatus === 'qc_pending' && (
                        <Button onClick={() => router.push(`/seller/rto/${rtoId}/qc`)}>
                            Record QC
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-[var(--border-subtle)]">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-[var(--text-muted)]">
                            Order Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div>
                            <span className="text-[var(--text-muted)]">Order #: </span>
                            <span className="font-medium">{orderNumber || '—'}</span>
                        </div>
                        <div>
                            <span className="text-[var(--text-muted)]">AWB: </span>
                            <span className="font-medium font-mono">{awb || '—'}</span>
                        </div>
                        <div>
                            <span className="text-[var(--text-muted)]">Customer: </span>
                            <span className="font-medium">{customer.name}</span>
                        </div>
                        <div>
                            <span className="text-[var(--text-muted)]">Phone: </span>
                            <span className="font-medium">{customer.phone}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-[var(--border-subtle)]">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-[var(--text-muted)]">
                            Product Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        {products.length ? (
                            products.map((p, i) => (
                                <div key={i}>
                                    <span className="text-[var(--text-muted)]">SKU: </span>
                                    <span className="font-medium">{p.sku}</span>
                                    <span className="text-[var(--text-muted)] ml-2">× {p.quantity}</span>
                                    {p.name !== p.sku && (
                                        <p className="text-[var(--text-secondary)] truncate mt-0.5">{p.name}</p>
                                    )}
                                </div>
                            ))
                        ) : (
                            <p className="text-[var(--text-muted)]">No line items</p>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-[var(--border-subtle)]">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-[var(--text-muted)]">
                            Financial
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div>
                            <span className="text-[var(--text-muted)]">RTO Charges: </span>
                            <span className="font-medium">₹{rto.rtoCharges ?? 0}</span>
                        </div>
                        <div>
                            <span className="text-[var(--text-muted)]">Deducted: </span>
                            <span className={rto.chargesDeducted ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}>
                                {rto.chargesDeducted ? 'Yes' : 'No'}
                            </span>
                        </div>
                        <div>
                            <span className="text-[var(--text-muted)]">Reason: </span>
                            <span className="font-medium">{RTO_REASON_LABELS[rto.rtoReason] ?? rto.rtoReason}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-[var(--border-subtle)]">
                <CardHeader>
                    <CardTitle>RTO Journey</CardTitle>
                </CardHeader>
                <CardContent>
                    <RTOTimeline rto={rto} />
                </CardContent>
            </Card>

            {rto.qcResult && (
                <Card className="border-[var(--border-subtle)]">
                    <CardHeader>
                        <CardTitle>Quality Check</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div>
                            <span className="text-[var(--text-muted)]">Result: </span>
                            <span
                                className={
                                    rto.qcResult.passed
                                        ? 'text-[var(--success)] font-medium'
                                        : 'text-[var(--error)] font-medium'
                                }
                            >
                                {rto.qcResult.passed ? 'Passed' : 'Failed'}
                            </span>
                        </div>
                        {rto.qcResult.condition && (
                            <div>
                                <span className="text-[var(--text-muted)]">Condition: </span>
                                <p className="text-[var(--text-secondary)] mt-1">{rto.qcResult.condition}</p>
                            </div>
                        )}
                        {rto.qcResult.remarks && (
                            <div>
                                <span className="text-[var(--text-muted)]">Remarks: </span>
                                <p className="text-[var(--text-secondary)] mt-1">{rto.qcResult.remarks}</p>
                            </div>
                        )}
                        {rto.qcResult.damageTypes && rto.qcResult.damageTypes.length > 0 && (
                            <div>
                                <span className="text-[var(--text-muted)]">Damage types: </span>
                                <p className="text-[var(--text-secondary)] mt-1">
                                    {rto.qcResult.damageTypes.join(', ')}
                                </p>
                            </div>
                        )}
                        {rto.qcResult.inspectedBy && (
                            <div>
                                <span className="text-[var(--text-muted)]">Checked by: </span>
                                <span className="font-medium">{rto.qcResult.inspectedBy}</span>
                            </div>
                        )}
                        {rto.qcResult.inspectedAt && (
                            <div>
                                <span className="text-[var(--text-muted)]">Checked at: </span>
                                <span>{formatDate(rto.qcResult.inspectedAt)}</span>
                            </div>
                        )}
                        {(() => {
                            const qc = rto.qcResult as RTOQCResult;
                            const photoList = qc.photos?.length
                                ? qc.photos
                                : qc.images?.map((url) => ({ url, label: undefined as string | undefined })) ?? [];
                            if (photoList.length === 0) return null;
                            return (
                                <div className="mt-3">
                                    <p className="text-[var(--text-muted)] mb-2">Photos</p>
                                    <div className="flex flex-wrap gap-3">
                                        {photoList.map((p, i) => (
                                            <div key={i} className="flex flex-col">
                                                <a
                                                    href={p.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block w-24 h-24 rounded border border-[var(--border-default)] overflow-hidden"
                                                >
                                                    <img
                                                        src={p.url}
                                                        alt={p.label ?? `QC ${i + 1}`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </a>
                                                {p.label && (
                                                    <span className="text-[10px] text-[var(--text-muted)] mt-1 max-w-24 truncate block">
                                                        {p.label}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}
                    </CardContent>
                </Card>
            )}

            <Card className="border-[var(--border-subtle)]">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Truck className="w-5 h-5" />
                        Reverse Shipment
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {rto.reverseAwb ? (
                        <p className="text-sm text-[var(--text-secondary)]">
                            Reverse AWB: <span className="font-mono font-medium">{rto.reverseAwb}</span>
                        </p>
                    ) : (
                        <p className="text-sm text-[var(--text-muted)]">Tracking information not available yet.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
