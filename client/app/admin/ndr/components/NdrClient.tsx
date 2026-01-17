"use client";
export const dynamic = "force-dynamic";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LazyBarChart as BarChart,
    LazyBar as Bar,
    LazyXAxis as XAxis,
    LazyYAxis as YAxis,
    LazyCartesianGrid as CartesianGrid,
    LazyTooltip as Tooltip,
    LazyResponsiveContainer as ResponsiveContainer,
    LazyAreaChart as AreaChart,
    LazyArea as Area,
    LazyCell as Cell
} from '@/src/components/charts/LazyCharts';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Badge } from '@/src/components/ui/core/Badge';
import { DateRangePicker } from '@/src/components/ui/form/DateRangePicker';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { formatCurrency, cn } from '@/src/shared/utils';
import {
    PackageX,
    Search,
    Filter,
    Phone,
    RefreshCw,
    RotateCcw,
    AlertTriangle,
    CheckCircle,
    MapPin,
    ArrowRight,
    Building2,
    TrendingDown,
    X
} from 'lucide-react';

// --- MOCK DATA ---
const mockAdminNDRs = [
    {
        id: 'NDR-ADM-881',
        seller: 'TechGadgets Inc.',
        awb: 'DL987654321IN',
        customer: 'Rahul Sharma',
        reason: 'Customer not available',
        status: 'action_required',
        courier: 'Delhivery',
        attempts: 2,
        lastAttempt: '2024-12-22'
    },
    {
        id: 'NDR-ADM-882',
        seller: 'Fashion Hub',
        awb: 'XB554433221IN',
        customer: 'Priya Singh',
        reason: 'Address incomplete',
        status: 'pending_seller',
        courier: 'Xpressbees',
        attempts: 1,
        lastAttempt: '2024-12-23'
    },
    {
        id: 'NDR-ADM-883',
        seller: 'HomeDecor',
        awb: 'BD112233445IN',
        customer: 'Amit Kumar',
        reason: 'Refused delivery',
        status: 'rto_initiated',
        courier: 'Bluedart',
        attempts: 3,
        lastAttempt: '2024-12-21'
    },
    {
        id: 'NDR-ADM-884',
        seller: 'TechGadgets Inc.',
        awb: 'DL998877665IN',
        customer: 'Sneha Gupta',
        reason: 'Customer requested reschedule',
        status: 'reattempt_scheduled',
        courier: 'Delhivery',
        attempts: 1,
        lastAttempt: '2024-12-23'
    },
    {
        id: 'NDR-ADM-885',
        seller: 'BookWorld',
        awb: 'DT123456789IN',
        customer: 'Vikram Malhotra',
        reason: 'Door locked',
        status: 'action_required',
        courier: 'DTDC',
        attempts: 2,
        lastAttempt: '2024-12-22'
    }
];

const funnelData = [
    { name: 'Total Attempted', value: 1250, fill: '#3B82F6' },
    { name: 'NDR Raised', value: 180, fill: '#F59E0B' },
    { name: 'Delivered (Reattempt)', value: 120, fill: '#10B981' },
    { name: 'RTO', value: 60, fill: '#EF4444' },
];

