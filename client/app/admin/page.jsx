"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area,
    LineChart,
    Line
} from 'recharts';
import {
    Users,
    Package,
    Truck,
    IndianRupee,
    TrendingUp,
    AlertTriangle,
    CheckCircle2,
    Clock,
    ArrowUpRight,
    Building2,
    BarChart3,
    AlertCircle,
    RefreshCcw,
    XCircle,
    Eye,
    Shield,
    X,
    Activity,
    Server,
    Sparkles,
    Zap,
    Download,
    Megaphone,
    Search,
    Filter,
    MoreHorizontal,
    Bell,
    ChevronDown,
    Settings,
    FileText,
    MessageSquare,
    Wallet
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, cn } from '@/lib/utils';
import { DateRangePicker } from '@/components/ui/DateRangePicker';

// --- MOCK DATA ---

const platformMetrics = {
    activeSellers: 247,
    sellersGrowth: 12,
    totalGMV: 24500000,
    gmvGrowth: 18,
    shipmentsToday: 1245,
    shipmentsGrowth: 5,
    platformMargin: 8.5,
    marginGrowth: 0.3
};

const aiInsights = [
    {
        id: 1,
        type: 'opportunity',
        icon: Sparkles,
        title: 'Volume Spike Predicted',
        description: 'Expected 15% increase in orders this weekend due to festive season.',
        action: 'View Forecast',
        color: 'blue'
    },
    {
        id: 2,
        type: 'optimization',
        icon: Zap,
        title: 'Route Optimization',
        description: 'Switching Mumbai → Delhi traffic to Xpressbees could save 12% on costs.',
        action: 'Apply Route',
        color: 'amber'
    },
    {
        id: 3,
        type: 'alert',
        icon: AlertTriangle,
        title: 'SLA Risk Detected',
        description: 'DTDC pickup delays in Bangalore region exceeding 4 hours.',
        action: 'View Impact',
        color: 'rose'
    }
];

const courierPerformance = [
    {
        name: 'Delhivery',
        logo: 'DL',
        sla: 94,
        volume: '15.2K',
        trend: '+2.4%',
        trendData: [65, 59, 80, 81, 56, 95, 94],
        status: 'excellent',
        issues: 0
    },
    {
        name: 'Xpressbees',
        logo: 'XB',
        sla: 88,
        volume: '12.5K',
        trend: '-1.2%',
        trendData: [40, 60, 55, 70, 65, 85, 88],
        status: 'good',
        issues: 2
    },
    {
        name: 'DTDC',
        logo: 'DT',
        sla: 76,
        volume: '8.1K',
        trend: '-5.8%',
        trendData: [85, 80, 75, 70, 72, 68, 76],
        status: 'warning',
        issues: 15
    },
    {
        name: 'Ecom Express',
        logo: 'EE',
        sla: 91,
        volume: '9.4K',
        trend: '+3.1%',
        trendData: [50, 60, 70, 80, 85, 90, 91],
        status: 'excellent',
        issues: 0
    }
];

const activityFeed = [
    { id: 1, user: 'TechGadgets Inc.', action: 'processed 150 orders', time: '10 min ago', icon: Package, color: 'blue' },
    { id: 2, user: 'System', action: 'completed daily settlement report', time: '25 min ago', icon: FileText, color: 'purple' },
    { id: 3, user: 'Fashion Hub', action: 'added ₹50,000 to wallet', time: '1 hour ago', icon: Wallet, color: 'emerald' },
    { id: 4, user: 'Admin', action: 'approved new seller "Urban Trends"', time: '2 hours ago', icon: CheckCircle2, color: 'indigo' },
];

const topSellers = [
    { rank: 1, name: 'TechGadgets Inc.', volume: 342, revenue: 485000, growth: 15, avatar: 'TG' },
    { rank: 2, name: 'Fashion Hub', volume: 289, revenue: 412000, growth: 8, avatar: 'FH' },
    { rank: 3, name: 'HomeDecor Plus', volume: 245, revenue: 356000, growth: 22, avatar: 'HD' },
    { rank: 4, name: 'SportsZone', volume: 198, revenue: 298000, growth: -3, avatar: 'SZ' },
    { rank: 5, name: 'BookWorld', volume: 176, revenue: 245000, growth: 12, avatar: 'BW' }
];

