"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AnimatedNumber } from '@/hooks/useCountUp';
import { RadialProgress } from '@/components/ui/RadialProgress';
import {
    ResponsiveContainer,
    AreaChart,
    Area
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
    BarChart3,
    RefreshCcw,
    X,
    Activity,
    Server,
    LayoutDashboard,
    BrainCircuit,
    Megaphone,
    Filter,
    MoreHorizontal,
    ChevronDown,
    Settings,
    FileText,
    Wallet,
    Briefcase,
    ChevronRight,
    Zap
} from 'lucide-react';
import { TopSellers } from '@/components/admin/TopSellers';

import { useToast } from '@/components/ui/Toast';
import { formatCurrency, cn } from '@/lib/utils';
import { DateRangePicker } from '@/components/ui/DateRangePicker';

// --- TYPES ---

interface MetricCardProps {
    title: string;
    value: string | number;
    subtext: string;
    icon: any;
    trend?: 'up' | 'down';
    trendValue?: string;
    color?: 'blue' | 'emerald' | 'violet' | 'amber';
    chartData: any[];
}

interface CourierData {
    name: string;
    logo: string;
    sla: number;
    volume: string;
    trend: string;
    trendData: number[];
    status: string;
    issues: number;
}

interface CourierCardProps {
    data: CourierData;
}

// --- MOCK DATA ---

const platformMetrics = {
    activeSellers: 247,
    sellersGrowth: 12,
    totalGMV: 24500000,
    gmvGrowth: 18,
    shipmentsToday: 1245,
    shipmentsGrowth: 5,
    platformMargin: 8.5,
    marginGrowth: 0.3,
    sparklines: {
        sellers: Array.from({ length: 7 }, () => ({ value: Math.floor(Math.random() * 50) + 200 })),
        gmv: Array.from({ length: 7 }, () => ({ value: Math.floor(Math.random() * 500000) + 2000000 })),
        shipments: Array.from({ length: 7 }, () => ({ value: Math.floor(Math.random() * 200) + 1000 })),
        margin: Array.from({ length: 7 }, () => ({ value: Math.random() * 2 + 7 }))
    }
};