export function NdrClient() {
    const [activeTab, setActiveTab] = useState('all');
    const [search, setSearch] = useState('');
    const { addToast } = useToast();

    // Derived Data
    const filteredData = mockAdminNDRs.filter(item => {
        const matchesTab = activeTab === 'all' ||
            (activeTab === 'action' && item.status === 'action_required') ||
            (activeTab === 'pending' && item.status === 'pending_seller') ||
            (activeTab === 'rto' && item.status === 'rto_initiated');
        const matchesSearch = item.awb.toLowerCase().includes(search.toLowerCase()) ||
            item.seller.toLowerCase().includes(search.toLowerCase());
        return matchesTab && matchesSearch;
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-[var(--primary-blue-soft)] flex items-center justify-center text-[var(--primary-blue)] shadow-lg shadow-blue-500/20">
                        <PackageX className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">NDR Management</h1>
                        <p className="text-[var(--text-muted)] text-sm">Monitor and resolve non-delivery reports</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <DateRangePicker />
                    <Button variant="outline" className="border-[var(--error)]/20 text-[var(--error)] hover:bg-[var(--error-bg)] hover:text-[var(--error)]">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        View High Risk (45)
                    </Button>
                </div>
            </div>

            {/* Funnel & Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 1. Funnel Chart */}
                <div className="lg:col-span-2 p-6 rounded-3xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-[var(--text-primary)]">NDR Resolution Funnel</h3>
                        <Badge variant="success" className="bg-emerald-500/10 text-emerald-500 border-0">
                            66% Resolution Rate
                        </Badge>
                    </div>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }} barSize={32}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-subtle)" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'var(--bg-secondary)', opacity: 0.5 }}
                                    contentStyle={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-subtle)', borderRadius: '12px' }}
                                    itemStyle={{ color: 'var(--text-primary)' }}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {funnelData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Quick Stats */}
                <div className="space-y-4">
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-[var(--error-bg)] to-[var(--error-bg)]/50 border border-[var(--error)]/20">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 rounded-lg bg-[var(--error-bg)] text-[var(--error)]">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-bold text-[var(--error)] bg-white/50 px-2 py-1 rounded-full">+12 Today</span>
                        </div>
                        <p className="text-3xl font-bold text-[var(--text-primary)]">42</p>
                        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Action Required</p>
                    </div>

                    <div className="p-5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 rounded-lg bg-[var(--info-bg)] text-[var(--info)]">
                                <RefreshCw className="w-5 h-5" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-[var(--text-primary)]">85</p>
                        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Reattempts Scheduled</p>
                    </div>

                    <div className="p-5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 rounded-lg bg-[var(--warning-bg)] text-[var(--warning)]">
                                <RotateCcw className="w-5 h-5" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-[var(--text-primary)]">24</p>
                        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">RTO Initiated</p>
                    </div>
                </div>
            </div>

            {/* List Section */}
            <div className="flex flex-col gap-6">

                {/* Toolbar */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[var(--bg-primary)] p-2 rounded-2xl border border-[var(--border-subtle)]">
                    <div className="flex gap-1 bg-[var(--bg-secondary)] p-1 rounded-xl">
                        {['all', 'action', 'pending', 'rto'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-xs font-bold transition-all capitalize",
                                    activeTab === tab ? "bg-white text-black shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                )}
                            >
                                {tab.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search NDRs..."
                            className="bg-[var(--bg-secondary)] border-0 focus:ring-0 pl-9"
                        />
                    </div>
                </div>

                {/* Cards Grid */}
                <div className="grid gap-4">
                    <AnimatePresence>
                        {filteredData.map((ndr, i) => (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                key={ndr.id}
                                className="group p-5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] hover:border-[var(--primary-blue)]/50 hover:shadow-lg transition-all"
                            >
                                <div className="flex flex-col lg:flex-row items-center justify-between gap-6">

                                    {/* Left: Info */}
                                    <div className="flex items-center gap-4 w-full lg:w-auto">
                                        <div className={cn(
                                            "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg",
                                            ndr.status === 'action_required' ? "bg-[var(--error-bg)] text-[var(--error)]" :
                                                ndr.status === 'pending_seller' ? "bg-[var(--warning-bg)] text-[var(--warning)]" :
                                                    "bg-[var(--info-bg)] text-[var(--info)]"
                                        )}>
                                            {ndr.attempts}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-bold text-[var(--text-primary)]">{ndr.awb}</h4>
                                                <Badge variant="outline" className="text-[10px] h-5">{ndr.courier}</Badge>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                                                <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {ndr.seller}</span>
                                                <span>•</span>
                                                <span>{ndr.customer}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Middle: Reason */}
                                    <div className="flex-1 w-full lg:w-auto text-center lg:text-left">
                                        <div className="inline-block px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                                            <p className="text-sm font-medium text-[var(--text-secondary)]">
                                                <span className="text-[var(--text-muted)] mr-2">Reason:</span>
                                                {ndr.reason}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Right: Status & Action */}
                                    <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-end">
                                        <div className="text-right hidden sm:block">
                                            <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wide">Last Attempt</p>
                                            <p className="text-sm font-medium text-[var(--text-primary)]">{ndr.lastAttempt}</p>
                                        </div>

                                        {ndr.status === 'action_required' ? (
                                            <Button size="sm" className="bg-[var(--error)] hover:bg-[var(--error)]/90 text-white min-w-[120px]">
                                                Fix Now
                                            </Button>
                                        ) : (
                                            <Badge variant="secondary" className="px-3 py-1.5 min-w-[120px] justify-center">
                                                {ndr.status.replace('_', ' ')}
                                            </Badge>
                                        )}
                                    </div>

                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

            </div>
        </div>
    );
}
