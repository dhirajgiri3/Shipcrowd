"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from 'react';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Package } from 'lucide-react';
import { useAuth } from '@/src/features/auth';
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
import { useDashboardMetrics } from '@/src/core/api/hooks/analytics/useAnalytics';
import { useWalletBalance } from '@/src/core/api/hooks/finance/useWallet';
import { useOrdersList } from '@/src/core/api/hooks/orders/useOrders';
import { useCODStats } from '@/src/core/api/hooks/finance/useCOD';
import { useOrderTrends } from '@/src/core/api/hooks/analytics/useOrderTrends';

// Dashboard Utilities
import { transformDashboardToKPIs, USE_MOCK } from '@/src/lib/dashboard/data-utils';
import { transformOrderTrendsToChart } from '@/src/lib/dashboard/order-trends';
import { useDashboardDate } from '@/src/contexts/DashboardDateContext';

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

// --- DATE FILTER PRESETS COMPONENT ---
function DateFilterPresets() {
    const { preset, setPreset, dateRange, setDateRange } = useDashboardDate();
    const [showCustom, setShowCustom] = useState(false);
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const presets = [
        { id: 'today' as const, label: 'Today' },
        { id: 'last7days' as const, label: 'Last 7 Days' },
        { id: 'last30days' as const, label: 'Last 30 Days' },
    ];

    const handleCustomApply = () => {
        if (customStart && customEnd) {
            const start = new Date(customStart);
            start.setHours(0, 0, 0, 0);
            const end = new Date(customEnd);
            end.setHours(23, 59, 59, 999);

            setDateRange({ startDate: start, endDate: end }, 'custom');
            setShowCustom(false);
        }
    };

    return (
        <div className="relative flex items-center gap-2">
            {/* Preset Buttons */}
            <div className="flex items-center gap-1 p-1 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)]">
                {presets.map((p) => (
                    <button
                        key={p.id}
                        onClick={() => setPreset(p.id)}
                        className={`
                            px-3 py-1.5 rounded-md text-xs font-medium transition-all
                            ${preset === p.id
                                ? 'bg-[var(--bg-primary)] shadow-sm text-[var(--text-primary)] border border-[var(--border-subtle)]'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]/50'
                            }
                        `}
                    >
                        {p.label}
                    </button>
                ))}

                {/* Custom Button */}
                <button
                    onClick={() => setShowCustom(!showCustom)}
                    className={`
                        px-3 py-1.5 rounded-md text-xs font-medium transition-all
                        ${preset === 'custom'
                            ? 'bg-[var(--bg-primary)] shadow-sm text-[var(--text-primary)] border border-[var(--border-subtle)]'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]/50'
                        }
                    `}
                >
                    Custom
                </button>
            </div>

            {/* Custom Date Picker Dropdown */}
            {showCustom && (
                <div className="absolute top-full right-0 mt-3 p-4 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)] shadow-[var(--shadow-dropdown)] z-50 w-72 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">Select Range</p>
                        <button
                            onClick={() => setShowCustom(false)}
                            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1 rounded-md hover:bg-[var(--bg-secondary)]"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>

                    <div className="space-y-3 mb-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-medium text-[var(--text-secondary)] uppercase ml-1">From</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={customStart}
                                    onChange={(e) => setCustomStart(e.target.value)}
                                    className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:border-[var(--primary-blue)] focus:ring-1 focus:ring-[var(--primary-blue-soft)] outline-none transition-all placeholder-[var(--text-muted)]"
                                    placeholder="Start Date"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-medium text-[var(--text-secondary)] uppercase ml-1">To</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={customEnd}
                                    onChange={(e) => setCustomEnd(e.target.value)}
                                    className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:border-[var(--primary-blue)] focus:ring-1 focus:ring-[var(--primary-blue-soft)] outline-none transition-all"
                                    min={customStart}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleCustomApply}
                        disabled={!customStart || !customEnd}
                        className={`
                            w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2
                            ${customStart && customEnd
                                ? 'bg-[var(--primary-blue)] text-white hover:bg-[var(--primary-blue-deep)] shadow-sm hover:shadow-md transform active:scale-[0.98]'
                                : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] cursor-not-allowed'
                            }
                        `}
                    >
                        Apply Range
                    </button>
                </div>
            )}
        </div>
    );
}

