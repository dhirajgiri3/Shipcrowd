
import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/src/components/ui/core/Table';
import { ReturnRequest } from '@/src/types/api/returns/returns.types';
import {
    ArrowUpDown,
    RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { formatCurrency, formatDate } from '@/src/lib/utils';
import { ViewActionButton } from '@/src/components/ui/core/ViewActionButton';
import { TableSkeleton } from '@/src/components/ui/data/Skeleton';
import { EmptyState } from '@/src/components/ui/feedback/EmptyState';

interface ReturnsTableProps {
    data: ReturnRequest[];
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
    onRowClick: (returnReq: ReturnRequest) => void;
    emptyState?: React.ReactNode;
}

export function ReturnsTable({
    data,
    isLoading,
    onRefresh,
    pagination,
    onPageChange,
    onSort,
    sortBy,
    sortOrder,
    onRowClick,
    emptyState
}: ReturnsTableProps) {
    const handleSortClick = (key: string) => {
        if (onSort) {
            onSort(key);
        }
    };

    if (isLoading && data.length === 0) {
        return <TableSkeleton rows={10} columns={7} />;
    }

    if (!isLoading && data.length === 0) {
        if (emptyState) return <>{emptyState}</>;

        return (
            <div className="flex flex-col items-center justify-center py-16 bg-[var(--bg-primary)] rounded-lg border border-dashed border-[var(--border-default)]">
                <EmptyState
                    variant="noData"
                    title="No returns found"
                    description="No return requests match your current criteria."
                    action={{
                        label: "Refresh Data",
                        onClick: onRefresh,
                        icon: <RefreshCw className="w-4 h-4" />
                    }}
                />
            </div>
        );
    }

    return (
        <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg shadow-sm overflow-hidden flex flex-col h-full">
            <div className="overflow-auto flex-1">
                <Table>
                    <TableHeader className="bg-[var(--bg-secondary)] sticky top-0 z-10">
                        <TableRow className="border-b border-[var(--border-default)] hover:bg-transparent">
                            <TableHead className="w-[180px] cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={() => handleSortClick('returnId')}>
                                <div className="flex items-center gap-1">
                                    Return ID
                                    <ArrowUpDown size={12} className={sortBy === 'returnId' ? 'text-[var(--primary-blue)]' : ''} />
                                </div>
                            </TableHead>
                            <TableHead className="cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={() => handleSortClick('createdAt')}>
                                <div className="flex items-center gap-1">
                                    Date
                                    <ArrowUpDown size={12} className={sortBy === 'createdAt' ? 'text-[var(--primary-blue)]' : ''} />
                                </div>
                            </TableHead>
                            <TableHead className="text-[var(--text-secondary)]">Order Info</TableHead>
                            <TableHead className="text-[var(--text-secondary)]">Customer</TableHead>
                            <TableHead className="text-[var(--text-secondary)]">Items</TableHead>
                            <TableHead className="text-right cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={() => handleSortClick('amount')}>
                                <div className="flex items-center justify-end gap-1">
                                    Refund Amount
                                    <ArrowUpDown size={12} className={sortBy === 'amount' ? 'text-[var(--primary-blue)]' : ''} />
                                </div>
                            </TableHead>
                            <TableHead className="text-center cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={() => handleSortClick('status')}>
                                <div className="flex items-center justify-center gap-1">
                                    Status
                                    <ArrowUpDown size={12} className={sortBy === 'status' ? 'text-[var(--primary-blue)]' : ''} />
                                </div>
                            </TableHead>
                            <TableHead className="text-center text-[var(--text-secondary)]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <AnimatePresence>
                            {data.map((returnReq, index) => {
                                const orderNumber = typeof returnReq.orderId === 'object' ? returnReq.orderId.orderNumber : returnReq.orderId;
                                const refundAmount = returnReq.refundDetails?.totalRefund ?? returnReq.estimatedRefund ?? 0;

                                return (
                                    <motion.tr
                                        key={returnReq._id || returnReq.returnId}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ delay: index * 0.05, duration: 0.2 }}
                                        className="group hover:bg-[var(--bg-hover)] transition-colors border-b last:border-0 border-[var(--border-subtle)] cursor-pointer"
                                        onClick={() => onRowClick(returnReq)}
                                    >
                                        <TableCell>
                                            <div className="font-mono font-medium text-[var(--primary-blue)] hover:underline">
                                                {returnReq.returnId || returnReq._id.slice(-8).toUpperCase()}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm text-[var(--text-secondary)]">
                                                {formatDate(returnReq.requestedAt)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-medium text-[var(--text-primary)]">{orderNumber}</span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-[var(--text-primary)]">{returnReq.customerName}</span>
                                                <span className="text-xs text-[var(--text-secondary)]">{returnReq.customerPhone}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="max-w-[200px]">
                                                <div className="text-[var(--text-secondary)] truncate font-medium">
                                                    {returnReq.items[0]?.productName}
                                                </div>
                                                {returnReq.items.length > 1 && (
                                                    <div className="text-xs text-[var(--text-tertiary)]">
                                                        +{returnReq.items.length - 1} more items
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="font-medium text-[var(--success)]">
                                                {formatCurrency(refundAmount)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <StatusBadge
                                                domain="return"
                                                status={returnReq.status}
                                            />
                                        </TableCell>
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <div className="flex justify-center items-center gap-2">
                                                <ViewActionButton
                                                    onClick={() => onRowClick(returnReq)}
                                                />
                                            </div>
                                        </TableCell>
                                    </motion.tr>
                                );
                            })}
                        </AnimatePresence>
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            {pagination && (
                <div className="p-4 border-t border-[var(--border-default)] bg-[var(--bg-secondary)]/50 flex justify-between items-center text-xs text-[var(--text-tertiary)]">
                    <span>Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} returns</span>
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