const aiInsights = [
    {
        id: 1,
        type: 'opportunity',
        icon: BrainCircuit,
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



const revenueByChannel = [
    { name: 'Delhivery', value: 35, color: '#2525FF' },
    { name: 'Xpressbees', value: 28, color: '#6B7280' },
    { name: 'DTDC', value: 18, color: '#F59E0B' },
    { name: 'Ecom Express', value: 12, color: '#10B981' },
    { name: 'Others', value: 7, color: '#E5E7EB' }
];

// --- COLOR CONFIGURATIONS ---

const METRIC_COLOR_CONFIG = {
    blue: {
        bg: 'bg-[var(--primary-blue-soft)]',
        text: 'text-[var(--primary-blue)]',
        glow: 'bg-blue-500',
        gradient: 'rgba(37, 99, 235, 0.1)',
        chart: 'var(--primary-blue)'
    },
    emerald: {
        bg: 'bg-[var(--success-bg)]',
        text: 'text-[var(--success)]',
        glow: 'bg-emerald-500',
        gradient: 'rgba(16, 185, 129, 0.1)',
        chart: 'var(--success)'
    },
    violet: {
        bg: 'bg-violet-500/10',
        text: 'text-violet-600 dark:text-violet-400',
        glow: 'bg-violet-500',
        gradient: 'rgba(139, 92, 246, 0.1)',
        chart: '#8b5cf6'
    },
    amber: {
        bg: 'bg-[var(--warning-bg)]',
        text: 'text-[var(--warning)]',
        glow: 'bg-amber-500',
        gradient: 'rgba(245, 158, 11, 0.1)',
        chart: 'var(--warning)'
    }
};

// --- COMPONENTS ---

function MetricCard({ title, value, subtext, icon: Icon, trend, trendValue, color = "blue", chartData }: MetricCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const colorConfig = METRIC_COLOR_CONFIG[color];

    const cardVariants = {
        hidden: {
            opacity: 0,
            y: 20,
            scale: 0.95
        },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1] as const
            }
        },
        hover: {
            y: -8,
            scale: 1.02,
            transition: {
                duration: 0.3,
                ease: [0.22, 1, 0.36, 1] as const
            }
        }
    };

    return (
        <motion.div
            variants={cardVariants}
            whileHover="hover"
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            className="group relative overflow-hidden bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-2xl p-6 cursor-pointer"
            style={{
                boxShadow: isHovered
                    ? '0 20px 40px -12px rgba(0, 0, 0, 0.2), 0 0 0 1px var(--primary-blue-medium)'
                    : '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}
        >
            {/* Glassmorphism Background Glow */}
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: isHovered ? 0.15 : 0, scale: isHovered ? 1.2 : 0.8 }}
                transition={{ duration: 0.4 }}
                className={cn("absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl pointer-events-none", colorConfig.glow)}
            />

            {/* Gradient Border Effect on Hover */}
            <motion.div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                    background: `linear-gradient(135deg, ${color === 'blue' ? 'rgba(37, 99, 235, 0.1)' :
                        color === 'emerald' ? 'rgba(16, 185, 129, 0.1)' :
                            color === 'violet' ? 'rgba(139, 92, 246, 0.1)' :
                                'rgba(245, 158, 11, 0.1)'
                        } 0%, transparent 100%)`
                }}
            />

            <div className="flex items-center justify-between mb-4 relative z-10">
                <motion.div
                    whileHover={{ scale: 1.15, rotate: 5 }}
                    transition={{ duration: 0.3 }}
                    className={cn(
                        "h-12 w-12 rounded-xl flex items-center justify-center shadow-lg backdrop-blur-sm",
                        colorConfig.bg,
                        colorConfig.text
                    )}
                >
                    <Icon className="h-6 w-6" />
                </motion.div>
                {trend && (
                    <motion.span
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className={cn(
                            "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm shadow-sm",
                            trend === "up" ? "bg-[var(--success-bg)] text-[var(--success)]" : "bg-[var(--error-bg)] text-[var(--error)]"
                        )}
                    >
                        <TrendingUp className={cn("h-3 w-3 mr-1", trend === "down" && "rotate-180")} />
                        {trendValue}
                    </motion.span>
                )}
            </div>

            <div className="relative z-10">
                <p className="text-sm font-medium text-[var(--text-muted)] mb-1 uppercase tracking-wide">{title}</p>
                <div className="flex items-end justify-between">
                    {typeof value === 'number' ? (
                        <AnimatedNumber
                            value={value}
                            duration={2000}
                            className="text-3xl font-bold text-[var(--text-primary)] tracking-tight metric-number"
                        />
                    ) : (
                        <p className="text-3xl font-bold text-[var(--text-primary)] tracking-tight metric-number">{value}</p>
                    )}
                </div>
            </div>

            {/* Enhanced Sparkline Chart */}
            <motion.div
                initial={{ opacity: 0.6 }}
                animate={{ opacity: isHovered ? 1 : 0.7 }}
                className="h-14 w-full mt-4 -mb-2"
            >
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={colorConfig.chart} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={colorConfig.chart} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={colorConfig.chart}
                            strokeWidth={2.5}
                            fill={`url(#gradient-${title})`}
                            isAnimationActive={true}
                            animationDuration={1500}
                            animationEasing="ease-out"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </motion.div>
        </motion.div>
    );
}