export function DashboardClient() {
    const { user } = useAuth();
    const router = useRouter();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isDataReady, setIsDataReady] = useState(false);

    // ✅ Get date range from centralized context
    const { getAPIParams } = useDashboardDate();
    const dateParams = getAPIParams();

    // Loading state management with flash prevention
    const { isLoading, showLoader, startLoading, stopLoading } = useLoader({
        minDelay: 300,     // Don't show loader for fast operations (<300ms)
        minDisplay: 500    // Keep visible for at least 500ms for smooth UX
    });

    // ========== REAL API HOOKS ==========

    // Core Metrics - Dashboard (✅ now uses centralized date filter)
    const { data: dashboardMetrics, isLoading: metricsLoading } = useDashboardMetrics({
        startDate: dateParams.startDate,
        endDate: dateParams.endDate
    });

    // Wallet Balance (only if not using mock)
    const { data: walletData, isLoading: walletLoading } = useWalletBalance({
        enabled: !USE_MOCK
    });

    // Order Trends (30-day chart data)
    const { data: orderTrendsData, isLoading: orderTrendsLoading } = useOrderTrends(30);

    // COD Stats (for CODStatusCard)
    const { data: codStatsData, isLoading: codStatsLoading } = useCODStats();

    // Orders List (for urgent actions - pending pickups, RTO)
    const { data: ordersListData, isLoading: ordersListLoading } = useOrdersList({
        limit: 100,
        status: 'all'
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

    // 1. Urgent Actions Logic - Use real API data when available

    // Filter real orders by status or fall back to mock
    const pendingPickups = USE_MOCK
        ? getPendingPickups()
        : (ordersListData?.data?.orders?.filter(order =>
            order.currentStatus === 'pending_pickup' || order.currentStatus === 'pending'
        ) || getPendingPickups());

    const rtoOrders = USE_MOCK
        ? getRTOOrders()
        : (ordersListData?.data?.orders?.filter(order =>
            order.currentStatus?.toLowerCase().includes('rto')
        ) || getRTOOrders());

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

    // Order Trend Chart Data - Transform API data or use mock
    const orderTrendChartData = USE_MOCK
        ? mockOrderTrend30Days
        : (orderTrendsData ? transformOrderTrendsToChart(orderTrendsData) : null) || mockOrderTrend30Days;

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
                            <DateFilterPresets />

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
                            revenue={{
                                value: dashboardMetrics?.totalRevenue || 0,
                                sparkline: dashboardMetrics?.weeklyTrend?.map(d => d.revenue) || [],
                                delta: dashboardMetrics?.deltas?.revenue || 0,
                                trend: (dashboardMetrics?.deltas?.revenue || 0) >= 0 ? 'up' : 'down'
                            }}
                            profit={{
                                value: dashboardMetrics?.totalProfit || 0,
                                sparkline: dashboardMetrics?.weeklyTrend?.map(d => d.profit || 0) || [],
                                delta: dashboardMetrics?.deltas?.profit || 0,
                                trend: (dashboardMetrics?.deltas?.profit || 0) >= 0 ? 'up' : 'down'
                            }}
                            orders={{
                                value: dashboardMetrics?.totalOrders || 0,
                                sparkline: dashboardMetrics?.weeklyTrend?.map(d => d.orders) || [],
                                delta: dashboardMetrics?.deltas?.orders || 0,
                                trend: (dashboardMetrics?.deltas?.orders || 0) >= 0 ? 'up' : 'down'
                            }}
                            walletBalance={walletData?.balance || 0}
                            activeDays={dashboardMetrics?.activeDays || dashboardMetrics?.shippingStreak || 0}
                            longestStreak={dashboardMetrics?.longestStreak || 0}
                            milestones={dashboardMetrics?.milestones || []}
                            lastUpdated={new Date().toISOString()}
                            isUsingMock={false}
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
                            data={orderTrendChartData}
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
                                pending: USE_MOCK ? pendingPickups.length : (dashboardMetrics?.pendingPickup || pendingPickups.length),
                                picked: USE_MOCK ? Math.floor(todayData.activeShipments * 0.2) : Math.floor((dashboardMetrics?.activeOrders || todayData.activeShipments) * 0.15),
                                inTransit: USE_MOCK ? Math.floor(todayData.activeShipments * 0.5) : (dashboardMetrics?.inTransit || Math.floor(todayData.activeShipments * 0.5)),
                                outForDelivery: USE_MOCK ? Math.floor(todayData.activeShipments * 0.3) : Math.floor((dashboardMetrics?.activeOrders || todayData.activeShipments) * 0.2),
                                delivered: USE_MOCK ? todayData.delivered : (dashboardMetrics?.delivered || todayData.delivered),
                                rto: USE_MOCK ? rtoOrders.length : (dashboardMetrics?.rto || rtoOrders.length),
                                failed: USE_MOCK ? 2 : ((dashboardMetrics?.ndr || 0) + 2)
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
                            pendingAmount={USE_MOCK ? todayData.pendingCOD : (codStatsData?.pending?.amount || todayData.pendingCOD)}
                            readyForRemittance={USE_MOCK ? Math.floor(todayData.pendingCOD * 0.6) : (codStatsData?.pending?.amount ? Math.floor(codStatsData.pending.amount * 0.6) : Math.floor(todayData.pendingCOD * 0.6))}
                            lastRemittanceAmount={USE_MOCK ? 18500 : 18500}
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
