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
    Sparkles,
    Zap,
    MoveRight,
    Megaphone
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, cn } from '@/lib/utils';

// Mock data
const sellerData = {
    name: 'Rajesh',
    walletBalance: 12450,
    walletLow: true,
    ordersToShip: 23,
    inTransit: 45,
    ndrsToResolve: 3,
    weekStats: {
        orders: 156,
        shipped: 148,
        delivered: 132,
        rto: 5,
        successRate: 96.4
    }
};

const pendingActions = [
    {
        id: 1,
        title: '23 Orders waiting to be shipped',
        subtitle: 'Ship before 6 PM for same-day pickup',
        urgency: 'high',
        icon: Package,
        href: '/seller/orders',
        color: 'blue'
    },
    {
        id: 2,
        title: '3 NDRs need your response',
        subtitle: 'Response deadline: Today, 6 PM',
        urgency: 'critical',
        icon: AlertTriangle,
        href: '/seller/ndr',
        color: 'rose'
    },
    {
        id: 3,
        title: 'Low wallet balance detected',
        subtitle: 'Recharge to continue shipping seamlessy',
        urgency: 'warning',
        icon: Wallet,
        href: '/seller/financials',
        color: 'amber'
    }
];

const recentShipments = [
    { awb: 'AWB123456789', customer: 'Priya Sharma', status: 'in_transit', city: 'Mumbai', carrier: 'Delhivery' },
    { awb: 'AWB987654321', customer: 'Amit Patel', status: 'out_for_delivery', city: 'Delhi', carrier: 'Xpressbees' },
    { awb: 'AWB456789123', customer: 'Sneha Reddy', status: 'delivered', city: 'Bangalore', carrier: 'DTDC' }
];

const codSettlements = [
    { date: 'Dec 15', amount: 45230, orders: 52, status: 'scheduled' },
    { date: 'Dec 18', amount: 32100, orders: 38, status: 'processing' },
];

