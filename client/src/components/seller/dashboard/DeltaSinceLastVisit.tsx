/**
 * Delta Since Last Visit Component (Phase 2: Dashboard Optimization)
 * 
 * Shows what changed since seller last opened dashboard:
 * - "+3 new orders"
 * - "Wallet decreased ₹8,500"
 * - "2 new RTO orders"
 * 
 * Reduces cognitive load for frequent dashboard visitors
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Wallet, AlertCircle, TrendingDown, TrendingUp } from 'lucide-react';

interface DashboardSnapshot {
    timestamp: number;
    orderCount: number;
    walletBalance: number;
    rtoCount: number;
}

interface DeltaSinceLastVisitProps {
    currentOrderCount: number;
    currentWalletBalance: number;
    currentRtoCount: number;
}

export function DeltaSinceLastVisit({
    currentOrderCount,
    currentWalletBalance,
    currentRtoCount,
}: DeltaSinceLastVisitProps) {
    const [lastVisit, setLastVisit] = useState<DashboardSnapshot | null>(null);
    const [showSummary, setShowSummary] = useState(false);

    useEffect(() => {
        // Load last visit from localStorage
        const stored = localStorage.getItem('lastDashboardVisit');
        if (stored) {
            const parsed = JSON.parse(stored) as DashboardSnapshot;

            // Only show if last visit was more than 10 minutes ago
            const timeSinceVisit = Date.now() - parsed.timestamp;
            const tenMinutes = 10 * 60 * 1000;

            if (timeSinceVisit > tenMinutes) {
                setLastVisit(parsed);
                setShowSummary(true);
            }
        }

        // Save current snapshot to localStorage
        const currentSnapshot: DashboardSnapshot = {
            timestamp: Date.now(),
            orderCount: currentOrderCount,
            walletBalance: currentWalletBalance,
            rtoCount: currentRtoCount,
        };
        localStorage.setItem('lastDashboardVisit', JSON.stringify(currentSnapshot));
    }, []);

    if (!showSummary || !lastVisit) return null;

    // Calculate deltas
    const orderDelta = currentOrderCount - lastVisit.orderCount;
    const walletDelta = currentWalletBalance - lastVisit.walletBalance;
    const rtoDelta = currentRtoCount - lastVisit.rtoCount;

    // Only show if there are actual changes
    if (orderDelta === 0 && walletDelta === 0 && rtoDelta === 0) return null;

    const formatTimeSince = (timestamp: number) => {
        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'just now';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-4 bg-gradient-to-r from-[var(--primary-blue-soft)] to-[var(--bg-secondary)] border border-[var(--border-subtle)] mb-6"
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">
                            Since You Last Checked
                        </h3>
                        <span className="text-xs text-[var(--text-muted)]">
                            ({formatTimeSince(lastVisit.timestamp)})
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        {/* Orders Delta */}
                        {orderDelta !== 0 && (
                            <div className="flex items-center gap-2">
                                <Package className={`w-4 h-4 ${orderDelta > 0 ? 'text-[var(--success)]' : 'text-[var(--text-secondary)]'}`} />
                                <span className={`text-sm font-medium ${orderDelta > 0 ? 'text-[var(--success)]' : 'text-[var(--text-secondary)]'}`}>
                                    {orderDelta > 0 ? '+' : ''}{orderDelta} {Math.abs(orderDelta) === 1 ? 'order' : 'orders'}
                                </span>
                            </div>
                        )}

                        {/* Wallet Delta */}
                        {walletDelta !== 0 && (
                            <div className="flex items-center gap-2">
                                <Wallet className={`w-4 h-4 ${walletDelta > 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'}`} />
                                <span className={`text-sm font-medium ${walletDelta > 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                                    {walletDelta > 0 ? (
                                        <>
                                            <TrendingUp className="w-3 h-3 inline mr-1" />
                                            +₹{Math.abs(walletDelta).toLocaleString('en-IN')}
                                        </>
                                    ) : (
                                        <>
                                            <TrendingDown className="w-3 h-3 inline mr-1" />
                                            -₹{Math.abs(walletDelta).toLocaleString('en-IN')}
                                        </>
                                    )}
                                </span>
                            </div>
                        )}

                        {/* RTO Delta */}
                        {rtoDelta > 0 && (
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-[var(--error)]" />
                                <span className="text-sm font-medium text-[var(--error)]">
                                    +{rtoDelta} RTO {rtoDelta === 1 ? 'order' : 'orders'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Dismiss button */}
                <button
                    onClick={() => setShowSummary(false)}
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-xs"
                >
                    ✕
                </button>
            </div>
        </motion.div>
    );
}
