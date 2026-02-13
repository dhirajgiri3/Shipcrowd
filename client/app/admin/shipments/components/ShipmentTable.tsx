
import React, { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/src/components/ui/core/Table';
import { Shipment } from '@/src/core/api/hooks/orders/useShipments';
import {
    MoreHorizontal,
    ExternalLink,
    Truck,
    ArrowUpDown,
    Package,
    Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { formatCurrency, cn } from '@/src/lib/utils';
import { format } from 'date-fns';
import { Button } from '@/src/components/ui/core/Button';
import { ViewActionButton } from '@/src/components/ui/core/ViewActionButton';
import { Tooltip } from '@/src/components/ui/feedback/Tooltip';
import { TableSkeleton } from '@/src/components/ui/data/Skeleton';
import { getCourierLogo } from '@/src/constants';

interface ShipmentTableProps {
    data: Shipment[];
    isLoading: boolean;
    onRefresh: () => void;
    pagination?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
    onPageChange?: (page: number) => void;
    onSort?: (key: string) => void;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    onRowClick: (shipment: Shipment) => void;
}

export function ShipmentTable({
    data,
    isLoading,
    onRefresh,
    pagination,
    onPageChange,
    onSort,
    sortBy,
    sortOrder,
    onRowClick
}: ShipmentTableProps) {
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

    const handleSortClick = (key: string) => {
        if (onSort) {
            onSort(key);
        }
    };

    const getOrderNumber = (orderId: any) => {
        if (typeof orderId === 'object' && orderId?.orderNumber) {
            return orderId.orderNumber;
        }
        return 'N/A';
    };

    const getCustomerName = (row: any) => {
        return row.deliveryDetails?.recipientName || 'Unknown';
    };

    const getCustomerPhone = (row: any) => {
        return row.deliveryDetails?.recipientPhone || 'N/A';
    };

    if (isLoading && data.length === 0) {
        return <TableSkeleton rows={10} columns={6} />;
    }

    if (!isLoading && data.length === 0) {
        return (
            <div className="text-center py-12 bg-[var(--bg-primary)] rounded-lg border border-dashed border-[var(--border-default)]">
                <p className="text-[var(--text-tertiary)]">No shipments found matching your criteria.</p>
            </div>
        );
    }

    return (
        <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg shadow-sm overflow-hidden flex flex-col h-full">
            <div className="overflow-auto flex-1">
                <Table>
                    <TableHeader className="bg-[var(--bg-secondary)] sticky top-0 z-10">
                        <TableRow className="border-b border-[var(--border-default)] hover:bg-transparent">
                            <TableHead className="w-[180px] cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={() => handleSortClick('trackingNumber')}>
                                <div className="flex items-center gap-1">
                                    Shipment Details
                                </div>
                            </TableHead>
                            <TableHead className="text-[var(--text-secondary)]">Order</TableHead>
                            <TableHead className="text-[var(--text-secondary)]">Customer</TableHead>
                            <TableHead className="text-[var(--text-secondary)]">Carrier</TableHead>
                            <TableHead className="text-center text-[var(--text-secondary)]">Status</TableHead>
                            <TableHead className="text-right text-[var(--text-secondary)]">Amount</TableHead>
                            <TableHead className="text-center text-[var(--text-secondary)]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <AnimatePresence>
                            {data.map((shipment, index) => (
                                <motion.tr
                                    key={shipment._id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ delay: index * 0.05, duration: 0.2 }}
                                    className="group hover:bg-[var(--bg-hover)] transition-colors border-b last:border-0 border-[var(--border-subtle)] cursor-pointer"
                                    onClick={() => onRowClick(shipment)}
                                >
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                                                <Package className="w-4 h-4 text-[var(--text-muted)]" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-[var(--text-primary)] text-sm">{shipment.trackingNumber}</div>
                                                <div className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                                                    {format(new Date(shipment.createdAt), 'MMM d, h:mm a')}
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm font-medium text-[var(--text-secondary)]">
                                            {getOrderNumber(shipment.orderId)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <div className="font-medium text-[var(--text-primary)] text-sm">{getCustomerName(shipment)}</div>
                                            <div className="text-xs text-[var(--text-muted)]">{getCustomerPhone(shipment)}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <img
                                                src={getCourierLogo(shipment.carrier)}
                                                className="w-5 h-5 object-contain opacity-80"
                                                alt={shipment.carrier}
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none'; // Hide broken image
                                                }}
                                            />
                                            <span className="text-sm font-medium text-[var(--text-secondary)]">{shipment.carrier}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <StatusBadge domain="shipment" status={shipment.currentStatus} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {(shipment as any).paymentDetails ? (
                                            <div>
                                                <div className="font-bold text-[var(--text-primary)] text-sm">
                                                    {formatCurrency((shipment as any).paymentDetails.codAmount || (shipment as any).paymentDetails.shippingCost || 0)}
                                                </div>
                                                <span className={cn(
                                                    "text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase",
                                                    (shipment as any).paymentDetails.type === 'prepaid' ? "bg-[var(--success-bg)] text-[var(--success)]" : "bg-[var(--info-bg)] text-[var(--info)]"
                                                )}>
                                                    {(shipment as any).paymentDetails.type}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-[var(--text-muted)]">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        <div className="flex justify-center items-center gap-2 relative">
                                            <ViewActionButton
                                                onClick={() => onRowClick(shipment)}
                                            />
                                        </div>
                                    </TableCell>
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            {pagination && (
                <div className="p-4 border-t border-[var(--border-default)] bg-[var(--bg-secondary)]/50 flex justify-between items-center text-xs text-[var(--text-tertiary)]">
                    <span>Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} shipments</span>
                    <div className="flex gap-2 items-center">
                        <button
                            className="px-3 py-1 border border-[var(--border-default)] rounded hover:bg-[var(--bg-primary)] disabled:opacity-50 text-[var(--text-secondary)] transition-colors"
                            disabled={pagination.page <= 1}
                            onClick={() => onPageChange?.(pagination.page - 1)}
                        >
                            Previous
                        </button>
                        <span className="text-[var(--text-primary)] font-medium">Page {pagination.page} of {pagination.totalPages}</span>
                        <button
                            className="px-3 py-1 border border-[var(--border-default)] rounded hover:bg-[var(--bg-primary)] disabled:opacity-50 text-[var(--text-secondary)] transition-colors"
                            disabled={pagination.page >= pagination.totalPages}
                            onClick={() => onPageChange?.(pagination.page + 1)}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
