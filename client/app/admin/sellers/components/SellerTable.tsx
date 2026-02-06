
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
    ArrowUpDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { HealthGauge } from '@/src/components/ui/visualizations/HealthGauge';
import { SuspendUserModal } from './SuspendUserModal';

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
}

export function SellerTable({ data, isLoading, onRefresh, pagination, onPageChange }: SellerTableProps) {
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

    // Sorting logic (Server-side sort preferred, but client-side sort maintained for now if needed)
    // Ideally we pass sort to parent, but for this step we keep client sort on the current page to avoid complexity
    const sortedData = React.useMemo(() => {
        if (!sortConfig) return data;

        return [...data].sort((a, b) => {
            let aValue: any;
            let bValue: any;

            // Handle nested properties based on sort key
            switch (sortConfig.key) {
                case 'companyName':
                    aValue = a.companyName;
                    bValue = b.companyName;
                    break;
                case 'healthScore':
                    aValue = a.healthScore;
                    bValue = b.healthScore;
                    break;
                case 'orderVolume':
                    aValue = a.metrics.orderVolume;
                    bValue = b.metrics.orderVolume;
                    break;
                case 'revenue':
                    aValue = a.metrics.revenue;
                    bValue = b.metrics.revenue;
                    break;
                default:
                    aValue = a.companyName;
                    bValue = b.companyName;
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [data, sortConfig]);

    const [suspendModalOpen, setSuspendModalOpen] = useState(false);
    const [selectedSeller, setSelectedSeller] = useState<{ id: string; name: string } | null>(null);
    const router = useRouter();

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
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

    const StatusBadge = ({ status, text }: { status: string, text: string }) => {
        const styles = {
            excellent: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
            good: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
            fair: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20",
            warning: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20",
            critical: "bg-red-50 text-red-700 border-red-200 animate-pulse dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
        };
        const style = styles[status as keyof typeof styles] || styles.fair;

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>
                {status === 'excellent' && <CheckCircle2 size={12} className="mr-1" />}
                {status === 'critical' && <AlertTriangle size={12} className="mr-1" />}
                {text.toUpperCase()}
            </span>
        );
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
                                <TableHead className="w-[300px] cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={() => handleSort('companyName')}>
                                    <div className="flex items-center gap-1">Seller Identity <ArrowUpDown size={12} /></div>
                                </TableHead>
                                <TableHead className="text-center cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={() => handleSort('healthScore')}>
                                    <div className="flex items-center justify-center gap-1">Health Score <ArrowUpDown size={12} /></div>
                                </TableHead>
                                <TableHead className="text-right cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={() => handleSort('orderVolume')}>
                                    <div className="flex items-center justify-end gap-1">Orders <ArrowUpDown size={12} /></div>
                                </TableHead>
                                <TableHead className="text-right cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={() => handleSort('revenue')}>
                                    <div className="flex items-center justify-end gap-1">Revenue <ArrowUpDown size={12} /></div>
                                </TableHead>
                                <TableHead className="text-center text-[var(--text-secondary)]">Risk Metrics (RTO/NDR)</TableHead>
                                <TableHead className="text-center text-[var(--text-secondary)]">Status</TableHead>
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
                                        className="group hover:bg-[var(--bg-hover)] transition-colors border-b last:border-0 border-[var(--border-subtle)]"
                                    >
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-secondary)] font-bold text-sm shadow-sm">
                                                    {seller.companyName ? seller.companyName.substring(0, 2).toUpperCase() : '??'}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-[var(--text-primary)] line-clamp-1">{seller.companyName}</div>
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
                                            <div className="flex flex-col gap-1 items-center">
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className="text-[var(--text-tertiary)]">RTO:</span>
                                                    <span className={`font-medium ${seller.metrics.rtoRate > 30 ? 'text-red-600 dark:text-red-400' : 'text-[var(--text-secondary)]'}`}>
                                                        {seller.metrics.rtoRate.toFixed(1)}%
                                                    </span>
                                                </div>
                                                <div className="w-24 h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${seller.metrics.rtoRate > 30 ? 'bg-red-500' : 'bg-slate-400 dark:bg-slate-600'}`}
                                                        style={{ width: `${Math.min(seller.metrics.rtoRate, 100)}%` }}
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className="text-[var(--text-tertiary)]">NDR:</span>
                                                    <span className="font-medium text-[var(--text-secondary)]">{seller.metrics.ndrRate.toFixed(1)}%</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <StatusBadge status={seller.status} text={seller.status} />
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
                                                                    onClick={() => handleViewDetails(seller.sellerId)}
                                                                >
                                                                    <ExternalLink size={14} /> View Details
                                                                </button>
                                                                <button
                                                                    className="w-full text-left px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] flex items-center gap-2"
                                                                    onClick={() => { setActiveDropdown(null); /* Contact */ }}
                                                                >
                                                                    <ShieldAlert size={14} /> View Risk Profile
                                                                </button>
                                                                <div className="h-px bg-[var(--border-subtle)] my-1" />
                                                                <button
                                                                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2"
                                                                    onClick={() => handleSuspendClick(seller)}
                                                                >
                                                                    <AlertTriangle size={14} /> Suspend Account
                                                                </button>
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
                    // Optionally show a toast here
                }}
            />
        </>
    );
}
