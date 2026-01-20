"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Package } from 'lucide-react';
import { useAuth } from '@/src/features/auth';
import { DateRangePicker } from '@/src/components/ui/form/DateRangePicker';
import { DashboardSetupBanner } from '../dashboard/components/DashboardSetupBanner';
import {
    PullToRefresh,
    FloatingActionButton,
    ScrollToTopButton
} from '@/src/components/patterns';

// Dashboard v3 Components
import {
    UrgentActionsBar,
    BusinessHeroSection,
    QuickActionsGrid,
    OrderStatusGrid,
    AnalyticsSection,
    SmartInsightsPanel,
    CODStatusCard
} from '@/src/components/seller/dashboard';

// Mock Data
import {
    getPendingPickups,
    getRTOOrders,
    getTodaySnapshot,
    getTopInsights
} from '@/src/lib/mockData/enhanced';

// --- ANIMATION VARIANTS ---
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

export function DashboardClient() {
    const { user } = useAuth();
    const router = useRouter();
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Get greeting based on time
    const getGreeting = () => {
        const hour = currentTime.getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    // --- PREPARE DATA FOR COMPONENTS ---

    // 1. Urgent Actions Logic

    const pendingPickups = getPendingPickups();
    const rtoOrders = getRTOOrders();

    // Simulate some logic to determine urgent actions
    const urgentActions = [
        ...(pendingPickups.length > 0 ? [{
            id: 'pickup-1',
            type: 'pickup' as const,
            title: 'Pickups Pending',
            description: `${pendingPickups.length} orders waiting for courier pickup`,
            count: pendingPickups.length,
            ctaLabel: 'Schedule Pickup',
            ctaUrl: '/seller/orders?status=pending_pickup',
            severity: 'high' as const
        }] : []),
        ...(rtoOrders.length > 0 ? [{
            id: 'rto-1',
            type: 'rto' as const,
            title: 'RTO Risk Detected',
            description: `${rtoOrders.length} orders flagged for RTO risk`,
            count: rtoOrders.length,
            ctaLabel: 'Review Cases',
            ctaUrl: '/seller/orders?status=rto_risk',
            severity: 'medium' as const
        }] : []),
        {
            id: 'wallet-1',
            type: 'wallet' as const,
            title: 'Low Wallet Balance',
            description: 'Balance below ₹1,000 threshold',
            ctaLabel: 'Recharge Now',
            ctaUrl: '/seller/wallet',
            severity: 'high' as const
        }
    ];

    // 2. Snapshot Data Logic - Use enhanced mock data
    const todayData = getTodaySnapshot();

    // Smart insights data
    const smartInsights = getTopInsights(3);

    // 3. Analytics Data Logic
    const analyticsData = {
        orderTrend: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            values: [45, 52, 38, 65, 48, 59, 42] // Realistic variation
        },
        topCouriers: [
            { name: 'Delhivery', orders: 156, avgCost: 65 },
            { name: 'BlueDart', orders: 89, avgCost: 82 },
            { name: 'Ecom Express', orders: 45, avgCost: 58 }
        ],
        zoneDistribution: [
            { zone: 'A', percentage: 45, orders: 130 },
            { zone: 'B', percentage: 30, orders: 87 },
            { zone: 'C', percentage: 15, orders: 43 },
            { zone: 'D', percentage: 10, orders: 29 }
        ]
    };

    // 4. Refresh Handler
    const handleRefresh = async () => {
        // Simulate data fetching
        await new Promise(resolve => setTimeout(resolve, 1500));
        setCurrentTime(new Date());
        // In a real app, you would re-fetch queries here
    };

    return (
        <PullToRefresh onRefresh={handleRefresh}>
            <div className="min-h-screen space-y-8 pb-10">
                {/* 1. Enhanced Welcome Header */}
                <header className="relative rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] p-6">
                    <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex-1"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.2, type: "spring" }}
                                    className="px-2.5 py-1 rounded-md bg-[var(--success-bg)] border border-[var(--success)]/20 flex items-center gap-2"
                                >
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--success)] opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--success)]"></span>
                                    </span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--success)]">Live System</span>
                                </motion.div>
                                <span className="text-xs text-[var(--text-muted)] font-medium">
                                    {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                                </span>
                            </div>
                            <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight mb-1">
                                {getGreeting()}, {user?.name?.split(' ')[0] || 'Seller'}
                            </h1>
                            <p className="text-sm text-[var(--text-secondary)]">
                                Here&apos;s what&apos;s happening with your shipments today.
                            </p>
                        </motion.div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                            <DateRangePicker />
                            <Link href="/seller/orders/create">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="px-4 py-2 rounded-lg bg-[var(--primary-blue)] text-white hover:bg-[var(--primary-blue-deep)] transition-colors flex items-center gap-2 font-medium text-sm shadow-sm"
                                >
                                    <Package className="w-4 h-4" />
                                    <span>Create Order</span>
                                </motion.button>
                            </Link>
                        </div>
                    </div>
                </header>

                {/* Setup Banner */}
                <DashboardSetupBanner />

                {/* PRIORITY 1: URGENT ACTIONS (Cannot miss - Loss aversion psychology) */}
                {urgentActions.length > 0 && (
                    <motion.section
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <UrgentActionsBar actions={urgentActions} />
                    </motion.section>
                )}

                {/* PRIORITY 2: BUSINESS HERO (Money + Wallet + Primary CTA) */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <BusinessHeroSection
                        revenue={todayData.revenue}
                        profit={todayData.profit}
                        shippingCost={todayData.shippingCost}
                        orders={todayData.orders}
                        walletBalance={todayData.walletBalance}
                    />
                </motion.section>

                {/* PRIORITY 3: ORDER STATUS GRID (Critical Business State) */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                >
                    <OrderStatusGrid
                        statusCounts={{
                            pending: pendingPickups.length,
                            shipped: todayData.activeShipments,
                            delivered: todayData.delivered,
                            rto: rtoOrders.length,
                            failed: 2,
                            cancelled: 5
                        }}
                    />
                </motion.section>

                {/* PRIORITY 4: COD STATUS (65% of Indian orders - needs visibility) */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <CODStatusCard
                        pendingAmount={todayData.pendingCOD}
                        readyForRemittance={Math.floor(todayData.pendingCOD * 0.6)}
                        lastRemittanceAmount={18500}
                    />
                </motion.section>

                {/* PRIORITY 5: QUICK ACTIONS (Contextual Common Tasks) */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                >
                    <QuickActionsGrid
                        walletBalance={todayData.walletBalance}
                        pendingPickups={pendingPickups.length}
                    />
                </motion.section>

                {/* PRIORITY 6: SMART INSIGHTS (Recommendations - Progressive Disclosure) */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <SmartInsightsPanel
                        insights={smartInsights}
                        onApply={(id) => console.log('Applied insight:', id)}
                    />
                </motion.section>

                {/* PRIORITY 7: ANALYTICS (Details on Demand) */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                >
                    <AnalyticsSection data={analyticsData} />
                </motion.section>

                {/* Mobile FAB - Create Order (Thumb-zone optimized) */}
                <FloatingActionButton
                    icon={<Package className="w-5 h-5" />}
                    label="Create Order"
                    onClick={() => router.push('/seller/orders/create')}
                    position="bottom-right"
                    variant="primary"
                />

                {/* Scroll to top button */}
                <ScrollToTopButton showAfter={400} />
            </div>
        </PullToRefresh>
    );
}
