"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from 'react';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Package } from 'lucide-react';
import { useAuth } from '@/src/features/auth';
import { DateRangePicker } from '@/src/components/ui/form/DateRangePicker';
import { DashboardSetupBanner } from '../dashboard/components/DashboardSetupBanner';
import { useLoader } from '@/src/hooks/utility/useLoader';
import {
    PullToRefresh,
    FloatingActionButton,
    ScrollToTopButton
} from '@/src/components/patterns';

// Dashboard Components (Research-backed UX)
import {
    UrgentActionsBar,
    PerformanceBar,
    OrderTrendChart,
    ShipmentPipeline,
    GeographicInsights,
    QuickActionsGrid,
    AnalyticsSection,
    SmartInsightsPanel,
    CODStatusCard
} from '@/src/components/seller/dashboard';

// Dashboard Skeleton Loaders
import {
    PerformanceBarSkeleton,
    OrderTrendChartSkeleton,
    UrgentActionsBarSkeleton
} from '@/src/components/seller/dashboard';

// Real API Hooks
import { useAnalytics, useDashboardMetrics } from '@/src/core/api/hooks/analytics/useAnalytics';
import { useWalletBalance } from '@/src/core/api/hooks/finance/useWallet';
import { useOrdersList } from '@/src/core/api/hooks/orders/useOrders';
import { useCODStats } from '@/src/core/api/hooks/finance/useCOD';

// Dashboard Utilities
import { transformDashboardToKPIs, USE_MOCK } from '@/src/lib/dashboard/data-utils';

