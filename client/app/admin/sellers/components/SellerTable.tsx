
import React, { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/src/components/ui/core/Table';
import { SellerHealth } from '@/src/core/api/clients/analytics/sellerHealthApi';
import {
    MoreHorizontal,
    ExternalLink,
    RefreshCw,
    AlertTriangle,
    CheckCircle2,
    ShieldAlert,
    ArrowUpDown,
    Ban
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { HealthGauge } from '@/src/components/ui/visualizations/HealthGauge';
import { SuspendUserModal } from './SuspendUserModal';
import { UnsuspendUserModal } from './UnsuspendUserModal';

interface SellerTableProps {
    data: SellerHealth[];
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
}

export function SellerTable({
    data,
    isLoading,
    onRefresh,
    pagination,
    onPageChange,
    onSort,
    sortBy,
    sortOrder
}: SellerTableProps) {
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

    const sortedData = data;

    const [suspendModalOpen, setSuspendModalOpen] = useState(false);
    const [unsuspendModalOpen, setUnsuspendModalOpen] = useState(false);
    const [selectedSeller, setSelectedSeller] = useState<{ id: string; name: string } | null>(null);
    const router = useRouter();

    const handleSortClick = (key: string) => {
        if (onSort) {
            onSort(key);
        }
    };

    const toggleDropdown = (id: string) => {
        if (activeDropdown === id) {
            setActiveDropdown(null);
        } else {
            setActiveDropdown(id);
        }
    };

    const handleViewDetails = (sellerId: string) => {
        // Navigate to user details page
        // Assuming route exists based on user-management controller structure
        router.push(`/admin/users/${sellerId}`);
        setActiveDropdown(null);
    };

    const handleSuspendClick = (seller: SellerHealth) => {
        setSelectedSeller({ id: seller.sellerId, name: seller.companyName });
        setSuspendModalOpen(true);
        setActiveDropdown(null);
    };

    const handleUnsuspendClick = (seller: SellerHealth) => {
        setSelectedSeller({ id: seller.sellerId, name: seller.companyName });
        setUnsuspendModalOpen(true);
        setActiveDropdown(null);
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
                <p className="text-[var(--text-tertiary)]">No sellers found matching your criteria.</p>
            </div>
        );
    }

    return (
        <>
            <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg shadow-sm overflow-hidden flex flex-col h-full">
                <div className="overflow-auto flex-1">
                    <Table>
                        <TableHeader className="bg-[var(--bg-secondary)] sticky top-0 z-10">
                            <TableRow className="border-b border-[var(--border-default)] hover:bg-transparent">
                                <TableHead className="w-[300px] cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={() => handleSortClick('companyName')}>
                                    <div className="flex items-center gap-1">
                                        Seller Identity
                                        <ArrowUpDown size={12} className={sortBy === 'companyName' ? 'text-[var(--primary-blue)]' : ''} />
                                    </div>
                                </TableHead>
                                <TableHead className="text-center cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={() => handleSortClick('healthScore')}>
                                    <div className="flex items-center justify-center gap-1">
                                        Health Score
                                        <ArrowUpDown size={12} className={sortBy === 'healthScore' ? 'text-[var(--primary-blue)]' : ''} />
                                    </div>
                                </TableHead>
                                <TableHead className="text-right cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={() => handleSortClick('orderVolume')}>
                                    <div className="flex items-center justify-end gap-1">
                                        Orders
                                        <ArrowUpDown size={12} className={sortBy === 'orderVolume' ? 'text-[var(--primary-blue)]' : ''} />
                                    </div>
                                </TableHead>
                                <TableHead className="text-right cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={() => handleSortClick('revenue')}>
                                    <div className="flex items-center justify-end gap-1">
                                        Revenue
                                        <ArrowUpDown size={12} className={sortBy === 'revenue' ? 'text-[var(--primary-blue)]' : ''} />
                                    </div>
                                </TableHead>
                                <TableHead className="text-center text-[var(--text-secondary)]">Risk Metrics (RTO/NDR)</TableHead>
                                <TableHead className="text-center text-[var(--text-secondary)]">Actions</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <AnimatePresence>
                                {sortedData.map((seller, index) => (
                                    <motion.tr
                                        key={seller.sellerId}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ delay: index * 0.05, duration: 0.2 }}
                                        className={`group hover:bg-[var(--bg-hover)] transition-colors border-b last:border-0 border-[var(--border-subtle)] ${seller.isSuspended ? 'bg-red-50/50 dark:bg-red-900/5' : ''}`}
                                    >
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-secondary)] font-bold text-sm shadow-sm relative">
                                                    {seller.companyName ? seller.companyName.substring(0, 2).toUpperCase() : '??'}
                                                    {seller.isSuspended && (
                                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-[var(--bg-primary)] flex items-center justify-center">
                                                            <Ban size={10} className="text-white" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="font-medium text-[var(--text-primary)] line-clamp-1">{seller.companyName}</div>
                                                        {seller.isSuspended && (
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800 uppercase tracking-wide">
                                                                Suspended
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-[var(--text-tertiary)]">{seller.email}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center">
                                                <HealthGauge score={seller.healthScore} size="md" />
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-[var(--text-secondary)]">
                                            {seller.metrics.orderVolume.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-[var(--text-secondary)]">
                                            ₹{seller.metrics.revenue.toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col items-center gap-2">
                                                {(() => {
                                                    const rto = seller.metrics.rtoRate;
                                                    const ndr = seller.metrics.ndrRate;
                                                    let riskLevel = 'Low';
                                                    let riskColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30';
                                                    let riskIcon = <CheckCircle2 size={12} />;

                                                    if (rto > 30 || ndr > 20) {
                                                        riskLevel = 'Critical';
                                                        riskColor = 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400 border-red-200 dark:border-red-500/30';
                                                        riskIcon = <ShieldAlert size={12} />;
                                                    } else if (rto > 15 || ndr > 10) {
                                                        riskLevel = 'High';
                                                        riskColor = 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-400 border-orange-200 dark:border-orange-500/30';
                                                        riskIcon = <AlertTriangle size={12} />;
                                                    } else if (rto > 5 || ndr > 5) {
                                                        riskLevel = 'Moderate';
                                                        riskColor = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30';
                                                        riskIcon = <AlertTriangle size={12} />;
                                                    }

                                                    return (
                                                        <>
                                                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold ${riskColor}`}>
                                                                {riskIcon}
                                                                {riskLevel} Risk
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2 w-full max-w-[140px]">
                                                                <div className="flex flex-col items-center p-1.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
                                                                    <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">RTO</span>
                                                                    <span className={`text-xs font-bold ${rto > 15 ? 'text-red-600' : 'text-[var(--text-primary)]'}`}>
                                                                        {rto.toFixed(1)}%
                                                                    </span>
                                                                </div>
                                                                <div className="flex flex-col items-center p-1.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
                                                                    <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">NDR</span>
                                                                    <span className={`text-xs font-bold ${ndr > 10 ? 'text-orange-600' : 'text-[var(--text-primary)]'}`}>
                                                                        {ndr.toFixed(1)}%
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <button
                                                onClick={() => handleViewDetails(seller.sellerId)}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--primary-blue)] bg-[var(--primary-blue-soft)] hover:bg-[var(--primary-blue)] hover:text-white transition-colors border border-[var(--primary-blue)]/20"
                                            >
                                                <ExternalLink size={14} /> View Details
                                            </button>
                                        </TableCell>
                                        <TableCell>
                                            <div className="relative">
                                                <button
                                                    onClick={() => toggleDropdown(seller.sellerId)}
                                                    className={`p-2 rounded-full transition-colors ${activeDropdown === seller.sellerId ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'}`}
                                                >
                                                    <MoreHorizontal size={18} />
                                                </button>

                                                {/* Dropdown Menu */}
                                                {activeDropdown === seller.sellerId && (
                                                    <>
                                                        <div
                                                            className="fixed inset-0 z-10"
                                                            onClick={() => setActiveDropdown(null)}
                                                        />
                                                        <div className="absolute right-0 mt-1 w-48 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                                                            <div className="py-1">
                                                                <button
                                                                    className="w-full text-left px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] flex items-center gap-2"
                                                                    onClick={() => { setActiveDropdown(null); /* Contact */ }}
                                                                >
                                                                    <ShieldAlert size={14} /> View Risk Profile
                                                                </button>
                                                                <div className="h-px bg-[var(--border-subtle)] my-1" />

                                                                {seller.isSuspended ? (
                                                                    <button
                                                                        className="w-full text-left px-4 py-2.5 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/10 flex items-center gap-2"
                                                                        onClick={() => handleUnsuspendClick(seller)}
                                                                    >
                                                                        <CheckCircle2 size={14} /> Reactivate Account
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2"
                                                                        onClick={() => handleSuspendClick(seller)}
                                                                    >
                                                                        <AlertTriangle size={14} /> Suspend Account
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
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
                        <span>Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} sellers</span>
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

            <SuspendUserModal
                isOpen={suspendModalOpen}
                onClose={() => setSuspendModalOpen(false)}
                userId={selectedSeller?.id || ''}
                userName={selectedSeller?.name || ''}
                onSuccess={() => {
                    onRefresh();
                }}
            />

            <UnsuspendUserModal
                isOpen={unsuspendModalOpen}
                onClose={() => setUnsuspendModalOpen(false)}
                userId={selectedSeller?.id || ''}
                userName={selectedSeller?.name || ''}
                onSuccess={() => {
                    onRefresh();
                }}
            />
        </>
    );
}
