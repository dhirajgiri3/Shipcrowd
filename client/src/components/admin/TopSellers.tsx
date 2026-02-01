"use client";

import { cn, formatCurrency } from '@/src/lib/utils';
import { ArrowUpRight, Trophy, TrendingUp, TrendingDown, Crown } from 'lucide-react';
import Link from 'next/link';

interface TopSellersProps {
    data?: Array<{
        companyId: string;
        companyName: string;
        totalOrders: number;
        totalRevenue: number;
        pendingOrders: number;
        deliveredOrders: number;
    }>;
}

export function TopSellers({ data = [] }: TopSellersProps) {
    if (!data.length) {
        return (
            <div className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-3xl overflow-hidden flex flex-col h-[400px] shadow-sm animate-fade-in stagger-6 p-6 flex items-center justify-center text-[var(--text-muted)]">
                No seller data available
            </div>
        );
    }

    return (
        <div className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-3xl overflow-hidden flex flex-col h-[400px] shadow-sm animate-fade-in stagger-6">
            {/* Header */}
            <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[var(--warning-bg)] flex items-center justify-center text-[var(--warning)] shadow-sm">
                        <Trophy className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="font-bold text-[var(--text-primary)] text-lg">Top Sellers</h2>
                        <p className="text-xs text-[var(--text-secondary)] font-medium">Performance Leaderboard</p>
                    </div>
                </div>
                <Link
                    href="/admin/users?role=seller"
                    className="flex items-center gap-1 text-xs font-bold text-[var(--primary-blue)] hover:text-[var(--primary-blue-deep)] bg-[var(--primary-blue-soft)] hover:bg-[var(--primary-blue-soft)]/80 px-3 py-1.5 rounded-lg transition-all duration-200 group"
                >
                    View All
                    <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto p-2">
                <div className="space-y-1">
                    {data.map((seller, index) => {
                        const rank = index + 1;
                        // Calculate success rate as a proxy for growth/health
                        // Fallback to 0/100 if data missing to avoid weird UI, or just hide
                        const successRate = seller.totalOrders > 0
                            ? Math.round((seller.deliveredOrders / seller.totalOrders) * 100)
                            : 0;

                        const initials = seller.companyName
                            .split(' ')
                            .map(n => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2);

                        return (
                            <div
                                key={seller.companyId}
                                className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-[var(--bg-secondary)] transition-all duration-200 border border-transparent hover:border-[var(--border-subtle)]"
                            >
                                {/* Rank */}
                                <div className={cn(
                                    "flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm",
                                    rank === 1 ? "bg-[var(--warning)] text-white shadow-md shadow-amber-500/20" :
                                        rank === 2 ? "bg-[var(--text-secondary)] text-white shadow-md shadow-slate-500/20" :
                                            rank === 3 ? "bg-[#d97706] text-white shadow-md shadow-orange-500/20" :
                                                "bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border-subtle)]"
                                )}>
                                    {rank <= 3 ? <Crown className="h-4 w-4" /> : `#${rank}`}
                                </div>

                                {/* Avatar & Info */}
                                <div className="flex-1 min-w-0 flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-xs font-bold text-[var(--text-secondary)] border border-[var(--border-subtle)] group-hover:border-[var(--border-default)] transition-colors">
                                        {initials}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-[var(--text-primary)] text-sm truncate">{seller.companyName}</h3>
                                        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                                            <span>{seller.totalOrders} total orders</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Metrics */}
                                <div className="text-right hidden sm:block">
                                    {/* Hide revenue if 0 to avoid showing misleading data */}
                                    {seller.totalRevenue > 0 && (
                                        <p className="font-bold text-[var(--text-primary)] text-sm">{formatCurrency(seller.totalRevenue)}</p>
                                    )}
                                    {seller.totalOrders > 0 && seller.deliveredOrders > 0 && (
                                        <div className={cn(
                                            "flex items-center justify-end gap-1 text-[10px] font-bold",
                                            successRate >= 80 ? "text-[var(--success)]" : "text-[var(--warning)]"
                                        )}>
                                            {successRate >= 80 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                            {successRate}% SR
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
