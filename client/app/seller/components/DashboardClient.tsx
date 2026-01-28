"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from 'react';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Package, ChevronRight } from 'lucide-react';
import { useAuth } from '@/src/features/auth';
import { DashboardSetupBanner } from '@/src/components/seller/dashboard/DashboardSetupBanner';
import { useLoader } from '@/src/hooks/utility/useLoader';
import { TruckLoader } from '@/src/components/ui';
import {
    PullToRefresh,
    ScrollToTopButton
} from '@/src/components/patterns';

// Dashboard Components (Research-backed UX)
import {
    UrgentActionsBar,
    PerformanceBar,
    OrderTrendChart,
    GeographicInsights,
    SmartInsightsPanel,
    CODSettlementTimeline,
    CashFlowForecast,
    RTOAnalytics,
    ProfitabilityCard,
    // Phase 2: Dashboard Optimization
    CriticalAlertsBanner,
    DeltaSinceLastVisit,
} from '@/src/components/seller/dashboard';
import type { CriticalAlert } from '@/src/components/seller/dashboard/CriticalAlertsBanner';

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
import { useCODTimeline, useCashFlowForecast, transformCODTimelineToComponent, transformCashFlowToComponent } from '@/src/core/api/hooks/finance'; // Phase 3: New APIs
import { useRTOAnalytics } from '@/src/core/api/hooks/analytics/useRTOAnalytics'; // Phase 4: RTO Analytics
import { useProfitabilityAnalytics } from '@/src/core/api/hooks/analytics/useProfitabilityAnalytics'; // Phase 4: Profitability Analytics
import { useGeographicInsights } from '@/src/core/api/hooks/analytics/useGeographicInsights'; // Phase 4: Geographic Insights
import { useSmartInsights } from '@/src/core/api/hooks/analytics/useSmartInsights'; // Phase 5: Smart Insights (100% Real Data)
import { QuickActionsFAB } from '@/src/components/seller/dashboard/QuickActionsFAB';

// Dashboard Utilities
import { transformDashboardToKPIs } from '@/src/lib/dashboard/data-utils';
import { transformOrderTrendsToChart } from '@/src/lib/dashboard/order-trends';
import { useDashboardDate } from '@/src/contexts/DashboardDateContext';

