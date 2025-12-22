"use client";

import { cn, formatCurrency } from '@/lib/utils';
import { ArrowUpRight, Trophy, TrendingUp, TrendingDown, Crown } from 'lucide-react';
import Link from 'next/link';

// Mock data - in a real app this would likely come from props or a hook
const topSellers = [
    { rank: 1, name: 'TechGadgets Inc.', volume: 342, revenue: 485000, growth: 15, avatar: 'TG', trend: [65, 59, 80, 81, 56, 95, 94] },
    { rank: 2, name: 'Fashion Hub', volume: 289, revenue: 412000, growth: 8, avatar: 'FH', trend: [40, 60, 55, 70, 65, 85, 88] },
    { rank: 3, name: 'HomeDecor Plus', volume: 245, revenue: 356000, growth: 22, avatar: 'HD', trend: [85, 80, 75, 70, 72, 68, 76] },
    { rank: 4, name: 'SportsZone', volume: 198, revenue: 298000, growth: -3, avatar: 'SZ', trend: [50, 60, 70, 80, 85, 90, 91] },
    { rank: 5, name: 'BookWorld', volume: 176, revenue: 245000, growth: 12, avatar: 'BW', trend: [60, 55, 65, 75, 70, 80, 82] }
];

export function TopSellers() {
    return (
        <div className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-3xl overflow-hidden flex flex-col h-full shadow-sm animate-fade-in stagger-6">
            {/* Header */}
            <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-sm">
                        <Trophy className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="font-bold text-[var(--text-primary)] text-lg">Top Sellers</h2>
                        <p className="text-xs text-[var(--text-secondary)] font-medium">Performance Leaderboard</p>
                    </div>
                </div>
                <Link
                    href="/admin/sellers"
                    className="flex items-center gap-1 text-xs font-bold text-[var(--primary-blue)] hover:text-[var(--primary-blue-deep)] bg-[var(--primary-blue-soft)] hover:bg-[var(--primary-blue-soft)]/80 px-3 py-1.5 rounded-lg transition-all duration-200 group"
                >
                    View All
                    <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto p-2">
                <div className="space-y-1">
                    {topSellers.map((seller, index) => {
                        const isTop3 = index < 3;
                        return (
                            <div
                                key={seller.rank}
                                className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-[var(--bg-secondary)] transition-all duration-200 border border-transparent hover:border-[var(--border-subtle)]"
                            >
                                {/* Rank */}
                                <div className={cn(
                                    "flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm",
                                    seller.rank === 1 ? "bg-gradient-to-br from-yellow-300 to-amber-500 text-white shadow-md shadow-amber-500/20" :
                                        seller.rank === 2 ? "bg-gradient-to-br from-slate-300 to-slate-500 text-white shadow-md shadow-slate-500/20" :
                                            seller.rank === 3 ? "bg-gradient-to-br from-orange-300 to-orange-500 text-white shadow-md shadow-orange-500/20" :
                                                "bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border-subtle)]"
                                )}>
                                    {seller.rank <= 3 ? <Crown className="h-4 w-4" /> : `#${seller.rank}`}
                                </div>

                                {/* Avatar & Info */}
                                <div className="flex-1 min-w-0 flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-xs font-bold text-[var(--text-secondary)] border border-[var(--border-subtle)] group-hover:border-[var(--border-default)] transition-colors">
                                        {seller.avatar}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-[var(--text-primary)] text-sm truncate">{seller.name}</h3>
                                        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                                            <span>{seller.volume} shipments</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Metrics */}
                                <div className="text-right hidden sm:block">
                                    <p className="font-bold text-[var(--text-primary)] text-sm">{formatCurrency(seller.revenue)}</p>
                                    <div className={cn(
                                        "flex items-center justify-end gap-1 text-[10px] font-bold",
                                        seller.growth > 0 ? "text-[var(--success)]" : "text-[var(--error)]"
                                    )}>
                                        {seller.growth > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                        {Math.abs(seller.growth)}%
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