const revenueByChannel = [
    { name: 'Delhivery', value: 35, color: '#2525FF' },
    { name: 'Xpressbees', value: 28, color: '#6B7280' },
    { name: 'DTDC', value: 18, color: '#F59E0B' },
    { name: 'Ecom Express', value: 12, color: '#10B981' },
    { name: 'Others', value: 7, color: '#E5E7EB' }
];

// --- COMPONENTS ---

function MetricCard({ title, value, subtext, icon: Icon, trend, trendValue, color = "blue" }) {
    return (
        <div className="group bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
                <div className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110",
                    color === "blue" ? "bg-blue-50 text-[#2525FF]" :
                        color === "emerald" ? "bg-emerald-50 text-emerald-600" :
                            color === "violet" ? "bg-violet-50 text-violet-600" :
                                "bg-amber-50 text-amber-600"
                )}>
                    <Icon className="h-5 w-5" />
                </div>
                {trend && (
                    <span className={cn(
                        "inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold",
                        trend === "up" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    )}>
                        <TrendingUp className={cn("h-3 w-3 mr-1", trend === "down" && "rotate-180")} />
                        {trendValue}
                    </span>
                )}
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1 group-hover:text-gray-500 transition-colors">
                {subtext}
                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
        </div>
    );
}

function CourierCard({ data }) {
    const isWarning = data.status === 'warning';

    return (
        <div className={cn(
            "group relative overflow-hidden bg-white border rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
            isWarning ? "border-amber-200" : "border-gray-200 hover:border-[#2525FF]/30"
        )}>
            {/* Top Row */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gray-50 flex items-center justify-center font-bold text-gray-700 text-sm">
                        {data.logo}
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">{data.name}</h3>
                        <p className="text-xs text-gray-500">{data.volume} shipments</p>
                    </div>
                </div>
                {isWarning && (
                    <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center animate-pulse">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </div>
                )}
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <p className="text-xs text-gray-500 mb-1">Success Rate</p>
                    <p className={cn(
                        "text-xl font-bold",
                        data.sla >= 90 ? "text-emerald-600" :
                            data.sla >= 80 ? "text-gray-900" : "text-amber-600"
                    )}>
                        {data.sla}%
                    </p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 mb-1">Trend (7d)</p>
                    <p className={cn(
                        "text-xl font-bold",
                        data.trend.startsWith('+') ? "text-emerald-600" : "text-rose-500"
                    )}>
                        {data.trend}
                    </p>
                </div>
            </div>

            {/* Mini Chart */}
            <div className="h-12 -mx-2 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.trendData.map((val, i) => ({ val, i }))}>
                        <defs>
                            <linearGradient id={`gradient-${data.name}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={isWarning ? "#F59E0B" : "#2525FF"} stopOpacity={0.1} />
                                <stop offset="95%" stopColor={isWarning ? "#F59E0B" : "#2525FF"} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Area
                            type="monotone"
                            dataKey="val"
                            stroke={isWarning ? "#F59E0B" : "#2525FF"}
                            strokeWidth={2}
                            fill={`url(#gradient-${data.name})`}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 h-8 text-xs font-medium">
                    View Details
                </Button>
                {isWarning && (
                    <Button size="sm" className="flex-1 h-8 text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200">
                        Investigate
                    </Button>
                )}
            </div>
        </div>
    );
}

export default function AdminDashboardPage() {
    const { addToast } = useToast();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showSystemAlert, setShowSystemAlert] = useState(true);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <Clock className="w-3.5 h-3.5" />
                        {currentTime.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Platform Command Center
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full shadow-sm">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-sm text-emerald-700 font-semibold">Systems Operational</span>
                    </div>
                    <DateRangePicker />
                    <Button variant="outline" onClick={() => addToast('Refreshing data...', 'info')} className="hover:bg-gray-50">
                        <RefreshCcw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* System Notification Banner */}
            {showSystemAlert && (
                <div className="relative overflow-hidden rounded-xl bg-gray-900 p-1 shadow-lg animate-in slide-in-from-top-2 fade-in duration-500">
                    <div className="relative flex items-center justify-between gap-4 rounded-lg bg-gray-800/50 px-4 py-3 text-white backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                                <Server className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="font-medium text-sm sm:text-base">System Update Scheduled</p>
                                <p className="text-xs sm:text-sm text-gray-400">Maintenance scheduled for Dec 15, 02:00 AM - 04:00 AM IST. No downtime expected.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowSystemAlert(false)}
                            className="rounded-full p-1 hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* AI Insights & Quick Actions */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* AI Insights Widget - Priority 1 */}
                <div className="lg:col-span-2 relative overflow-hidden bg-gradient-to-br from-[#2525FF] to-[#1e1ecc] rounded-2xl shadow-lg p-1">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Sparkles className="w-32 h-32" />
                    </div>
                    <div className="bg-white/95 backdrop-blur-sm rounded-xl h-full p-6">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center text-[#2525FF]">
                                    <Sparkles className="h-5 w-5" />
                                </div>
                                <h2 className="font-bold text-gray-900 text-lg">AI Smart Insights</h2>
                            </div>
                            <Button variant="ghost" size="sm" className="text-[#2525FF] hover:bg-blue-50">
                                View all
                                <ArrowUpRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>

                        <div className="space-y-4">
                            {aiInsights.map((insight) => (
                                <div key={insight.id} className="group flex items-start gap-4 p-4 rounded-xl border border-gray-100 hover:border-blue-100 hover:bg-blue-50/30 transition-all cursor-pointer">
                                    <div className={cn(
                                        "h-10 w-10 shrink-0 rounded-lg flex items-center justify-center transition-colors",
                                        insight.color === 'blue' ? "bg-blue-100 text-blue-600" :
                                            insight.color === 'amber' ? "bg-amber-100 text-amber-600" :
                                                "bg-rose-100 text-rose-600"
                                    )}>
                                        <insight.icon className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-semibold text-gray-900">{insight.title}</h3>
                                            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">{insight.type}</span>
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1 leading-relaxed">{insight.description}</p>
                                    </div>
                                    <Button size="sm" variant="outline" className="self-center hidden sm:flex hover:bg-white hover:text-[#2525FF]">
                                        {insight.action}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Quick Actions Panel */}
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                    <h2 className="font-bold text-gray-900 mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-2 gap-3">
                        <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-[#2525FF] hover:text-white transition-all group border border-transparent hover:border-[#2525FF] text-center h-28">
                            <Users className="h-6 w-6 text-gray-600 group-hover:text-white transition-colors" />
                            <span className="text-xs font-semibold">Approve Sellers</span>
                        </button>
                        <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-emerald-500 hover:text-white transition-all group border border-transparent hover:border-emerald-500 text-center h-28">
                            <FileText className="h-6 w-6 text-gray-600 group-hover:text-white transition-colors" />
                            <span className="text-xs font-semibold">Daily Report</span>
                        </button>
                        <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-amber-500 hover:text-white transition-all group border border-transparent hover:border-amber-500 text-center h-28">
                            <Megaphone className="h-6 w-6 text-gray-600 group-hover:text-white transition-colors" />
                            <span className="text-xs font-semibold">Broadcast</span>
                        </button>
                        <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-violet-500 hover:text-white transition-all group border border-transparent hover:border-violet-500 text-center h-28">
                            <Settings className="h-6 w-6 text-gray-600 group-hover:text-white transition-colors" />
                            <span className="text-xs font-semibold">Configure API</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Key Metrics Row */}
            <div className="grid gap-6 md:grid-cols-4">
                <MetricCard
                    title="Active Sellers"
                    value={platformMetrics.activeSellers}
                    subtext="View all sellers"
                    icon={Users}
                    trend="up"
                    trendValue={`+${platformMetrics.sellersGrowth}%`}
                    color="blue"
                />
                <MetricCard
                    title="Total GMV"
                    value={formatCurrency(platformMetrics.totalGMV)}
                    subtext="Revenue analytics"
                    icon={IndianRupee}
                    trend="up"
                    trendValue={`+${platformMetrics.gmvGrowth}%`}
                    color="emerald"
                />
                <MetricCard
                    title="Shipments Today"
                    value={platformMetrics.shipmentsToday.toLocaleString()}
                    subtext="Live tracking"
                    icon={Package}
                    trend="up"
                    trendValue={`+${platformMetrics.shipmentsGrowth}%`}
                    color="violet"
                />
                <MetricCard
                    title="Platform Margin"
                    value={`${platformMetrics.platformMargin}%`}
                    subtext="Financial report"
                    icon={BarChart3}
                    trend="up"
                    trendValue={`+${platformMetrics.marginGrowth}%`}
                    color="amber"
                />
            </div>

            {/* Courier Performance Grid - Redesigned */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">Courier Performance Overview</h2>
                    <Link href="/admin/couriers" className="text-sm font-medium text-[#2525FF] hover:underline flex items-center">
                        Manage Couriers <ArrowUpRight className="h-4 w-4 ml-1" />
                    </Link>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {courierPerformance.map((courier) => (
                        <CourierCard key={courier.name} data={courier} />
                    ))}
                </div>
            </div>

            {/* Two Column Layout: Activity Feed & Financials */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Real-time Activity Feed */}
                <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-gray-500" />
                            <h2 className="font-semibold text-gray-900">Live Activity Feed</h2>
                        </div>
                        <Button variant="ghost" size="sm" className="text-gray-500">
                            <Filter className="h-4 w-4 mr-2" />
                            Filter
                        </Button>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {activityFeed.map((activity) => (
                            <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors flex items-start gap-4">
                                <div className={cn(
                                    "h-10 w-10 rounded-full flex items-center justify-center shrink-0 border-2 border-white shadow-sm",
                                    activity.color === 'blue' ? "bg-blue-100 text-[#2525FF]" :
                                        activity.color === 'purple' ? "bg-purple-100 text-purple-600" :
                                            activity.color === 'emerald' ? "bg-emerald-100 text-emerald-600" :
                                                "bg-indigo-100 text-indigo-600"
                                )}>
                                    <activity.icon className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0 pt-0.5">
                                    <p className="text-sm text-gray-900">
                                        <span className="font-semibold">{activity.user}</span> {activity.action}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {activity.time}
                                    </p>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                    <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
                        <button className="text-xs font-semibold text-gray-500 hover:text-[#2525FF] transition-colors">
                            View All Activity
                        </button>
                    </div>
                </div>

                {/* Financial Summary */}
                <div className="space-y-6">
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                        <h2 className="font-bold text-gray-900 mb-4">Financial Overview</h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Total Revenue Today</p>
                                    <p className="text-lg font-bold text-gray-900">₹45,230</p>
                                </div>
                                <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Pending Payouts</p>
                                    <p className="text-lg font-bold text-gray-900">₹1.2L</p>
                                </div>
                                <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                                    <Clock className="h-4 w-4 text-amber-600" />
                                </div>
                            </div>
                            <Button className="w-full bg-[#2525FF] hover:bg-[#1e1ecc] mt-2">
                                View Financial Reports
                            </Button>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-lg p-6 text-white text-center">
                        <Building2 className="h-8 w-8 mx-auto mb-3 text-white/80" />
                        <h3 className="font-bold text-lg mb-1">Invite Partner</h3>
                        <p className="text-sm text-gray-300 mb-4">Onboard a new courier partner or strategic ally.</p>
                        <Button variant="outline" className="text-black bg-white hover:bg-gray-100 w-full border-transparent">
                            Send Invitation
                        </Button>
                    </div>
                </div>
            </div>

            {/* Top Sellers Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-gray-400" />
                        <h2 className="font-semibold text-gray-900">Top Performing Sellers</h2>
                    </div>
                    <Link href="/admin/sellers" className="text-sm text-[#2525FF] hover:underline font-medium">
                        View All
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rank</th>
                                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Seller</th>
                                <th className="text-right py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Shipments</th>
                                <th className="text-right py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Revenue</th>
                                <th className="text-right py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Growth</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {topSellers.map((seller) => (
                                <tr key={seller.rank} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="py-4 px-6">
                                        <div className={cn(
                                            "h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold shadow-sm transition-transform group-hover:scale-110",
                                            seller.rank === 1 ? "bg-amber-100 text-amber-700" :
                                                seller.rank === 2 ? "bg-gray-100 text-gray-700" :
                                                    seller.rank === 3 ? "bg-orange-100 text-orange-700" :
                                                        "bg-white border border-gray-200 text-gray-500"
                                        )}>
                                            {seller.rank}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-lg bg-[#2525FF]/5 border border-[#2525FF]/10 flex items-center justify-center text-sm font-bold text-[#2525FF]">
                                                {seller.avatar}
                                            </div>
                                            <span className="font-bold text-gray-900">{seller.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-right font-medium text-gray-600 tabular-nums">
                                        {seller.volume}
                                    </td>
                                    <td className="py-4 px-6 text-right font-bold text-gray-900 tabular-nums">
                                        {formatCurrency(seller.revenue)}
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <span className={cn(
                                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums",
                                            seller.growth >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
                                        )}>
                                            {seller.growth >= 0 ? '+' : ''}{seller.growth}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
