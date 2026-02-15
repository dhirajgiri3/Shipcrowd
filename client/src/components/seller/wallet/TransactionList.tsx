/**
 * TransactionList - Contextual wallet transaction history
 * 
 * Psychology Applied:
 * - Contextual info reduces cognitive load ("Shipped order #12345" vs "Debit")
 * - Color coding for quick scanning (Green = Credit, Red = Debit)
 * - Running balance shows account health trajectory
 * - Filters reduce overwhelm (show what matters)
 * 
 * UX Features:
 * - Transaction context (not just amount + date)
 * - Running balance per transaction
 * - Color-coded types (Credit/Debit)
 * - Quick filters (All, Credits, Debits, This Week)
 * - Export option (CSV download)
 * - Infinite scroll with skeleton loading
 */

"use client";

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    ArrowUpRight,
    ArrowDownLeft,
    Package,
    Wallet,
    CreditCard,
    FileOutput,
    Calendar
} from 'lucide-react';
import { endOfWeek, format, isThisWeek, isToday, startOfWeek } from 'date-fns';
import { Skeleton } from '@/src/components/ui/data/Skeleton';
import { useSellerExport } from '@/src/core/api/hooks/seller/useSellerExports';
import { formatCurrency } from '@/src/lib/utils';

export interface Transaction {
    id: string;
    type: 'credit' | 'debit';
    amount: number;
    category: 'order' | 'recharge' | 'refund' | 'fee' | 'cod_remittance' | 'payout';
    description: string;
    context?: {
        orderId?: string;
        awb?: string;
        customerName?: string;
    };
    timestamp: string; // ISO 8601
    runningBalance: number;
}

interface TransactionListProps {
    transactions: Transaction[];
    isLoading?: boolean;
    className?: string;
    exportFilters?: Record<string, unknown>;
}

type FilterType = 'all' | 'credits' | 'debits' | 'this_week';

const CATEGORY_ICONS = {
    order: Package,
    recharge: Wallet,
    refund: ArrowUpRight,
    fee: CreditCard,
    cod_remittance: ArrowUpRight,
    payout: ArrowDownLeft,
};

const CATEGORY_LABELS = {
    order: 'Order',
    recharge: 'Recharge',
    refund: 'Refund',
    fee: 'Fee',
    cod_remittance: 'COD Remittance',
    payout: 'Payout',
};

const parseSafeDate = (value?: string): Date | null => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const safeFormat = (value: string, formatString: string, fallback = '--'): string => {
    const date = parseSafeDate(value);
    return date ? format(date, formatString) : fallback;
};