// Phase 4: Keyboard Shortcuts
import { useKeyboardShortcuts } from '@/src/hooks';
import { KeyboardShortcutsModal } from '@/src/components/ui';

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
    const [isManualRefresh, setIsManualRefresh] = useState(false);

    // ✅ Get date range from centralized context
    const { getAPIParams } = useDashboardDate();
    const dateParams = getAPIParams();

    // Loading state management with flash prevention
    const { isLoading, showLoader, startLoading, stopLoading } = useLoader({
        minDelay: 300,     // Don't show loader for fast operations (<300ms)
        minDisplay: 500    // Keep visible for at least 500ms for smooth UX
    });

    // Phase 4: Keyboard Shortcuts
    const [showShortcutsModal, setShowShortcutsModal] = useState(false);
    const { shortcuts } = useKeyboardShortcuts({
        onShowHelp: () => setShowShortcutsModal(true),
        enabled: true,
    });

    // ========== REAL API HOOKS ==========

    // Core Metrics - Dashboard (✅ now uses centralized date filter)
    const { data: dashboardMetrics, isLoading: metricsLoading, refetch: refetchMetrics } = useDashboardMetrics({
        startDate: dateParams.startDate,
        endDate: dateParams.endDate
    });

    // Wallet Balance (only if not using mock)
    const { data: walletData, isLoading: walletLoading, refetch: refetchWallet } = useWalletBalance();

    // Order Trends (30-day chart data)
    const { data: orderTrendsData, isLoading: orderTrendsLoading, refetch: refetchTrends } = useOrderTrends(30);

    // COD Stats (for CODStatusCard)
    const { data: codStatsData, isLoading: codStatsLoading, refetch: refetchCOD } = useCODStats();

    // Orders List (for urgent actions - pending pickups, RTO)
    const { data: ordersListData, isLoading: ordersListLoading, refetch: refetchOrders } = useOrdersList({
        limit: 100,
        status: 'all'
    });

    // Phase 3: COD Timeline & Cash Flow Forecast APIs
    const { data: codTimelineData, isLoading: codTimelineLoading, refetch: refetchTimeline } = useCODTimeline();
    const { data: cashFlowData, isLoading: cashFlowLoading, refetch: refetchCashFlow } = useCashFlowForecast();

    // Phase 4: RTO Analytics API
    const { data: rtoAnalyticsData, isLoading: rtoAnalyticsLoading, refetch: refetchRTO } = useRTOAnalytics();

    // Phase 4: Profitability Analytics API
    const { data: profitabilityData, isLoading: profitabilityLoading, refetch: refetchProfit } = useProfitabilityAnalytics();

    // Phase 4: Geographic Insights API
    const { data: geographicData, isLoading: geographicLoading, refetch: refetchGeo } = useGeographicInsights();

    // Phase 5: Smart Insights API (100% Real Data)
    const { data: smartInsightsData, isLoading: smartInsightsLoading, refetch: refetchInsights } = useSmartInsights();

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Simulate initial data loading (in production, this would be actual API calls)
    useEffect(() => {
        const loadDashboardData = async () => {
            // If critical metrics are still loading, start loader
            if (metricsLoading || walletLoading) {
                startLoading();
            } else {
                // Critical data loaded
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
    const pendingPickups = ordersListData?.data?.filter(order =>
        order.currentStatus === 'pending_pickup' || order.currentStatus === 'pending'
    ) || [];

    const rtoOrders = ordersListData?.data?.filter(order =>
        order.currentStatus?.toLowerCase().includes('rto')
    ) || [];

    // Determine urgent actions based on REAL data
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
        // ✅ FIXED: Only show wallet alert if balance is actually low
        ...(walletData?.balance !== undefined && walletData.balance < 1000 ? [{
            id: 'wallet-1',
            type: 'wallet' as const,
            title: 'Low Wallet Balance',
            description: `Balance ₹${walletData.balance.toLocaleString('en-IN')} below ₹1,000 threshold`,
            ctaLabel: 'Recharge Now',
            ctaUrl: '/seller/wallet',
            severity: 'high' as const
        }] : [])
    ];

    // 2. Snapshot Data Logic - Use real API or fallback to mock

    // Transform API data to KPI format
    const kpiTrendsFromAPI = dashboardMetrics ? transformDashboardToKPIs(
        dashboardMetrics,
        walletData?.balance
    ) : null;

    // Use null/safe defaults if data not yet loaded
    const kpiTrends = kpiTrendsFromAPI ? {
        revenue: {
            value: kpiTrendsFromAPI.revenue.today,
            sparkline: kpiTrendsFromAPI.revenue.sparkline,
            delta: kpiTrendsFromAPI.revenue.delta,
            trend: kpiTrendsFromAPI.revenue.trend
        },
        profit: {
            value: kpiTrendsFromAPI.profit.today,
            sparkline: kpiTrendsFromAPI.profit.sparkline,
            delta: kpiTrendsFromAPI.profit.delta,
            trend: kpiTrendsFromAPI.profit.trend
        },
        orders: {
            value: kpiTrendsFromAPI.orders.today,
            sparkline: kpiTrendsFromAPI.orders.sparkline,
            delta: kpiTrendsFromAPI.orders.delta,
            trend: kpiTrendsFromAPI.orders.trend
        }
    } : null; // PerformanceBar handles loading state if needed, or we use skeleton

    // Smart insights data - Use REAL API (Phase 5: 100% Real Data)
    const smartInsights = smartInsightsData || [];

    // Order Trend Chart Data - Transform API data or use mock
    const orderTrendChartData = (orderTrendsData ? transformOrderTrendsToChart(orderTrendsData) : []) || [];

    // 3. Refresh Handler
    const handleRefresh = async () => {
        setIsManualRefresh(true);
        // We don't call startLoading() here because we want to show the TruckLoader overlay
        // instead of converting existing UI to skeletons.
        // startLoading(); 

        // Refetch all queries
        await Promise.all([
            refetchMetrics(),
            refetchWallet(),
            refetchTrends(),
            refetchCOD(),
            refetchOrders(),
            refetchTimeline(),
            refetchCashFlow(),
            refetchRTO(),
            refetchProfit(),
            refetchGeo(),
            refetchInsights()
        ]);

        setCurrentTime(new Date());
        setIsDataReady(true);
        // stopLoading();
        setIsManualRefresh(false);
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

                {/* Phase 2: Critical Alerts Banner (Above Everything) */}
                {isDataReady && (() => {
                    const alerts: CriticalAlert[] = [];

                    // Wallet low balance alert (stable ID based on threshold)
                    if (walletData?.balance !== undefined && walletData.balance < 5000) {
                        const severity: 'critical' | 'warning' = walletData.balance < 1000 ? 'critical' : 'warning';
                        // ✅ FIXED: Stable ID based on severity threshold
                        const walletAlertId = walletData.balance < 1000
                            ? 'wallet-critical-sub1k'
                            : 'wallet-warning-sub5k';

                        alerts.push({
                            id: walletAlertId,
                            type: 'wallet_low',
                            severity: severity,
                            title: 'Low Wallet Balance',
                            message: `Your wallet balance is ₹${walletData.balance.toLocaleString('en-IN')}. Recharge now to avoid order disruptions.`,
                            ctaLabel: 'Recharge Wallet',
                            ctaUrl: '/seller/wallet',
                            dismissable: true,
                        });
                    }

                    // RTO spike detection (>20% increase)
                    if (rtoAnalyticsData?.summary && rtoAnalyticsData.summary.change > 20) {
                        // ✅ FIXED: Stable ID based on change magnitude (rounded to 10%)
                        const rtoChangeRounded = Math.floor(rtoAnalyticsData.summary.change / 10) * 10;
                        const rtoAlertId = `rto-spike-${rtoChangeRounded}pct`;

                        alerts.push({
                            id: rtoAlertId,
                            type: 'rto_spike',
                            severity: 'warning',
                            title: 'RTO Rate Spike Detected',
                            message: `RTO rate increased by ${rtoAnalyticsData.summary.change.toFixed(1)}% compared to last period. Review affected orders.`,
                            ctaLabel: 'View RTO Analytics',
                            ctaUrl: '/seller/analytics/rto',
                            dismissable: true,
                        });
                    }

                    // Settlement delayed alert (>3 days overdue)
                    if (codTimelineData?.stages) {
                        const inProcessStage = codTimelineData.stages.find(s => s.stage === 'in_process');

                        if (inProcessStage?.date) {
                            const expectedDate = new Date(inProcessStage.date);
                            const now = new Date();
                            const daysOverdue = Math.floor((now.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24));

                            if (daysOverdue > 3) {
                                // ✅ NEW: Settlement delay alert
                                const delayAlertId = `settlement-delayed-${Math.floor(daysOverdue / 3)}x`;

                                alerts.push({
                                    id: delayAlertId,
                                    type: 'settlement_delayed',
                                    severity: 'warning',
                                    title: 'COD Settlement Delayed',
                                    message: `Your COD settlement of ₹${inProcessStage.amount.toLocaleString('en-IN')} is ${daysOverdue} days overdue.`,
                                    ctaLabel: 'Contact Support',
                                    ctaUrl: '/seller/support',
                                    dismissable: true,
                                });
                            }
                        }
                    }

                    return alerts.length > 0 ? (
                        <motion.section
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <CriticalAlertsBanner alerts={alerts} />
                        </motion.section>
                    ) : null;
                })()}

                {/* Phase 2: Delta Since Last Visit */}
                {isDataReady && (
                    <DeltaSinceLastVisit
                        currentOrderCount={dashboardMetrics?.totalOrders || 0}
                        currentWalletBalance={walletData?.balance || 0}
                        currentRtoCount={dashboardMetrics?.rto || 0}
                    />
                )}

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
                ) : kpiTrends ? (
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <PerformanceBar
                            revenue={kpiTrends.revenue}
                            profit={kpiTrends.profit}
                            orders={kpiTrends.orders}
                            walletBalance={walletData?.balance || 0}
                            // Only show activeDays if viewing today/current period (streak is real-time)
                            activeDays={(() => {
                                const today = new Date();
                                const endDate = new Date(dateParams.endDate);
                                const isViewingCurrent = endDate >= today || endDate.toDateString() === today.toDateString();
                                return isViewingCurrent ? (dashboardMetrics?.activeDays || dashboardMetrics?.shippingStreak || 0) : 0;
                            })()}
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

                {/* TIER 1: COD SETTLEMENT TIMELINE (Critical for Indian sellers - 65% orders are COD, cash flow visibility) */}
                {isDataReady && (
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                    >
                        <CODSettlementTimeline />
                    </motion.section>
                )}


                {/* ========== TIER 2: OPERATIONAL CLARITY ========== */}

                {/* TIER 2: RTO ANALYTICS (Loss prevention FIRST - High RTO = revenue loss, actionable insights) */}
                {isDataReady && (
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <RTOAnalytics />
                    </motion.section>
                )}

                {/* TIER 2: PROFITABILITY CARD (Real profit calculation - not estimated 15%) */}
                {isDataReady && (
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <ProfitabilityCard
                            onViewDetails={() => router.push('/seller/analytics/profitability')}
                        />
                    </motion.section>
                )}

                {/* TIER 2: SMART INSIGHTS (Actionable recommendations - Business partner) - Phase 5: 100% Real Data */}
                {isDataReady && smartInsights.length > 0 && (
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <SmartInsightsPanel
                            insights={smartInsights}
                            onApply={(id) => console.log('Applied insight:', id)}
                        />
                    </motion.section>
                )}

                {/* TIER 2: CASH FLOW FORECAST (Financial planning - know when money arrives) */}
                {isDataReady && (
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <CashFlowForecast />
                    </motion.section>
                )}

                {/* Shipment Pipeline removed as per user request (redundant/cluttered) */}

                {/* ========== TIER 3: CONTEXT & ACTIONS ========== */}

                {/* TIER 3: ORDER TREND CHART (Strategic - 30-day trends for planning, not urgent) */}
                {showLoader ? (
                    <OrderTrendChartSkeleton />
                ) : isDataReady ? (
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
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

                {/* TIER 3: GEOGRAPHIC INSIGHTS (Real API data) */}
                {isDataReady && geographicData && (
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <GeographicInsights
                            topCities={geographicData.topCities}
                            regions={geographicData.regions}
                            totalOrders={geographicData.totalOrders}
                        />
                    </motion.section>
                )}

                {/* Quick Actions moved to FAB at bottom of screen */}

                {/* ========== TIER 4: EXPANDABLE DETAILS ========== */}

                {/* TIER 4: Detailed Analytics - Link to dedicated page */}
                {isDataReady && (
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">
                                        Detailed Analytics
                                    </h3>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        Revenue, customers, inventory, and custom reports
                                    </p>
                                </div>
                                <button
                                    onClick={() => router.push('/seller/analytics')}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] rounded-lg transition-colors"
                                >
                                    View Analytics
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </motion.section>
                )}

                {/* Scroll to top button */}
                <ScrollToTopButton showAfter={400} />

                {/* Phase 4: Keyboard Shortcuts Modal */}
                <KeyboardShortcutsModal
                    isOpen={showShortcutsModal}
                    onClose={() => setShowShortcutsModal(false)}
                    shortcuts={shortcuts}
                />
            </div>

            {/* Quick Actions FAB - Always accessible */}
            <QuickActionsFAB />

            {/* Manual Refresh Delight - Truck Loader */}
            {isManualRefresh && (
                <TruckLoader
                    message="Syncing latest updates..."
                    subMessage="Fetching real-time data from carriers"
                    fullScreen={true}
                />
            )}
        </PullToRefresh>
    );
}
