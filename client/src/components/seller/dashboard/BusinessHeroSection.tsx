/**
 * BusinessHeroSection - Priority 2 in information hierarchy
 * Combines: Money metrics + Wallet status + Primary CTA
 * Psychology: Indian seller mindset - money first, then action
 */

'use client';

import { useRouter } from 'next/navigation';
import { Package, Wallet, TrendingUp, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

interface BusinessHeroSectionProps {
    revenue: number;
    profit: number;
    shippingCost: number;
    orders: number;
    walletBalance: number;
    lowBalanceThreshold?: number;
}

export function BusinessHeroSection({
    revenue,
    profit,
    shippingCost,
    orders,
    walletBalance,
    lowBalanceThreshold = 1000
}: BusinessHeroSectionProps) {
    const router = useRouter();
    const isLowBalance = walletBalance < lowBalanceThreshold;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--primary-blue-soft)] to-[var(--bg-secondary)] border border-[var(--primary-blue)]/30 p-8 shadow-[var(--shadow-lg)]"
        >
            {/* Decorative Gradient Blob */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--primary-blue)]/10 blur-3xl rounded-full pointer-events-none" />

            {/* Content */}
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                {/* Left: Money Metrics (Inline) */}
                <div className="lg:col-span-1 space-y-4">
                    <div>
                        <div className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                            Today&apos;s Performance
                        </div>
                        <div className="space-y-3">
                            {/* Revenue */}
                            <div className="flex items-baseline justify-between">
                                <span className="text-sm text-[var(--text-secondary)] font-medium">Revenue</span>
                                <span className="text-xl font-bold text-[var(--text-primary)]">
                                    ₹{revenue.toLocaleString('en-IN')}
                                </span>
                            </div>
                            {/* Shipping Cost */}
                            <div className="flex items-baseline justify-between">
                                <span className="text-sm text-[var(--text-secondary)] font-medium">Shipping</span>
                                <span className="text-lg font-semibold text-[var(--text-primary)]">
                                    ₹{shippingCost.toLocaleString('en-IN')}
                                </span>
                            </div>
                            {/* Profit */}
                            <div className="flex items-baseline justify-between pt-3 border-t border-[var(--border-subtle)]">
                                <span className="text-sm font-bold text-[var(--success)] uppercase tracking-wide">Net Profit</span>
                                <span className="text-2xl font-bold text-[var(--success)]">
                                    ₹{profit.toLocaleString('en-IN')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Orders Count */}
                    <div className="flex items-center gap-2 text-sm">
                        <Package className="w-4 h-4 text-[var(--primary-blue)]" />
                        <span className="font-semibold text-[var(--text-primary)]">{orders} orders</span>
                        <span className="text-[var(--text-secondary)]">shipped today</span>
                    </div>
                </div>

                {/* Center: Primary CTA */}
                <div className="lg:col-span-1 flex flex-col items-center justify-center py-4">
                    <button
                        onClick={() => router.push('/seller/orders/create')}
                        className="group relative w-full max-w-xs bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white font-bold py-4 px-8 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
                    >
                        <div className="flex items-center justify-center gap-3">
                            <Package className="w-6 h-6" />
                            <span className="text-lg">Create Order</span>
                        </div>
                        <div className="absolute inset-0 rounded-2xl bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
                    </button>
                    <p className="text-xs text-[var(--text-secondary)] mt-3 text-center">
                        Quick order creation for fast shipping
                    </p>
                </div>

                {/* Right: Wallet Status */}
                <div className="lg:col-span-1">
                    <div
                        className={`p-5 rounded-2xl border-2 transition-all ${isLowBalance
                            ? 'bg-[var(--error-bg)] border-[var(--error)]'
                            : 'bg-[var(--bg-primary)] border-[var(--border-subtle)]'
                            }`}
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div
                                className={`p-2 rounded-lg ${isLowBalance
                                    ? 'bg-[var(--error)] text-white'
                                    : 'bg-[var(--success-bg)] text-[var(--success)]'
                                    }`}
                            >
                                {isLowBalance ? (
                                    <AlertTriangle className="w-5 h-5" />
                                ) : (
                                    <Wallet className="w-5 h-5" />
                                )}
                            </div>
                            <div>
                                <div className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide">
                                    Wallet Balance
                                </div>
                                <div className={`text-2xl font-bold ${isLowBalance ? 'text-[var(--error)]' : 'text-[var(--text-primary)]'
                                    }`}>
                                    ₹{walletBalance.toLocaleString('en-IN')}
                                </div>
                            </div>
                        </div>

                        {isLowBalance ? (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs text-[var(--error)] font-medium">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>Balance low - recharge to continue shipping</span>
                                </div>
                                <button
                                    onClick={() => router.push('/seller/wallet')}
                                    className="w-full bg-[var(--error)] hover:bg-[var(--error)]/90 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                                >
                                    Recharge Now
                                </button>
                            </div>
                        ) : (
                            <a
                                href="/seller/wallet"
                                className="text-xs text-[var(--primary-blue)] hover:text-[var(--primary-blue-deep)] font-medium flex items-center gap-1 transition-colors"
                            >
                                View Transactions
                                <TrendingUp className="w-3 h-3" />
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