function CourierCard({ data }: CourierCardProps) {
    const isWarning = data.status === 'warning';
    const isExcellent = data.status === 'excellent';
    const [isHovered, setIsHovered] = useState(false);

    const cardVariants = {
        hidden: { opacity: 0, scale: 0.95, y: 20 },
        visible: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: {
                duration: 0.4,
                ease: [0.22, 1, 0.36, 1] as const
            }
        },
        hover: {
            y: -6,
            scale: 1.01,
            transition: { duration: 0.25 }
        }
    };

    return (
        <motion.div
            variants={cardVariants}
            whileHover="hover"
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            className={cn(
                "group relative overflow-hidden bg-[var(--bg-primary)] border rounded-2xl p-5 cursor-pointer",
                isWarning ? "border-[var(--warning-border)] shadow-[0_0_0_1px_var(--warning-border)]" :
                    isExcellent ? "border-[var(--success-border)] shadow-[0_0_0_1px_rgba(16,185,129,0.1)]" :
                        "border-[var(--border-subtle)]"
            )}
            style={{
                boxShadow: isHovered
                    ? '0 12px 30px -10px rgba(0, 0, 0, 0.15)'
                    : undefined
            }}
        >
            {/* Animated Glow Background */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovered ? 1 : 0 }}
                className={cn(
                    "absolute inset-0 pointer-events-none",
                    isWarning ? "bg-gradient-to-br from-[var(--warning-bg)]/30 to-transparent" :
                        "bg-gradient-to-br from-[var(--primary-blue-soft)]/30 to-transparent"
                )}
            />

            {/* Top Row */}
            <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="flex items-center gap-3">
                    <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ duration: 0.3 }}
                        className={cn(
                            "h-12 w-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm",
                            isWarning ? "bg-[var(--warning-bg)] text-[var(--warning)]" : "bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                        )}
                    >
                        {data.logo}
                    </motion.div>
                    <div>
                        <h3 className="font-bold text-[var(--text-primary)] text-base">{data.name}</h3>
                        <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                            <Truck className="h-3 w-3" />
                            {data.volume} shipments
                        </div>
                    </div>
                </div>
                {isWarning && (
                    <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="h-8 w-8 rounded-full bg-[var(--warning-bg)] flex items-center justify-center shadow-sm"
                    >
                        <AlertTriangle className="h-4 w-4 text-[var(--warning)]" />
                    </motion.div>
                )}
            </div>

            {/* Metrics Grid */}
            <div className="flex items-center justify-between gap-4 mb-4 relative z-10">
                {/* Radial Progress for SLA */}
                <motion.div
                    className="flex-shrink-0"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.2 }}
                >
                    <RadialProgress
                        value={data.sla}
                        size={90}
                        strokeWidth={6}
                        showValue={true}
                        animated={true}
                    />
                    <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider text-center mt-1">SLA Performance</p>
                </motion.div>

                {/* Trend Stats */}
                <div className="flex-1 grid grid-cols-2 gap-2">
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="bg-[var(--bg-secondary)] p-3 rounded-xl transition-colors"
                    >
                        <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">7-Day Trend</p>
                        <div className="flex items-center gap-1">
                            <p className={cn(
                                "text-lg font-bold metric-number leading-none",
                                data.trend.startsWith('+') ? "text-[var(--success)]" : "text-[var(--error)]"
                            )}>
                                {data.trend}
                            </p>
                        </div>
                    </motion.div>

                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="bg-[var(--bg-secondary)] p-3 rounded-xl transition-colors"
                    >
                        <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Issues</p>
                        <p className={cn(
                            "text-lg font-bold metric-number",
                            data.issues === 0 ? "text-[var(--success)]" : "text-[var(--warning)]"
                        )}>
                            {data.issues}
                        </p>
                    </motion.div>
                </div>
            </div>

            {/* Mini Chart */}
            <motion.div
                initial={{ opacity: 0.7 }}
                animate={{ opacity: isHovered ? 1 : 0.8 }}
                className="h-14 -mx-2 mb-3"
            >
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.trendData.map((val, i) => ({ val, i }))}>
                        <defs>
                            <linearGradient id={`gradient-${data.name}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={isWarning ? "#F59E0B" : "#2525FF"} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={isWarning ? "#F59E0B" : "#2525FF"} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Area
                            type="basis"
                            dataKey="val"
                            stroke={isWarning ? "#F59E0B" : "#6B6BFF"}
                            strokeWidth={2.5}
                            fill={`url(#gradient-${data.name})`}
                            isAnimationActive={true}
                            animationDuration={1200}
                            animationEasing="ease-in-out"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </motion.div>

            {/* Actions */}
            <div className="relative z-10">
                {isWarning ? (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full h-9 rounded-lg text-xs font-bold bg-[var(--warning-bg)] text-[var(--warning)] hover:shadow-md transition-all duration-200 border border-[var(--warning)]/20"
                    >
                        Investigate High Failures
                    </motion.button>
                ) : (
                    <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className="w-full h-9 rounded-lg text-xs font-semibold text-[var(--text-secondary)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] border border-transparent hover:border-[var(--border-subtle)] transition-all duration-200"
                    >
                        View Detailed Report
                    </motion.button>
                )}
            </div>
        </motion.div>
    );
}