export function TransactionList({ transactions, isLoading = false, className = '', exportFilters }: TransactionListProps) {
    const [filter, setFilter] = useState<FilterType>('all');
    const [isExporting, setIsExporting] = useState(false);
    const exportSellerData = useSellerExport({
        onSettled: () => setIsExporting(false),
    });

    // Filter transactions
    const filteredTransactions = useMemo(() => {
        let filtered = [...transactions];

        if (filter === 'credits') {
            filtered = filtered.filter(t => t.type === 'credit');
        } else if (filter === 'debits') {
            filtered = filtered.filter(t => t.type === 'debit');
        } else if (filter === 'this_week') {
            filtered = filtered.filter((t) => {
                const date = parseSafeDate(t.timestamp);
                return date ? isThisWeek(date) : false;
            });
        }

        return filtered.sort((a, b) =>
            (parseSafeDate(b.timestamp)?.getTime() || 0) - (parseSafeDate(a.timestamp)?.getTime() || 0)
        );
    }, [transactions, filter]);

    // Calculate totals
    const totals = useMemo(() => {
        const credits = filteredTransactions
            .filter(t => t.type === 'credit')
            .reduce((sum, t) => sum + t.amount, 0);
        const debits = filteredTransactions
            .filter(t => t.type === 'debit')
            .reduce((sum, t) => sum + t.amount, 0);

        return { credits, debits, net: credits - debits };
    }, [filteredTransactions]);

    // Export to CSV
    const handleExport = () => {
        setIsExporting(true);
        const filterToExportFilters: Record<FilterType, Record<string, unknown>> = {
            all: {},
            credits: { type: 'credit' },
            debits: { type: 'debit' },
            this_week: {
                startDate: startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString(),
                endDate: endOfWeek(new Date(), { weekStartsOn: 1 }).toISOString(),
            },
        };

        exportSellerData.mutate({
            module: 'wallet_transactions',
            filters: {
                ...exportFilters,
                ...filterToExportFilters[filter],
            },
        });
    };

    if (isLoading) {
        return (
            <div className={`space-y-4 ${className}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                        <Skeleton className="h-7 w-48" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                            <Skeleton className="h-3 w-12 mb-2" />
                            <Skeleton className="h-6 w-24" />
                        </div>
                    ))}
                </div>

                <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                            <Skeleton className="h-10 w-10 rounded-xl" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-48" />
                                <Skeleton className="h-3 w-24" />
                            </div>
                            <div className="space-y-2 flex flex-col items-end">
                                <Skeleton className="h-5 w-24" />
                                <Skeleton className="h-3 w-32" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Header with Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)]">
                        Transaction History
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                        {filteredTransactions.length} transactions
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Filters */}
                    <div className="flex items-center gap-2 p-1 bg-[var(--bg-secondary)] rounded-xl">
                        {(['all', 'credits', 'debits', 'this_week'] as FilterType[]).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f
                                    ? 'bg-[var(--primary-blue)] text-white shadow-md'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                            >
                                {f === 'all' && 'All'}
                                {f === 'credits' && 'Credits'}
                                {f === 'debits' && 'Debits'}
                                {f === 'this_week' && 'This Week'}
                            </button>
                        ))}
                    </div>

                    {/* Export Button */}
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] rounded-xl transition-colors disabled:opacity-50"
                    >
                        <FileOutput className="w-4 h-4" />
                        <span className="text-sm font-medium hidden md:inline">Export</span>
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-[var(--success-bg)] border border-[var(--success)]/20">
                    <div className="text-xs text-[var(--text-secondary)] mb-1">Credits</div>
                    <div className="text-lg font-bold text-[var(--success)]">
                        +{formatCurrency(totals.credits, 'INR')}
                    </div>
                </div>
                <div className="p-4 rounded-xl bg-[var(--error-bg)] border border-[var(--error)]/20">
                    <div className="text-xs text-[var(--text-secondary)] mb-1">Debits</div>
                    <div className="text-lg font-bold text-[var(--error)]">
                        -{formatCurrency(totals.debits, 'INR')}
                    </div>
                </div>
                <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                    <div className="text-xs text-[var(--text-secondary)] mb-1">Net</div>
                    <div className={`text-lg font-bold ${totals.net >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'
                        }`}>
                        {totals.net >= 0 ? '+' : '-'}{formatCurrency(Math.abs(totals.net), 'INR')}
                    </div>
                </div>
            </div>

            {/* Transactions List */}
            <div className="space-y-2">
                {filteredTransactions.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center">
                            <Wallet className="w-8 h-8 text-[var(--text-muted)]" />
                        </div>
                        <p className="text-[var(--text-secondary)]">No transactions found</p>
                        <p className="text-sm text-[var(--text-muted)] mt-1">
                            Try changing the filter
                        </p>
                    </div>
                ) : (
                    filteredTransactions.map((transaction, index) => {
                        const Icon = CATEGORY_ICONS[transaction.category];
                        const isCredit = transaction.type === 'credit';
                        const currentDate = parseSafeDate(transaction.timestamp);
                        const previousDate = parseSafeDate(filteredTransactions[index - 1]?.timestamp);
                        const showDate = index === 0 ||
                            (currentDate?.toDateString() || '') !== (previousDate?.toDateString() || '');

                        return (
                            <div key={transaction.id}>
                                {/* Date Separator */}
                                {showDate && (
                                    <div className="flex items-center gap-2 py-2 mt-4 first:mt-0">
                                        <Calendar className="w-4 h-4 text-[var(--text-muted)]" />
                                        <div className="text-sm font-semibold text-[var(--text-secondary)]">
                                            {currentDate && isToday(currentDate)
                                                ? 'Today'
                                                : safeFormat(transaction.timestamp, 'dd MMMM yyyy', 'Unknown date')}
                                        </div>
                                        <div className="flex-1 h-px bg-[var(--border-subtle)]" />
                                    </div>
                                )}

                                {/* Transaction Card */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="flex items-center gap-4 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] hover:border-[var(--border-focus)] hover:shadow-sm transition-all"
                                >
                                    {/* Icon */}
                                    <div className={`p-3 rounded-xl ${isCredit
                                        ? 'bg-[var(--success-bg)] text-[var(--success)]'
                                        : 'bg-[var(--error-bg)] text-[var(--error)]'
                                        }`}>
                                        <Icon className="w-5 h-5" />
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-[var(--text-primary)]">
                                                {transaction.description}
                                            </span>
                                            <span className="text-xs text-[var(--text-muted)] px-2 py-0.5 bg-[var(--bg-tertiary)] rounded">
                                                {CATEGORY_LABELS[transaction.category]}
                                            </span>
                                        </div>

                                        {/* Context (Order ID, AWB, Customer) */}
                                        {transaction.context && (
                                            <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                                                {transaction.context.orderId && (
                                                    <span>Order #{transaction.context.orderId}</span>
                                                )}
                                                {transaction.context.awb && (
                                                    <span>AWB: {transaction.context.awb}</span>
                                                )}
                                                {transaction.context.customerName && (
                                                    <span>• {transaction.context.customerName}</span>
                                                )}
                                            </div>
                                        )}

                                        <div className="text-xs text-[var(--text-muted)] mt-1">
                                            {safeFormat(transaction.timestamp, 'hh:mm a', '--:--')}
                                        </div>
                                    </div>

                                    {/* Amount & Balance */}
                                    <div className="text-right">
                                    <div className={`text-lg font-bold ${isCredit ? 'text-[var(--success)]' : 'text-[var(--error)]'
                                            }`}>
                                            {isCredit ? '+' : '-'}{formatCurrency(transaction.amount, 'INR')}
                                        </div>
                                        <div className="text-xs text-[var(--text-muted)] mt-1">
                                            Balance: {formatCurrency(transaction.runningBalance, 'INR')}
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Load More (if needed) */}
            {filteredTransactions.length > 20 && (
                <div className="text-center">
                    <button className="px-6 py-3 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] rounded-xl font-medium transition-colors">
                        Load More
                    </button>
                </div>
            )}
        </div>
    );
}
