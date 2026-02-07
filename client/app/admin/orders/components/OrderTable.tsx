
import React, { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/src/components/ui/core/Table';
import { Order } from '@/src/types/domain/order';
import {
    MoreHorizontal,
    ExternalLink,
    Truck,
    ArrowUpDown,
    Trash2,
    Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Badge } from '@/src/components/ui/core/Badge';
import { formatCurrency, cn } from '@/src/lib/utils';
import { format } from 'date-fns';
import { Button } from '@/src/components/ui/core/Button';
import { Tooltip } from '@/src/components/ui/feedback/Tooltip';

interface OrderTableProps {
    data: Order[];
    isLoading: boolean;
    onRefresh: () => void;
    pagination?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number; // Mapped from 'pages' if needed
    };
    onPageChange?: (page: number) => void;
    onSort?: (key: string) => void;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    onShip?: (order: Order) => void;
}

export function OrderTable({
    data,
    isLoading,
    onRefresh,
    pagination,
    onPageChange,
    onSort,
    sortBy,
    sortOrder,
    onShip
}: OrderTableProps) {
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const router = useRouter();

    const handleSortClick = (key: string) => {
        if (onSort) {
            onSort(key);
        }
    };

    const toggleDropdown = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (activeDropdown === id) {
            setActiveDropdown(null);
        } else {
            setActiveDropdown(id);
        }
    };

    const handleViewDetails = (orderId: string) => {
        router.push(`/admin/orders/${orderId}`);
        setActiveDropdown(null);
    };

    const statusColors: Record<string, string> = {
        new: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        ready: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        shipped: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        rto: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        pending: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    };

    if (isLoading && data.length === 0) {
        return (
            <div className="w-full h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue"></div>
            </div>
        );
    }

    if (!isLoading && data.length === 0) {
        return (
            <div className="text-center py-12 bg-[var(--bg-primary)] rounded-lg border border-dashed border-[var(--border-default)]">
                <p className="text-[var(--text-tertiary)]">No orders found matching your criteria.</p>
            </div>
        );
    }

    return (
        <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg shadow-sm overflow-hidden flex flex-col h-full">
            <div className="overflow-auto flex-1">
                <Table>
                    <TableHeader className="bg-[var(--bg-secondary)] sticky top-0 z-10">
                        <TableRow className="border-b border-[var(--border-default)] hover:bg-transparent">
                            <TableHead className="w-[180px] cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={() => handleSortClick('orderNumber')}>
                                <div className="flex items-center gap-1">
                                    Order ID
                                    <ArrowUpDown size={12} className={sortBy === 'orderNumber' ? 'text-[var(--primary-blue)]' : ''} />
                                </div>
                            </TableHead>
                            <TableHead className="cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={() => handleSortClick('customer')}>
                                <div className="flex items-center gap-1">
                                    Customer
                                    <ArrowUpDown size={12} className={sortBy === 'customer' ? 'text-[var(--primary-blue)]' : ''} />
                                </div>
                            </TableHead>
                            <TableHead className="text-[var(--text-secondary)]">Product</TableHead>
                            <TableHead className="text-right cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={() => handleSortClick('amount')}>
                                <div className="flex items-center justify-end gap-1">
                                    Amount
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
                            {data.map((order, index) => (
                                <motion.tr
                                    key={order._id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ delay: index * 0.05, duration: 0.2 }}
                                    className="group hover:bg-[var(--bg-hover)] transition-colors border-b last:border-0 border-[var(--border-subtle)]"
                                    onClick={() => handleViewDetails(order.orderNumber)} // Entire row clickable
                                >
                                    <TableCell>
                                        <div>
                                            <div className="font-medium text-[var(--text-primary)]">{order.orderNumber}</div>
                                            <div className="text-xs text-[var(--text-tertiary)]">{format(new Date(order.createdAt), 'MMM d, h:mm a')}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <div className="text-[var(--text-primary)] font-medium">{order.customerInfo?.name}</div>
                                            <div className="text-xs text-[var(--text-tertiary)]">{order.customerInfo?.phone}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="max-w-[200px]">
                                            <div className="text-[var(--text-secondary)] truncate">
                                                {order.products?.[0]?.name}
                                            </div>
                                            {order.products?.length > 1 && (
                                                <div className="text-xs text-[var(--text-tertiary)]">
                                                    +{order.products.length - 1} more items
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="font-medium text-[var(--text-primary)]">
                                            {formatCurrency(order.totals?.total || 0)}
                                            <div className="flex items-center justify-end gap-1 mt-0.5">
                                                <span className={cn(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    order.paymentMethod === 'cod' ? "bg-[var(--warning)]" : "bg-[var(--success)]"
                                                )} />
                                                <span className="text-xs text-[var(--text-secondary)] capitalize">{order.paymentMethod}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge className={statusColors[order.currentStatus] || 'bg-gray-100 text-gray-700'}>
                                            {order.currentStatus}
                                        </Badge>
                                    </TableCell>
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        <div className="flex justify-center relative">
                                            {['new', 'ready'].includes(order.currentStatus) ? (
                                                <Tooltip content="Ship Order">
                                                    <Button
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onShip?.(order);
                                                        }}
                                                        className="bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white h-8 px-3 text-xs shadow-custom"
                                                    >
                                                        <Truck className="h-3 w-3 mr-1.5" />
                                                        Ship
                                                    </Button>
                                                </Tooltip>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={(e) => toggleDropdown(order._id, e)}
                                                        className={`p-2 rounded-full transition-colors ${activeDropdown === (order._id) ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'}`}
                                                    >
                                                        <MoreHorizontal size={18} />
                                                    </button>

                                                    {/* Custom Dropdown Menu */}
                                                    {activeDropdown === (order._id) && (
                                                        <>
                                                            <div
                                                                className="fixed inset-0 z-10"
                                                                onClick={(e) => { e.stopPropagation(); setActiveDropdown(null); }}
                                                            />
                                                            <div className="absolute right-0 top-10 mt-1 w-48 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                                                                <div className="py-1">
                                                                    <button
                                                                        className="w-full text-left px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] flex items-center gap-2"
                                                                        onClick={() => handleViewDetails(order.orderNumber)}
                                                                    >
                                                                        <Eye size={14} /> View Details
                                                                    </button>
                                                                    <div className="h-px bg-[var(--border-subtle)] my-1" />
                                                                    <button
                                                                        className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2"
                                                                        onClick={(e) => { e.stopPropagation(); setActiveDropdown(null); /* Handle Delete */ }}
                                                                    >
                                                                        <Trash2 size={14} /> Delete Order
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </>
                                            )}
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
                    <span>Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} orders</span>
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