export default function AdminDashboardPage() {
    const { addToast } = useToast();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showSystemAlert, setShowSystemAlert] = useState(true);

    const [greeting, setGreeting] = useState('');

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);

        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good Morning');
        else if (hour < 18) setGreeting('Good Afternoon');
        else setGreeting('Good Evening');

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="space-y-8 pb-10">
            {/* Header - Premium Redesign */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-fade-in">
                <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-[var(--primary-blue)] mb-1 bg-[var(--primary-blue-soft)] w-fit px-3 py-1 rounded-full">
                        <LayoutDashboard className="w-3.5 h-3.5" />
                        <span>Platform Command Center</span>
                    </div>
                    <h1 className="text-4xl font-bold text-[var(--text-primary)] tracking-tight mb-2">
                        {greeting}, Dhiraj <span className="text-2xl">👋</span>
                    </h1>
                    <p className="text-[var(--text-secondary)] flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-[var(--text-muted)]" />
                        {currentTime.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>

                <div className="flex items-center gap-4 bg-[var(--bg-primary)] p-2 rounded-2xl border border-[var(--border-subtle)] shadow-sm">
                    {/* Status Orb */}
                    <div className="hidden sm:flex items-center gap-3 pl-2 pr-4 border-r border-[var(--border-subtle)]">
                        <div className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--success)] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--success)] shadow-[0_0_8px_var(--success)]"></span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">System Status</span>
                            <span className="text-xs font-bold text-[var(--success)] leading-none">Operational</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <DateRangePicker />
                        <button
                            onClick={() => addToast('Refreshing data...', 'info')}
                            className="h-10 w-10 rounded-xl flex items-center justify-center text-[var(--text-secondary)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--primary-blue)] transition-all duration-200"
                            title="Refresh Data"
                        >
                            <RefreshCcw className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* System Notification Banner */}
            {showSystemAlert && (
                <div className="relative overflow-hidden rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-px animate-fade-in stagger-1">
                    <div className="relative flex items-center justify-between gap-4 rounded-xl px-5 py-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--info-bg)] text-[var(--info)]">
                                <Server className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="font-semibold text-sm sm:text-base text-[var(--text-primary)]">System Update Scheduled</p>
                                <p className="text-xs sm:text-sm text-[var(--text-secondary)]">Maintenance scheduled for Dec 15, 02:00 AM - 04:00 AM IST. No downtime expected.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowSystemAlert(false)}
                            className="rounded-full p-1.5 hover:bg-[var(--bg-tertiary)] transition-all duration-200 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* AI Command Center - Premium Redesign with Enhanced Animations */}
            <motion.div
                className="grid lg:grid-cols-12 gap-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
            >
                {/* AI Insights - Width 8/12 */}
                <motion.div
                    className="lg:col-span-8 relative overflow-hidden group"
                    whileHover={{ scale: 1.01 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary-blue)] to-[var(--primary-blue-deep)] rounded-3xl opacity-100 transition-all duration-300"></div>

                    {/* Decorative Background Elements */}
                    <motion.div
                        className="absolute top-0 right-0 p-8 opacity-10"
                        animate={{
                            rotate: [0, 360],
                            scale: [1, 1.05, 1]
                        }}
                        transition={{
                            rotate: { duration: 30, repeat: Infinity, ease: "linear" },
                            scale: { duration: 5, repeat: Infinity, ease: "easeInOut" }
                        }}
                    >
                        <BrainCircuit className="w-48 h-48 text-white" />
                    </motion.div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2"></div>

                    <div className="relative h-full p-6 md:p-8 flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <motion.div
                                    className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner border border-white/10"
                                    animate={{
                                        boxShadow: [
                                            "0 0 10px rgba(255,255,255,0.2)",
                                            "0 0 20px rgba(255,255,255,0.4)",
                                            "0 0 10px rgba(255,255,255,0.2)"
                                        ]
                                    }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                >
                                    <BrainCircuit className="h-5 w-5" />
                                </motion.div>
                                <div>
                                    <h2 className="font-bold text-white text-xl">AI Smart Insights</h2>
                                    <p className="text-blue-100 text-xs font-medium">Real-time predictive analytics</p>
                                </div>
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="h-8 px-4 rounded-lg text-xs font-semibold bg-white/10 text-white hover:bg-white/20 transition-all duration-200 backdrop-blur-sm border border-white/10 flex items-center gap-2"
                            >
                                View Forecast
                                <ArrowUpRight className="h-3 w-3" />
                            </motion.button>
                        </div>

                        {/* Insights Carousel / Grid with Stagger */}
                        <motion.div
                            className="grid md:grid-cols-2 gap-4 mt-auto"
                            initial="hidden"
                            animate="visible"
                            variants={{
                                visible: {
                                    transition: {
                                        staggerChildren: 0.15,
                                        delayChildren: 0.3
                                    }
                                }
                            }}
                        >
                            {aiInsights.slice(0, 2).map((insight, index) => (
                                <motion.div
                                    key={insight.id}
                                    variants={{
                                        hidden: { opacity: 0, x: -20, scale: 0.9 },
                                        visible: {
                                            opacity: 1,
                                            x: 0,
                                            scale: 1,
                                            transition: { duration: 0.4 }
                                        }
                                    }}
                                    whileHover={{
                                        scale: 1.03,
                                        y: -4,
                                        transition: { duration: 0.2 }
                                    }}
                                    className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 cursor-pointer group/card relative overflow-hidden"
                                >
                                    <motion.div
                                        className={`absolute top-0 left-0 w-1 h-full ${insight.type === 'opportunity' ? 'bg-emerald-400' :
                                            insight.type === 'optimization' ? 'bg-amber-400' : 'bg-rose-400'
                                            }`}
                                        initial={{ scaleY: 0 }}
                                        animate={{ scaleY: 1 }}
                                        transition={{ duration: 0.5, delay: index * 0.2 + 0.5 }}
                                    />
                                    <div className="flex justify-between items-start mb-2 pl-3">
                                        <motion.div
                                            className="p-2 rounded-lg bg-white/10 w-fit"
                                            whileHover={{ rotate: 360 }}
                                            transition={{ duration: 0.5 }}
                                        >
                                            <insight.icon className="h-4 w-4 text-white" />
                                        </motion.div>
                                        <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider bg-white/5 px-2 py-1 rounded-md">
                                            {insight.type}
                                        </span>
                                    </div>
                                    <div className="pl-3">
                                        <h3 className="font-bold text-white text-sm mb-1 line-clamp-1">{insight.title}</h3>
                                        <p className="text-blue-100 text-xs leading-relaxed line-clamp-2 mb-3 opacity-90">{insight.description}</p>
                                        <span className="text-xs font-semibold text-white group-hover/card:underline decoration-white/50 underline-offset-4 flex items-center gap-1">
                                            {insight.action} <ChevronDown className="w-3 h-3 -rotate-90 opacity-70" />
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </motion.div>

                {/* Quick Actions Dock - Width 4/12 */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                    <motion.div
                        className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-3xl p-6 h-full shadow-sm relative overflow-hidden"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-[var(--text-primary)]">Quick Actions</h2>
                            <motion.button
                                whileHover={{ rotate: 90 }}
                                transition={{ duration: 0.3 }}
                                className="text-[var(--primary-blue)] hover:bg-[var(--primary-blue-soft)] p-1.5 rounded-lg transition-colors"
                            >
                                <Settings className="w-4 h-4" />
                            </motion.button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 h-full pb-2">
                            {[
                                { icon: Users, label: "Verify Sellers", color: "blue" },
                                { icon: FileText, label: "Daily Reports", color: "emerald" },
                                { icon: Megaphone, label: "Broadcast", color: "amber" },
                                { icon: Wallet, label: "Manage Payouts", color: "violet" }
                            ].map((action, index) => (
                                <motion.button
                                    key={action.label}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.4 + index * 0.1, duration: 0.3 }}
                                    whileHover={{ scale: 1.05, y: -2 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="flex flex-col items-center justify-center gap-3 p-3 rounded-2xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-all duration-200 group border border-transparent hover:border-[var(--border-subtle)]"
                                >
                                    <div className={cn(
                                        "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300",
                                        action.color === "blue" && "bg-blue-500/10 text-blue-600 group-hover:bg-blue-500 group-hover:text-white",
                                        action.color === "emerald" && "bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white",
                                        action.color === "amber" && "bg-amber-500/10 text-amber-600 group-hover:bg-amber-500 group-hover:text-white",
                                        action.color === "violet" && "bg-violet-500/10 text-violet-600 group-hover:bg-violet-500 group-hover:text-white"
                                    )}>
                                        <action.icon className="h-5 w-5" />
                                    </div>
                                    <span className="text-xs font-semibold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">{action.label}</span>
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </motion.div>

            {/* Key Metrics Row - Premium with Stagger Animation */}
            <motion.div
                className="grid gap-6 md:grid-cols-4"
                initial="hidden"
                animate="visible"
                variants={{
                    visible: {
                        transition: {
                            staggerChildren: 0.1,
                            delayChildren: 0.2
                        }
                    }
                }}
            >
                <MetricCard
                    title="Active Sellers"
                    value={platformMetrics.activeSellers}
                    subtext="View all sellers"
                    icon={Users}
                    trend="up"
                    trendValue={`+${platformMetrics.sellersGrowth}%`}
                    color="blue"
                    chartData={platformMetrics.sparklines.sellers}
                />
                <MetricCard
                    title="Total GMV"
                    value={formatCurrency(platformMetrics.totalGMV)}
                    subtext="Revenue analytics"
                    icon={IndianRupee}
                    trend="up"
                    trendValue={`+${platformMetrics.gmvGrowth}%`}
                    color="emerald"
                    chartData={platformMetrics.sparklines.gmv}
                />
                <MetricCard
                    title="Shipments Today"
                    value={platformMetrics.shipmentsToday.toLocaleString()}
                    subtext="Live tracking"
                    icon={Package}
                    trend="up"
                    trendValue={`+${platformMetrics.shipmentsGrowth}%`}
                    color="violet"
                    chartData={platformMetrics.sparklines.shipments}
                />
                <MetricCard
                    title="Platform Margin"
                    value={`${platformMetrics.platformMargin}%`}
                    subtext="Financial report"
                    icon={BarChart3}
                    trend="up"
                    trendValue={`+${platformMetrics.marginGrowth}%`}
                    color="amber"
                    chartData={platformMetrics.sparklines.margin}
                />
            </motion.div>

            {/* Courier Performance Grid - Redesigned with Stagger */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-[var(--text-primary)]">Courier Performance Overview</h2>
                    <Link href="/admin/couriers" className="text-sm font-medium text-[var(--primary-blue)] hover:text-[var(--primary-blue-deep)] transition-colors flex items-center gap-1">
                        Manage Couriers <ArrowUpRight className="h-4 w-4" />
                    </Link>
                </div>
                <motion.div
                    className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
                    initial="hidden"
                    animate="visible"
                    variants={{
                        visible: {
                            transition: {
                                staggerChildren: 0.08,
                                delayChildren: 0.3
                            }
                        }
                    }}
                >
                    {courierPerformance.map((courier) => (
                        <CourierCard key={courier.name} data={courier} />
                    ))}
                </motion.div>
            </div>

            {/* Two Column Layout: Activity & Financials - Premium with Animations */}
            <motion.div
                className="grid lg:grid-cols-3 gap-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
            >
                {/* Real-time Activity Timeline */}
                <div className="lg:col-span-2 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden flex flex-col">
                    <div className="px-6 py-5 flex items-center justify-between border-b border-[var(--border-subtle)]">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center">
                                <Activity className="h-4 w-4 text-[var(--text-muted)]" />
                            </div>
                            <h2 className="font-bold text-[var(--text-primary)]">System Activity</h2>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="h-8 px-3 rounded-lg text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-all duration-200 flex items-center gap-2"
                        >
                            <Filter className="h-3 w-3" />
                            Filter
                        </motion.button>
                    </div>

                    <div className="p-6 relative">
                        {/* Timeline Connector Line */}
                        <motion.div
                            className="absolute left-[2.25rem] top-8 bottom-8 w-px bg-gradient-to-b from-[var(--border-subtle)] via-[var(--border-subtle)] to-transparent"
                            initial={{ scaleY: 0 }}
                            animate={{ scaleY: 1 }}
                            transition={{ duration: 1, delay: 0.6 }}
                        />

                        <motion.div
                            className="space-y-6"
                            initial="hidden"
                            animate="visible"
                            variants={{
                                visible: {
                                    transition: {
                                        staggerChildren: 0.1,
                                        delayChildren: 0.7
                                    }
                                }
                            }}
                        >
                            {activityFeed.map((activity, index) => (
                                <motion.div
                                    key={activity.id}
                                    className="relative flex gap-4 group"
                                    variants={{
                                        hidden: { opacity: 0, x: -20 },
                                        visible: {
                                            opacity: 1,
                                            x: 0,
                                            transition: { duration: 0.4 }
                                        }
                                    }}
                                    whileHover={{ x: 4 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <motion.div
                                        className={cn(
                                            "relative z-10 h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-[0_0_0_4px_var(--bg-primary)] transition-all duration-300",
                                            activity.color === 'blue' ? "bg-[var(--primary-blue)] text-white" :
                                                activity.color === 'purple' ? "bg-purple-500 text-white" :
                                                    activity.color === 'emerald' ? "bg-[var(--success)] text-white" :
                                                        "bg-[var(--info)] text-white"
                                        )}
                                        whileHover={{ scale: 1.15, rotate: 5 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <activity.icon className="h-4 w-4" />
                                    </motion.div>
                                    <motion.div
                                        className="flex-1 min-w-0 pt-0.5 bg-[var(--bg-secondary)] p-4 rounded-2xl group-hover:bg-[var(--bg-tertiary)] transition-colors border border-transparent group-hover:border-[var(--border-subtle)]"
                                        whileHover={{ scale: 1.01 }}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="text-sm text-[var(--text-primary)] font-medium">
                                                    <span className="font-bold text-[var(--text-primary)] opacity-90">{activity.user}</span> {activity.action}
                                                </p>
                                                <p className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-1.5">
                                                    <Clock className="h-3 w-3" />
                                                    {activity.time}
                                                </p>
                                            </div>
                                            <motion.button
                                                whileHover={{ scale: 1.1, rotate: 90 }}
                                                transition={{ duration: 0.2 }}
                                                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1 rounded-md hover:bg-[var(--bg-primary)]"
                                            >
                                                <MoreHorizontal className="h-4 w-4" />
                                            </motion.button>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                    <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 mt-auto text-center">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest hover:text-[var(--primary-blue)] transition-colors flex items-center justify-center gap-2"
                        >
                            View Full History <ArrowUpRight className="w-3 h-3" />
                        </motion.button>
                    </div>
                </div>

                {/* Financial Wallet Card */}
                <div className="space-y-6">
                    <div className="relative overflow-hidden rounded-3xl p-6 text-white h-64 flex flex-col justify-between group shadow-xl">
                        {/* Gradient Background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-black z-0"></div>
                        <div className="absolute inset-0 bg-gradient-to-tr from-[var(--primary-blue)]/20 to-purple-500/20 z-0 opacity-50"></div>

                        {/* Content */}
                        <div className="relative z-10 flex items-start justify-between">
                            <div className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
                                <Wallet className="h-6 w-6 text-white" />
                            </div>
                            <span className="px-3 py-1 rounded-full bg-white/10 text-[10px] font-bold tracking-widest uppercase border border-white/5 backdrop-blur-md">Wallet</span>
                        </div>

                        <div className="relative z-10">
                            <p className="text-slate-400 text-sm font-medium mb-1">Total Balance</p>
                            <h3 className="text-4xl font-bold tracking-tight text-white mb-1">₹1,24,592.50</h3>
                            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold bg-emerald-500/10 w-fit px-2 py-1 rounded-lg">
                                <TrendingUp className="w-3 h-3" />
                                +12.5% this week
                            </div>
                        </div>

                        <div className="relative z-10 flex gap-3 mt-4">
                            <button className="flex-1 h-9 rounded-xl bg-white text-slate-900 text-xs font-bold hover:bg-slate-200 transition-colors">
                                Add Funds
                            </button>
                            <button className="flex-1 h-9 rounded-xl bg-white/10 text-white backdrop-blur-md border border-white/10 text-xs font-bold hover:bg-white/20 transition-colors">
                                Withdraw
                            </button>
                        </div>
                    </div>

                    <div className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-2xl p-5">
                        <h3 className="font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-[var(--text-muted)]" />
                            Pending Actions
                        </h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-secondary)] border border-transparent hover:border-[var(--border-subtle)] transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                                        <Clock className="w-4 h-4 text-amber-500" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-[var(--text-primary)]">Pending Payouts</span>
                                        <span className="text-[10px] text-[var(--text-muted)]">3 requests waiting</span>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-secondary)] border border-transparent hover:border-[var(--border-subtle)] transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-[var(--primary-blue-soft)] flex items-center justify-center">
                                        <Users className="w-4 h-4 text-[var(--primary-blue)]" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-[var(--text-primary)]">KYC Approvals</span>
                                        <span className="text-[10px] text-[var(--text-muted)]">5 new documents</span>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                            </div>
                        </div>
                    </div>
                </div>


                {/* Top Sellers Component */}
                <div className="animate-fade-in stagger-6">
                    <TopSellers />
                </div>
            </motion.div>
        </div>
    );
}
