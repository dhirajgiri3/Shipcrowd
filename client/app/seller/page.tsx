"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Wallet,
    Package,
    Truck,
    AlertTriangle,
    Search,
    TrendingUp,
    CheckCircle2,
    Clock,
    IndianRupee,
    RefreshCcw,
    ChevronRight,
    ShoppingBag,
    Plus,
    ArrowUpRight,
    Bell,
    X,
    Zap,
    MoveRight,
    Megaphone,
    BarChart2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, cn } from '@/lib/utils';
import { DateRangePicker } from '@/components/ui/DateRangePicker';

// API Hooks
import { useSellerDashboard } from '@/src/hooks/api/useAnalytics';
import { useShipments } from '@/src/hooks/api/useShipments';

// Static fallback data for COD settlements (not yet in API)
const codSettlements = [
    { date: 'Dec 15', amount: 45230, orders: 52, status: 'scheduled' },
    { date: 'Dec 18', amount: 32100, orders: 38, status: 'processing' },
];

export default function SellerDashboardPage() {
    const [trackingInput, setTrackingInput] = useState('');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showBanner, setShowBanner] = useState(true);
    const { addToast } = useToast();

    // Fetch live dashboard data with auto-refresh
    const { data: dashboardData, isLoading, isError, error } = useSellerDashboard();

    // Fetch recent shipments (limit 3, sorted by createdAt desc)
    const { data: shipmentsData } = useShipments({ limit: 3, sortBy: 'createdAt:desc' });

    // Compute pending actions from live data
    const pendingActions = dashboardData ? [
        dashboardData.pendingOrders > 0 && {
            id: 1,
            title: `${dashboardData.pendingOrders} Orders waiting to be shipped`,
            subtitle: 'Ship before 6 PM for same-day pickup',
            urgency: 'high',
            icon: Package,
            href: '/seller/orders',
            color: 'blue'
        },
        (dashboardData.codPending?.count || 0) > 0 && {
            id: 2,
            title: 'Low wallet balance detected',
            subtitle: 'Recharge to continue shipping seamlessly',
            urgency: 'warning',
            icon: Wallet,
            href: '/seller/financials',
            color: 'amber'
        }
    ].filter(Boolean) : [];

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const getGreeting = () => {
        const hour = currentTime.getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    const handleQuickTrack = () => {
        if (!trackingInput.trim()) {
            addToast('Please enter an AWB number', 'warning');
            return;
        }
        addToast(`Tracking ${trackingInput}...`, 'info');
    };

    // Loading skeleton
    if (isLoading) {
        return (
            <div className="space-y-6 pb-10 animate-pulse">
                <div className="h-20 bg-[var(--bg-secondary)] rounded-xl" />
                <div className="h-64 bg-[var(--bg-secondary)] rounded-xl" />
                <div className="grid gap-4 md:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => <div key={i} className="h-40 bg-[var(--bg-secondary)] rounded-xl" />)}
                </div>
                <div className="h-96 bg-[var(--bg-secondary)] rounded-xl" />
            </div>
        );
    }

    // Error state
    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[600px] space-y-4">
                <AlertTriangle className="h-16 w-16 text-rose-500" />
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Failed to load dashboard</h2>
                    <p className="text-[var(--text-secondary)] mb-4">
                        {(error as any)?.message || 'An error occurred while fetching dashboard data'}
                    </p>
                    <Button onClick={() => window.location.reload()} className="bg-[#2525FF] hover:bg-[#1e1ecc]">
                        <RefreshCcw className="h-4 w-4 mr-2" />
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    // Extract data with fallbacks
    const sellerName = 'Seller'; // TODO: Get from auth context
    const totalOrders = dashboardData?.totalOrders || 0;
    const pendingOrders = dashboardData?.pendingOrders || 0;
    const deliveredOrders = dashboardData?.deliveredOrders || 0;
    const totalRevenue = dashboardData?.totalRevenue || 0;
    const successRate = dashboardData?.successRate || 0;
    const recentShipments = shipmentsData?.shipments || [];

    return (
        <div className="space-y-6 pb-10">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <Clock className="w-3.5 h-3.5" />
                        {currentTime.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                        {getGreeting()}, {sellerName} 👋
                    </h1>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <DateRangePicker className="w-full sm:w-auto" />
                    <Button variant="outline" className="hidden sm:flex" onClick={() => addToast('Syncing stores...', 'info')}>
                        <RefreshCcw className="h-4 w-4 mr-2" />
                        Sync Stores
                    </Button>
                    <Link href="/seller/orders?tab=new" className="w-full sm:w-auto">
                        <Button className="w-full sm:w-auto bg-[#2525FF] hover:bg-[#1e1ecc] shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95">
                            <Package className="h-4 w-4 mr-2" />
                            Ship Orders
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Smart Notification Banner */}
            {showBanner && (
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#2525FF] to-[#6B5BFF] p-px animate-in slide-in-from-top-2 fade-in duration-500">
                    <div className="relative flex items-center justify-between gap-4 rounded-[11px] bg-[var(--primary-blue)] px-4 py-3 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--bg-primary)]/20">
                                <Megaphone className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="font-medium text-sm sm:text-base">Quick Tip: Increase delivery success by 15%</p>
                                <p className="text-xs sm:text-sm text-blue-100/90">Enable "RTO Risk Detection" in your settings to flag high-risk orders automatically.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost" className="hidden sm:flex text-white hover:bg-[var(--bg-primary)]/10 hover:text-white h-8">
                                Enable Now
                            </Button>
                            <button
                                onClick={() => setShowBanner(false)}
                                className="rounded-full p-1 hover:bg-[var(--bg-primary)]/20 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hero Insight Card - Redesigned */}
            <div className="relative overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-8 shadow-sm">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 -mt-16 -mr-16 h-64 w-64 rounded-full bg-[var(--primary-blue-soft)] opacity-50 blur-3xl" />
                <div className="absolute bottom-0 left-0 -mb-16 -ml-16 h-64 w-64 rounded-full bg-[var(--success-bg)] opacity-30 blur-3xl" />

                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                    <div className="max-w-xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-xs font-medium mb-4 border border-[var(--border-subtle)]">
                            <TrendingUp className="w-3.5 h-3.5 text-[var(--success)]" />
                            <span>Daily Performance Insight</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-4 tracking-tight">
                            Ready to ship your orders?
                        </h2>
                        <p className="text-[var(--text-secondary)] text-lg leading-relaxed">
                            You have <span className="font-semibold text-[var(--text-primary)]">{pendingOrders} orders</span> pending.
                            {pendingOrders > 0 && ' Shipping them before 6 PM can improve your '}
                            {pendingOrders > 0 && <span className="text-[var(--success)] font-medium">delivery speed by 15%</span>}.
                        </p>

                        <div className="mt-6 flex flex-wrap gap-3">
                            <Button className="h-10 px-6 rounded-full bg-[var(--text-primary)] text-[var(--bg-primary)] hover:bg-[var(--text-primary)]/90 hover:scale-105 transition-all shadow-lg shadow-[var(--shadow-brand-sm)] border-none">
                                Ship Pending Orders <MoveRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto min-w-[300px]">
                        <div className="flex-1 p-5 rounded-[var(--radius-xl)] bg-[var(--bg-primary)] border border-[var(--border-subtle)] shadow-[var(--shadow-sm)] hover:border-[var(--border-strong)] transition-all group">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Success Rate</p>
                                <div className="h-6 w-6 rounded-full bg-[var(--success-bg)] flex items-center justify-center text-[var(--success)] group-hover:scale-110 transition-transform">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">{successRate.toFixed(1)}%</p>
                            <p className="text-xs text-[var(--success)] mt-1 font-medium">This week</p>
                        </div>

                        <div className="flex-1 p-5 rounded-[var(--radius-xl)] bg-[var(--bg-primary)] border border-[var(--border-subtle)] shadow-[var(--shadow-sm)] hover:border-[var(--border-strong)] transition-all group">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Avg. Time</p>
                                <div className="h-6 w-6 rounded-full bg-[var(--primary-blue-soft)] flex items-center justify-center text-[var(--primary-blue)] group-hover:scale-110 transition-transform">
                                    <Clock className="h-3.5 w-3.5" />
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">2.4d</p>
                            <p className="text-xs text-[var(--success)] mt-1 font-medium">-4hrs faster</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid gap-4 md:grid-cols-4">
                {/* Wallet */}
                <Link href="/seller/financials" className="block h-full">
                    <div className="group h-full relative bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl p-5 transition-all duration-200 hover:border-[var(--primary-blue)] hover:border-opacity-50">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-[#2525FF] group-hover:scale-110 transition-transform">
                                <Wallet className="h-5 w-5" />
                            </div>
                            {sellerData.walletLow && (
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                                </span>
                            )}
                        </div>
                        <p className="text-sm font-medium text-[var(--text-muted)] mb-1">Wallet Balance</p>
                        <p className="text-2xl font-bold text-[var(--text-primary)] mb-3 tracking-tight">
                            {formatCurrency(totalRevenue)}
                        </p>
                        <div className="flex items-center text-sm font-medium text-[#2525FF]">
                            <Plus className="h-4 w-4 mr-1" />
                            Add Money
                        </div>
                    </div>
                </Link>

                {/* Orders to Ship */}
                <Link href="/seller/orders?tab=new" className="block h-full">
                    <div className="group h-full relative bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl p-5 transition-all duration-200 hover:border-[var(--primary-blue)] hover:border-opacity-50">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                                <Package className="h-5 w-5" />
                            </div>
                        </div>
                        <p className="text-sm font-medium text-[var(--text-muted)] mb-1">Orders to Ship</p>
                        <p className="text-2xl font-bold text-[var(--text-primary)] mb-3 tracking-tight">{pendingOrders}</p>
                        <div className="flex items-center text-sm font-medium text-emerald-600">
                            Ship now
                            <ArrowUpRight className="h-4 w-4 ml-1 opacity-100 sm:opacity-0 sm:-translate-x-2 sm:group-hover:translate-x-0 sm:group-hover:opacity-100 transition-all" />
                        </div>
                    </div>
                </Link>

                {/* In Transit */}
                <Link href="/seller/shipments" className="block h-full">
                    <div className="group h-full relative bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl p-5 transition-all duration-200 hover:border-[var(--primary-blue)] hover:border-opacity-50">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-10 w-10 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600 group-hover:scale-110 transition-transform">
                                <Truck className="h-5 w-5" />
                            </div>
                        </div>
                        <p className="text-sm font-medium text-[var(--text-muted)] mb-1">In Transit</p>
                        <p className="text-2xl font-bold text-[var(--text-primary)] mb-3 tracking-tight">{totalOrders - deliveredOrders - pendingOrders}</p>
                        <div className="flex items-center text-sm font-medium text-violet-600">
                            Track all
                            <ArrowUpRight className="h-4 w-4 ml-1 opacity-100 sm:opacity-0 sm:-translate-x-2 sm:group-hover:translate-x-0 sm:group-hover:opacity-100 transition-all" />
                        </div>
                    </div>
                </Link>

                {/* NDRs */}
                <Link href="/seller/ndr" className="block h-full">
                    <div className="group h-full relative bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl p-5 transition-all duration-200 hover:border-rose-300">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-10 w-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            {0 > 0 && (
                                <Badge variant="destructive" className="h-6 w-auto px-2">
                                    0 Actions
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm font-medium text-[var(--text-muted)] mb-1">Failed Deliveries</p>
                        <p className="text-2xl font-bold text-[var(--text-primary)] mb-3 tracking-tight">0</p>
                        <div className="flex items-center text-sm font-medium text-rose-600">
                            Resolve now
                            <ArrowUpRight className="h-4 w-4 ml-1 opacity-100 sm:opacity-0 sm:-translate-x-2 sm:group-hover:translate-x-0 sm:group-hover:opacity-100 transition-all" />
                        </div>
                    </div>
                </Link>
            </div>

            {/* Pending Actions Section - COLORFUL & PLAYFUL */}
            {pendingActions.length > 0 && (
                <div className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                            <h2 className="font-semibold text-[var(--text-primary)]">Pending Actions</h2>
                            <Badge variant="neutral" className="ml-2 bg-[var(--bg-primary)] text-[var(--text-muted)]">{pendingActions.length}</Badge>
                        </div>
                    </div>
                    <div className="divide-y divide-[var(--border-subtle)]">
                        {pendingActions.map((action) => {
                            const Icon = action.icon;
                            // Dynamic styles based on urgency/color
                            const colorStyles = {
                                blue: {
                                    bg: 'bg-blue-50',
                                    text: 'text-blue-700',
                                    border: 'group-hover:border-blue-200',
                                    iconBg: 'bg-blue-100',
                                    hoverBg: 'hover:bg-blue-50/50'
                                },
                                rose: {
                                    bg: 'bg-rose-50',
                                    text: 'text-rose-700',
                                    border: 'group-hover:border-rose-200',
                                    iconBg: 'bg-rose-100',
                                    hoverBg: 'hover:bg-rose-50/50'
                                },
                                amber: {
                                    bg: 'bg-amber-50',
                                    text: 'text-amber-700',
                                    border: 'group-hover:border-amber-200',
                                    iconBg: 'bg-amber-100',
                                    hoverBg: 'hover:bg-amber-50/50'
                                }
                            };
                            const style = colorStyles[action.color as keyof typeof colorStyles];

                            return (
                                <Link key={action.id} href={action.href}>
                                    <div className={cn(
                                        "group flex items-center gap-4 px-6 py-4 transition-all duration-200 border-l-4 border-transparent",
                                        style.hoverBg,
                                        `hover:border-${action.color}-500`
                                    )}>
                                        <div className={cn(
                                            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors",
                                            style.iconBg,
                                            style.text
                                        )}>
                                            <Icon className="h-6 w-6" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-[var(--text-primary)] group-hover:text-[#2525FF] transition-colors">{action.title}</p>
                                            <p className="text-sm text-[var(--text-muted)] mt-0.5">{action.subtitle}</p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={cn("opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0", style.text)}
                                        >
                                            Take Action <MoveRight className="h-4 w-4 ml-2" />
                                        </Button>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Two Column Layout */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Performance */}
                <div className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-gray-400" />
                            <h2 className="font-semibold text-[var(--text-primary)]">This Week's Performance</h2>
                        </div>
                        <Badge variant="success" className="gap-1 pl-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Excellent
                        </Badge>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="text-center p-4 bg-[var(--bg-secondary)] rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors">
                                <p className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">{totalOrders}</p>
                                <p className="text-sm font-medium text-[var(--text-muted)] mt-1">Total Orders</p>
                            </div>
                            <div className="text-center p-4 bg-blue-50/50 rounded-xl hover:bg-blue-50 transition-colors">
                                <p className="text-3xl font-bold text-[#2525FF] tracking-tight">{totalOrders - pendingOrders}</p>
                                <p className="text-sm font-medium text-[var(--text-muted)] mt-1">Shipped</p>
                            </div>
                            <div className="text-center p-4 bg-emerald-50/50 rounded-xl hover:bg-emerald-50 transition-colors">
                                <p className="text-3xl font-bold text-emerald-600 tracking-tight">{deliveredOrders}</p>
                                <p className="text-sm font-medium text-[var(--text-muted)] mt-1">Delivered</p>
                            </div>
                            <div className="text-center p-4 bg-rose-50/50 rounded-xl hover:bg-rose-50 transition-colors">
                                <p className="text-3xl font-bold text-rose-600 tracking-tight">0</p>
                                <p className="text-sm font-medium text-[var(--text-muted)] mt-1">RTO</p>
                            </div>
                        </div>

                        <div className="space-y-2 bg-[var(--bg-secondary)] p-4 rounded-xl">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-gray-600">Overall Success Rate</span>
                                <span className="font-bold text-[var(--text-primary)]">{successRate.toFixed(1)}%</span>
                            </div>
                            <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${successRate}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Track */}
                <div className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Search className="h-5 w-5 text-gray-400" />
                            <h2 className="font-semibold text-[var(--text-primary)]">Quick Track</h2>
                        </div>
                        <Link href="/seller/tracking" className="text-sm text-[#2525FF] hover:underline font-medium">
                            Advanced Search
                        </Link>
                    </div>
                    <div className="p-6">
                        <div className="flex gap-2 mb-6">
                            <Input
                                placeholder="Enter AWB number..."
                                value={trackingInput}
                                onChange={(e) => setTrackingInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleQuickTrack()}
                                className="flex-1 focus-visible:ring-[#2525FF]"
                            />
                            <Button onClick={handleQuickTrack} className="bg-[#2525FF] hover:bg-[#1e1ecc]">
                                Track
                            </Button>
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                            <div className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Recent Shipments</p>
                        </div>

                        <div className="space-y-3">
                            {recentShipments.length > 0 ? recentShipments.map((shipment) => (
                                <div key={shipment._id} className="group flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg hover:bg-[var(--bg-primary)] hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-[var(--border-subtle)]">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "h-2 w-2 rounded-full",
                                            shipment.currentStatus === 'delivered' ? "bg-emerald-500" :
                                                shipment.currentStatus === 'out_for_delivery' ? "bg-amber-500" : "bg-blue-500"
                                        )} />
                                        <div className="min-w-0 flex-1 mr-2">
                                            <p className="font-semibold text-[var(--text-primary)] text-sm group-hover:text-[#2525FF] transition-colors truncate">{shipment.trackingNumber}</p>
                                            <p className="text-xs text-[var(--text-muted)] truncate">{shipment.carrier}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <Badge className={cn(
                                            "px-2 py-0.5 rounded-full text-xs font-medium",
                                            "bg-[var(--bg-primary)] border border-[var(--border-default)] transition-colors",
                                            shipment.currentStatus === 'delivered' ? "text-emerald-700 bg-emerald-50 border-emerald-100" :
                                                shipment.currentStatus === 'out_for_delivery' ? "text-amber-700 bg-amber-50 border-amber-100" :
                                                    "text-blue-700 bg-blue-50 border-blue-100"
                                        )}>
                                            {shipment.currentStatus.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </Badge>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-8 text-[var(--text-muted)]">
                                    <p>No recent shipments</p>
                                    <p className="text-xs mt-1">Your recent shipments will appear here</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* COD Settlements */}
                <div className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <IndianRupee className="h-5 w-5 text-gray-400" />
                            <h2 className="font-semibold text-[var(--text-primary)]">COD Settlements</h2>
                        </div>
                        <Link href="/seller/financials" className="text-sm text-[#2525FF] hover:underline font-medium">
                            View All
                        </Link>
                    </div>
                    <div className="p-6">
                        <div className="space-y-3">
                            {codSettlements.map((settlement, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] rounded-xl border border-transparent hover:border-[var(--border-default)] transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col items-center justify-center h-12 w-12 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-default)] text-xs font-medium text-[var(--text-muted)]">
                                            <span>{settlement.date.split(' ')[1]}</span>
                                            <span className="text-[var(--text-primary)] font-bold">{settlement.date.split(' ')[0]}</span>
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-[var(--text-primary)]">{formatCurrency(settlement.amount)}</p>
                                            <p className="text-sm text-[var(--text-muted)]">{settlement.orders} orders processed</p>
                                        </div>
                                    </div>
                                    <Badge variant={settlement.status === 'scheduled' ? 'success' : 'neutral'} className="capitalize">
                                        {settlement.status}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Store Connections */}
                <div className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ShoppingBag className="h-5 w-5 text-gray-400" />
                            <h2 className="font-semibold text-[var(--text-primary)]">Connected Stores</h2>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => addToast('Syncing...', 'info')} className="h-8">
                            <RefreshCcw className="h-3.5 w-3.5 mr-1.5" />
                            Sync All
                        </Button>
                    </div>
                    <div className="p-6">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-4 p-4 border border-[var(--border-default)] rounded-xl hover:border-[#95BF47] transition-colors group bg-[var(--bg-primary)]">
                                <div className="h-12 w-12 bg-[#95BF47] rounded-xl flex items-center justify-center shadow-lg shadow-[#95BF47]/20 group-hover:scale-110 transition-transform">
                                    <ShoppingBag className="h-6 w-6 text-white" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <p className="font-bold text-[var(--text-primary)]">Shopify Store</p>
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            Live
                                        </div>
                                    </div>
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">Last sync: 2 min ago</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-4 border border-[var(--border-default)] rounded-xl hover:border-[#96588A] transition-colors group bg-[var(--bg-primary)]">
                                <div className="h-12 w-12 bg-[#96588A] rounded-xl flex items-center justify-center shadow-lg shadow-[#96588A]/20 group-hover:scale-110 transition-transform">
                                    <ShoppingBag className="h-6 w-6 text-white" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <p className="font-bold text-[var(--text-primary)]">WooCommerce</p>
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            Live
                                        </div>
                                    </div>
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">Last sync: 5 min ago</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