// Mock Data (Fallback)
import {
    getPendingPickups,
    getRTOOrders,
    getTodaySnapshot,
    getTopInsights,
    getMockKPITrends,
    mockOrderTrend30Days,
    mockGeographicInsights
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
    const [isDataReady, setIsDataReady] = useState(false);

    // Loading state management with flash prevention
    const { isLoading, showLoader, startLoading, stopLoading } = useLoader({
        minDelay: 300,     // Don't show loader for fast operations (<300ms)
        minDisplay: 500    // Keep visible for at least 500ms for smooth UX
    });

    // ========== REAL API HOOKS ==========

    // Core Metrics - Dashboard (only if not using mock)
    const { data: dashboardMetrics, isLoading: metricsLoading } = useDashboardMetrics();

    // Wallet Balance (only if not using mock)
    const { data: walletData, isLoading: walletLoading } = useWalletBalance({
        enabled: !USE_MOCK
    });

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Simulate initial data loading (in production, this would be actual API calls)
    useEffect(() => {
        const loadDashboardData = async () => {
            startLoading();

            // If using real APIs, wait for them to load
            if (!USE_MOCK) {
                // Wait for critical data
                const isLoadingData = metricsLoading || walletLoading;
                if (!isLoadingData) {
                    setIsDataReady(true);
                    stopLoading();
                }
            } else {
                // Mock data simulation
                await new Promise(resolve => setTimeout(resolve, 600));
                setIsDataReady(true);
                stopLoading();
            }
        };

        loadDashboardData();
    }, [startLoading, stopLoading, metricsLoading, walletLoading]);

    // Get greeting based on time
    const getGreeting = () => {
        const hour = currentTime.getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    // --- PREPARE DATA FOR COMPONENTS (with fallback) ---

    // 1. Urgent Actions Logic

    // For now, use mock data for orders (hook signature issue to be fixed)
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

    // 2. Snapshot Data Logic - Use real API or fallback to mock

    const todayData = getTodaySnapshot(); // Mock data for fallback

    // Transform API data to KPI format
    const kpiTrendsFromAPI = dashboardMetrics ? transformDashboardToKPIs(
        dashboardMetrics,
        walletData?.balance
    ) : null;

    // Use real data if available, otherwise use mock
    const kpiTrendsRaw = USE_MOCK ? getMockKPITrends() : (kpiTrendsFromAPI || getMockKPITrends());

    // Transform KPITrendData to match PerformanceBar's KPIData interface
    const kpiTrends = {
        revenue: {
            value: kpiTrendsRaw.revenue.today,
            sparkline: kpiTrendsRaw.revenue.sparkline,
            delta: kpiTrendsRaw.revenue.delta,
            trend: kpiTrendsRaw.revenue.trend
        },
        profit: {
            value: kpiTrendsRaw.profit.today,
            sparkline: kpiTrendsRaw.profit.sparkline,
            delta: kpiTrendsRaw.profit.delta,
            trend: kpiTrendsRaw.profit.trend
        },
        orders: {
            value: kpiTrendsRaw.orders.today,
            sparkline: kpiTrendsRaw.orders.sparkline,
            delta: kpiTrendsRaw.orders.delta,
            trend: kpiTrendsRaw.orders.trend
        }
    };

    // Smart insights data
    const smartInsights = getTopInsights(3);

    // 3. Analytics Data Logic (mock for components that still need it)
    const mockAnalyticsData = {
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
        startLoading();

        // Simulate data fetching (in production, re-fetch all queries)
        await new Promise(resolve => setTimeout(resolve, 800));

        setCurrentTime(new Date());
        setIsDataReady(true);

        stopLoading();
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

                        </div>
                    </div>
                </header>

                {/* Setup Banner */}
                <DashboardSetupBanner />

                {/* ========== TIER 1: DECISION-CRITICAL (Above fold, cannot miss) ========== */}

                {/* TIER 1: URGENT ACTIONS (Loss aversion psychology - immediate attention required) */}
                {showLoader ? (
                    <UrgentActionsBarSkeleton />
                ) : urgentActions.length > 0 && isDataReady ? (
                    <motion.section
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <UrgentActionsBar actions={urgentActions} />
                    </motion.section>
                ) : null}

                {/* TIER 1: PERFORMANCE BAR (Glanceable metrics with sparklines - answer "Is revenue up?" in <3s) */}
                {showLoader ? (
                    <PerformanceBarSkeleton />
                ) : isDataReady ? (
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <PerformanceBar
                            revenue={kpiTrends.revenue}
                            profit={kpiTrends.profit}
                            orders={kpiTrends.orders}
                            walletBalance={kpiTrendsRaw.walletBalance.today}
                            walletSparkline={kpiTrendsRaw.walletBalance.sparkline}
                            lastUpdated={kpiTrendsRaw.revenue.last_updated_at}
                            freshness={kpiTrendsRaw.revenue.freshness}
                            shippingStreak={5} // TODO: Get from backend (habit-forming feature)
                            lowBalanceThreshold={1000}
                            onRevenueClick={() => router.push('/seller/analytics/revenue')}
                            onProfitClick={() => router.push('/seller/analytics/profit')}
                            onOrdersClick={() => router.push('/seller/orders')}
                        />
                    </motion.section>
                ) : null}

                {/* TIER 1: ORDER TREND CHART (Dominant visual - 30-day pattern recognition at a glance) */}
                {showLoader ? (
                    <OrderTrendChartSkeleton />
                ) : isDataReady ? (
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                    >
                        <OrderTrendChart
                            data={mockOrderTrend30Days}
                            onDataPointClick={(dataPoint) => {
                                // Navigate to orders filtered by date
                                router.push(`/seller/orders?date=${dataPoint.date}`);
                            }}
                        />
                    </motion.section>
                ) : null}

                {/* ========== TIER 2: OPERATIONAL CLARITY ========== */}

                {/* TIER 2: SMART INSIGHTS (Actionable recommendations - Business partner) */}
                {isDataReady && (
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <SmartInsightsPanel
                            insights={smartInsights}
                            onApply={(id) => console.log('Applied insight:', id)}
                        />
                    </motion.section>
                )}

                {/* TIER 2: SHIPMENT PIPELINE (Visual flow replacing static status cards - Phase 2.1) */}
                {isDataReady && (
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                    >
                        <ShipmentPipeline
                            statusCounts={{
                                pending: pendingPickups.length,
                                picked: Math.floor(todayData.activeShipments * 0.2),
                                inTransit: Math.floor(todayData.activeShipments * 0.5),
                                outForDelivery: Math.floor(todayData.activeShipments * 0.3),
                                delivered: todayData.delivered,
                                rto: rtoOrders.length,
                                failed: 2
                            }}
                        />
                    </motion.section>
                )}

                {/* TIER 2: GEOGRAPHIC INSIGHTS (Top destinations - warehouse/routing decisions - Phase 2.2) */}
                {isDataReady && (
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.38 }}
                    >
                        <GeographicInsights
                            topCities={mockGeographicInsights.topCities}
                            regions={mockGeographicInsights.regions}
                            totalOrders={mockGeographicInsights.totalOrders}
                        />
                    </motion.section>
                )}

                {/* ========== TIER 3: CONTEXT & ACTIONS ========== */}

                {/* TIER 3: COD STATUS (65% of Indian orders - financial visibility) */}
                {isDataReady && (
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <CODStatusCard
                            pendingAmount={todayData.pendingCOD}
                            readyForRemittance={Math.floor(todayData.pendingCOD * 0.6)}
                            lastRemittanceAmount={18500}
                        />
                    </motion.section>
                )}

                {/* TIER 3: QUICK ACTIONS (Secondary contextual tasks) */}
                {isDataReady && (
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 }}
                    >
                        <QuickActionsGrid
                            pendingPickups={pendingPickups.length}
                        />
                    </motion.section>
                )}

                {/* ========== TIER 4: EXPANDABLE DETAILS ========== */}

                {/* TIER 4: ANALYTICS SECTION (Details on demand - Progressive disclosure) */}
                {isDataReady && (
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        <AnalyticsSection data={mockAnalyticsData} />
                    </motion.section>
                )}

                {/* Mobile FAB - Primary action (Research: Single CTA per context) */}
                <FloatingActionButton
                    icon={<Package className="w-5 h-5" />}
                    label="Create Order"
                    onClick={() => router.push('/seller/orders/create')}
                    position="bottom-right"
                    variant="primary"
                    showOnScrollUp={false} // Always visible on mobile
                />

                {/* Scroll to top button */}
                <ScrollToTopButton showAfter={400} />
            </div>
        </PullToRefresh>
    );
}
