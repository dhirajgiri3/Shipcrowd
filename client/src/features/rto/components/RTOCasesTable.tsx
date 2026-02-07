'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/src/components/ui/core/Table';
import { Button } from '@/src/components/ui/core/Button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/src/components/ui/feedback/DropdownMenu';
import { ViewActionButton } from '@/src/components/ui/core/ViewActionButton';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { Loader2, MoreVertical, ClipboardCheck, Package, Copy } from 'lucide-react';
import type { RTOEventDetail, RTOShipmentRef, RTOOrderRef, RTOWarehouseRef } from '@/src/types/api/rto.types';
import { RTO_REASON_LABELS } from '@/src/types/api/rto.types';

function getAwb(rto: RTOEventDetail): string {
    const s = rto.shipment;
    if (!s) return '';
    if (typeof s === 'object') return (s as RTOShipmentRef).awb ?? (s as RTOShipmentRef).trackingNumber ?? '';
    return '';
}

function getOrderNumber(rto: RTOEventDetail): string {
    const o = rto.order;
    if (!o) return '';
    if (typeof o === 'object') return (o as RTOOrderRef).orderNumber ?? (o as RTOOrderRef)._id ?? '';
    return String(o);
}

function getCustomerName(rto: RTOEventDetail): string {
    const s = rto.shipment;
    if (!s || typeof s !== 'object') return '—';
    const d = (s as RTOShipmentRef).deliveryDetails;
    return d?.recipientName ?? '—';
}

function getWarehouseName(rto: RTOEventDetail): string {
    const w = rto.warehouse;
    if (!w) return '—';
    if (typeof w === 'object') return (w as RTOWarehouseRef).name ?? '—';
    return '—';
}

function formatDate(val: string | undefined): string {
    if (!val) return '—';
    try {
        return new Date(val).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    } catch {
        return '—';
    }
}

interface RTOCasesTableProps {
    data: RTOEventDetail[];
    loading: boolean;
    onRowClick: (rto: RTOEventDetail) => void;
}

export function RTOCasesTable({ data, loading, onRowClick }: RTOCasesTableProps) {
    const router = useRouter();

    const handleCopyAwb = (e: React.MouseEvent, awb: string) => {
        e.stopPropagation();
        if (awb) navigator.clipboard.writeText(awb);
    };

    if (loading) {
        return (
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>RTO #</TableHead>
                            <TableHead>AWB</TableHead>
                            <TableHead>Order</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Initiated</TableHead>
                            <TableHead>ETA</TableHead>
                            <TableHead>Warehouse</TableHead>
                            <TableHead>Charges</TableHead>
                            <TableHead>Charges</TableHead>
                            <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell colSpan={11} className="text-center py-12">
                                <Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--primary-blue)]" />
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
        );
    }

    if (!data.length) {
        return (
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-12 text-center">
                <p className="text-[var(--text-secondary)]">No RTO cases found.</p>
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>RTO #</TableHead>
                        <TableHead>AWB</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Initiated</TableHead>
                        <TableHead>ETA</TableHead>
                        <TableHead>Warehouse</TableHead>
                        <TableHead>Charges</TableHead>
                        <TableHead>Charges</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((rto) => {
                        const awb = getAwb(rto);
                        const orderNumber = getOrderNumber(rto);
                        const customerName = getCustomerName(rto);
                        const warehouseName = getWarehouseName(rto);
                        const isQCPending = rto.returnStatus === 'qc_pending';
                        const canRestock =
                            rto.returnStatus === 'qc_completed' &&
                            rto.qcResult?.passed === true;

                        return (
                            <TableRow
                                key={rto._id}
                                className="cursor-pointer hover:bg-[var(--bg-hover)]"
                                onClick={() => onRowClick(rto)}
                            >
                                <TableCell className="font-medium">
                                    {rto._id.slice(-8).toUpperCase()}
                                </TableCell>
                                <TableCell className="font-mono text-sm">{awb || '—'}</TableCell>
                                <TableCell>{orderNumber || '—'}</TableCell>
                                <TableCell className="max-w-[140px] truncate" title={customerName}>
                                    {customerName}
                                </TableCell>
                                <TableCell className="max-w-[160px]" title={rto.rtoReason}>
                                    <span className="truncate block">
                                        {RTO_REASON_LABELS[rto.rtoReason] ?? rto.rtoReason}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <StatusBadge domain="rto" status={rto.returnStatus} size="sm" />
                                </TableCell>
                                <TableCell>{formatDate(rto.triggeredAt)}</TableCell>
                                <TableCell>{formatDate(rto.expectedReturnDate)}</TableCell>
                                <TableCell className="max-w-[120px] truncate" title={warehouseName}>
                                    {warehouseName}
                                </TableCell>
                                <TableCell>
                                    ₹{typeof rto.rtoCharges === 'number' ? rto.rtoCharges : 0}
                                </TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center gap-1">
                                        <ViewActionButton
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                router.push(`/seller/rto/${rto._id}`);
                                            }}
                                        />
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {isQCPending && (
                                                    <DropdownMenuItem
                                                        onClick={(e: React.MouseEvent) => {
                                                            e.stopPropagation();
                                                            router.push(`/seller/rto/${rto._id}/qc`);
                                                        }}
                                                    >
                                                        <ClipboardCheck className="w-4 h-4 mr-2" />
                                                        Record QC
                                                    </DropdownMenuItem>
                                                )}
                                                {canRestock && (
                                                    <DropdownMenuItem
                                                        onClick={(e: React.MouseEvent) => {
                                                            e.stopPropagation();
                                                            router.push(`/seller/rto/${rto._id}`);
                                                        }}
                                                    >
                                                        <Package className="w-4 h-4 mr-2" />
                                                        Restock
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={(e: React.MouseEvent) => handleCopyAwb(e, awb)}
                                                    disabled={!awb}
                                                >
                                                    <Copy className="w-4 h-4 mr-2" />
                                                    Copy AWB
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