export default function SellerDashboardPage() {
    const [trackingInput, setTrackingInput] = useState('');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showBanner, setShowBanner] = useState(true);
    const { addToast } = useToast();

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

    return (
        <div className="space-y-6 pb-10">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <Clock className="w-3.5 h-3.5" />
                        {currentTime.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
                        {getGreeting()}, {sellerData.name} 👋
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="hidden sm:flex" onClick={() => addToast('Syncing stores...', 'info')}>
                        <RefreshCcw className="h-4 w-4 mr-2" />
                        Sync Stores
                    </Button>
                    <Link href="/seller/orders?tab=new">
                        <Button className="bg-[#2525FF] hover:bg-[#1e1ecc] shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95">
                            <Package className="h-4 w-4 mr-2" />
                            Ship Orders
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Smart Notification Banner */}
            {showBanner && (
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#2525FF] to-[#6B5BFF] p-1 shadow-lg animate-in slide-in-from-top-2 fade-in duration-500">
                    <div className="relative flex items-center justify-between gap-4 rounded-lg bg-white/10 px-4 py-3 text-white backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20">
                                <Megaphone className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="font-medium text-sm sm:text-base">Quick Tip: Increase delivery success by 15%</p>
                                <p className="text-xs sm:text-sm text-blue-100/90">Enable "RTO Risk Detection" in your settings to flag high-risk orders automatically.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost" className="hidden sm:flex text-white hover:bg-white/10 hover:text-white h-8">
                                Enable Now
                            </Button>
                            <button
                                onClick={() => setShowBanner(false)}
                                className="rounded-full p-1 hover:bg-white/20 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hero Insight Card */}
            <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-100 p-6 sm:p-8 shadow-sm">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Sparkles className="w-64 h-64 text-[#2525FF]" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="max-w-xl">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-3">
                            <Zap className="w-3 h-3 fill-current" />
                            Daily Insight
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                            Ready to crush your goals? 🚀
                        </h2>
                        <p className="text-gray-500 leading-relaxed">
                            You have <span className="font-bold text-gray-900">{sellerData.ordersToShip} orders</span> pending shipment.
                            Processing them before 6 PM usually results in a <span className="font-semibold text-emerald-600">faster delivery time</span>.
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <div className="text-center px-4 py-2 bg-gray-50 rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Success Rate</p>
                            <p className="text-xl font-bold text-emerald-600">96.4%</p>
                        </div>
                        <div className="text-center px-4 py-2 bg-gray-50 rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Avg. Time</p>
                            <p className="text-xl font-bold text-[#2525FF]">2.4 Days</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid gap-4 md:grid-cols-4">
                {/* Wallet */}
                <Link href="/seller/financials" className="block h-full">
                    <div className="group h-full relative bg-white border border-gray-200 rounded-xl p-5 transition-all duration-200 hover:border-[#2525FF]/50 hover:shadow-md hover:-translate-y-0.5">
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
                        <p className="text-sm font-medium text-gray-500 mb-1">Wallet Balance</p>
                        <p className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">
                            {formatCurrency(sellerData.walletBalance)}
                        </p>
                        <div className="flex items-center text-sm font-medium text-[#2525FF]">
                            <Plus className="h-4 w-4 mr-1" />
                            Add Money
                        </div>
                    </div>
                </Link>

                {/* Orders to Ship */}
                <Link href="/seller/orders?tab=new" className="block h-full">
                    <div className="group h-full relative bg-white border border-gray-200 rounded-xl p-5 transition-all duration-200 hover:border-[#2525FF]/50 hover:shadow-md hover:-translate-y-0.5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                                <Package className="h-5 w-5" />
                            </div>
                        </div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Orders to Ship</p>
                        <p className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">{sellerData.ordersToShip}</p>
                        <div className="flex items-center text-sm font-medium text-emerald-600">
                            Ship now
                            <ArrowUpRight className="h-4 w-4 ml-1 opacity-100 sm:opacity-0 sm:-translate-x-2 sm:group-hover:translate-x-0 sm:group-hover:opacity-100 transition-all" />
                        </div>
                    </div>
                </Link>

                {/* In Transit */}
                <Link href="/seller/shipments" className="block h-full">
                    <div className="group h-full relative bg-white border border-gray-200 rounded-xl p-5 transition-all duration-200 hover:border-[#2525FF]/50 hover:shadow-md hover:-translate-y-0.5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-10 w-10 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600 group-hover:scale-110 transition-transform">
                                <Truck className="h-5 w-5" />
                            </div>
                        </div>
                        <p className="text-sm font-medium text-gray-500 mb-1">In Transit</p>
                        <p className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">{sellerData.inTransit}</p>
                        <div className="flex items-center text-sm font-medium text-violet-600">
                            Track all
                            <ArrowUpRight className="h-4 w-4 ml-1 opacity-100 sm:opacity-0 sm:-translate-x-2 sm:group-hover:translate-x-0 sm:group-hover:opacity-100 transition-all" />
                        </div>
                    </div>
                </Link>

                {/* NDRs */}
                <Link href="/seller/ndr" className="block h-full">
                    <div className="group h-full relative bg-white border border-gray-200 rounded-xl p-5 transition-all duration-200 hover:border-rose-300 hover:shadow-md hover:-translate-y-0.5 hover:bg-rose-50/10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-10 w-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            {sellerData.ndrsToResolve > 0 && (
                                <Badge variant="destructive" className="h-6 w-auto px-2">
                                    {sellerData.ndrsToResolve} Action{sellerData.ndrsToResolve > 1 ? 's' : ''}
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Failed Deliveries</p>
                        <p className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">{sellerData.ndrsToResolve}</p>
                        <div className="flex items-center text-sm font-medium text-rose-600">
                            Resolve now
                            <ArrowUpRight className="h-4 w-4 ml-1 opacity-100 sm:opacity-0 sm:-translate-x-2 sm:group-hover:translate-x-0 sm:group-hover:opacity-100 transition-all" />
                        </div>
                    </div>
                </Link>
            </div>

            {/* Pending Actions Section - COLORFUL & PLAYFUL */}
            {pendingActions.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                            <h2 className="font-semibold text-gray-900">Pending Actions</h2>
                            <Badge variant="neutral" className="ml-2 bg-white text-gray-500">{pendingActions.length}</Badge>
                        </div>
                    </div>
                    <div className="divide-y divide-gray-100">
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
                                            <p className="font-semibold text-gray-900 group-hover:text-[#2525FF] transition-colors">{action.title}</p>
                                            <p className="text-sm text-gray-500 mt-0.5">{action.subtitle}</p>
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
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-gray-400" />
                            <h2 className="font-semibold text-gray-900">This Week's Performance</h2>
                        </div>
                        <Badge variant="success" className="gap-1 pl-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Excellent
                        </Badge>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="text-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                <p className="text-3xl font-bold text-gray-900 tracking-tight">{sellerData.weekStats.orders}</p>
                                <p className="text-sm font-medium text-gray-500 mt-1">Total Orders</p>
                            </div>
                            <div className="text-center p-4 bg-blue-50/50 rounded-xl hover:bg-blue-50 transition-colors">
                                <p className="text-3xl font-bold text-[#2525FF] tracking-tight">{sellerData.weekStats.shipped}</p>
                                <p className="text-sm font-medium text-gray-500 mt-1">Shipped</p>
                            </div>
                            <div className="text-center p-4 bg-emerald-50/50 rounded-xl hover:bg-emerald-50 transition-colors">
                                <p className="text-3xl font-bold text-emerald-600 tracking-tight">{sellerData.weekStats.delivered}</p>
                                <p className="text-sm font-medium text-gray-500 mt-1">Delivered</p>
                            </div>
                            <div className="text-center p-4 bg-rose-50/50 rounded-xl hover:bg-rose-50 transition-colors">
                                <p className="text-3xl font-bold text-rose-600 tracking-tight">{sellerData.weekStats.rto}</p>
                                <p className="text-sm font-medium text-gray-500 mt-1">RTO</p>
                            </div>
                        </div>

                        <div className="space-y-2 bg-gray-50 p-4 rounded-xl">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-gray-600">Overall Success Rate</span>
                                <span className="font-bold text-gray-900">{sellerData.weekStats.successRate}%</span>
                            </div>
                            <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${sellerData.weekStats.successRate}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Track */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Search className="h-5 w-5 text-gray-400" />
                            <h2 className="font-semibold text-gray-900">Quick Track</h2>
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
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent Shipments</p>
                        </div>

                        <div className="space-y-3">
                            {recentShipments.map((shipment) => (
                                <div key={shipment.awb} className="group flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-white hover:shadow-md hover:shadow-gray-100 transition-all cursor-pointer border border-transparent hover:border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "h-2 w-2 rounded-full",
                                            shipment.status === 'delivered' ? "bg-emerald-500" :
                                                shipment.status === 'out_for_delivery' ? "bg-amber-500" : "bg-blue-500"
                                        )} />
                                        <div>
                                            <p className="font-semibold text-gray-900 text-sm group-hover:text-[#2525FF] transition-colors">{shipment.awb}</p>
                                            <p className="text-xs text-gray-500">{shipment.customer} • {shipment.carrier}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <Badge variant="neutral" className={cn(
                                            "bg-white border-gray-200 transition-colors",
                                            shipment.status === 'delivered' ? "text-emerald-700 bg-emerald-50 border-emerald-100" :
                                                shipment.status === 'out_for_delivery' ? "text-amber-700 bg-amber-50 border-amber-100" :
                                                    "text-blue-700 bg-blue-50 border-blue-100"
                                        )}>
                                            {shipment.status === 'delivered' && 'Delivered'}
                                            {shipment.status === 'out_for_delivery' && 'Out for Delivery'}
                                            {shipment.status === 'in_transit' && 'In Transit'}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* COD Settlements */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <IndianRupee className="h-5 w-5 text-gray-400" />
                            <h2 className="font-semibold text-gray-900">COD Settlements</h2>
                        </div>
                        <Link href="/seller/financials" className="text-sm text-[#2525FF] hover:underline font-medium">
                            View All
                        </Link>
                    </div>
                    <div className="p-6">
                        <div className="space-y-3">
                            {codSettlements.map((settlement, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-transparent hover:border-gray-200 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col items-center justify-center h-12 w-12 rounded-lg bg-white border border-gray-200 text-xs font-medium text-gray-500">
                                            <span>{settlement.date.split(' ')[1]}</span>
                                            <span className="text-gray-900 font-bold">{settlement.date.split(' ')[0]}</span>
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-gray-900">{formatCurrency(settlement.amount)}</p>
                                            <p className="text-sm text-gray-500">{settlement.orders} orders processed</p>
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
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ShoppingBag className="h-5 w-5 text-gray-400" />
                            <h2 className="font-semibold text-gray-900">Connected Stores</h2>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => addToast('Syncing...', 'info')} className="h-8">
                            <RefreshCcw className="h-3.5 w-3.5 mr-1.5" />
                            Sync All
                        </Button>
                    </div>
                    <div className="p-6">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-[#95BF47] transition-colors group bg-white">
                                <div className="h-12 w-12 bg-[#95BF47] rounded-xl flex items-center justify-center shadow-lg shadow-[#95BF47]/20 group-hover:scale-110 transition-transform">
                                    <ShoppingBag className="h-6 w-6 text-white" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <p className="font-bold text-gray-900">Shopify Store</p>
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            Live
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">Last sync: 2 min ago</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-[#96588A] transition-colors group bg-white">
                                <div className="h-12 w-12 bg-[#96588A] rounded-xl flex items-center justify-center shadow-lg shadow-[#96588A]/20 group-hover:scale-110 transition-transform">
                                    <ShoppingBag className="h-6 w-6 text-white" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <p className="font-bold text-gray-900">WooCommerce</p>
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            Live
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">Last sync: 5 min ago</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
