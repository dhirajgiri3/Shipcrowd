"use client";
export const dynamic = "force-dynamic";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/core/Card';
import { Button } from '@/components/ui/core/Button';
import { Badge } from '@/components/ui/core/Badge';
import { Input } from '@/components/ui/core/Input';
import { MOCK_WAREHOUSES, MOCK_INVENTORY } from '@/lib/mockData';
import {
    Warehouse,
    MapPin,
    Package,
    Plus,
    AlertCircle,
    Search,
    Filter,
    BarChart3,
    ArrowUpRight,
    Settings,
    MoreHorizontal,
    Globe
} from 'lucide-react';
import { cn, formatCurrency } from '@/src/shared/utils';
import { useToast } from '@/components/ui/feedback/Toast';

export default function WarehousesPage() {
    const [search, setSearch] = useState('');
    const { addToast } = useToast();

    // Stats
    const stats = {
        total: MOCK_WAREHOUSES.length,
        capacity: MOCK_WAREHOUSES.reduce((acc, w) => acc + w.capacity, 0),
        utilized: MOCK_WAREHOUSES.reduce((acc, w) => acc + w.utilized, 0),
        active: MOCK_WAREHOUSES.filter(w => w.status === 'Active').length
    };

    const overallUtilization = Math.round((stats.utilized / stats.capacity) * 100);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-[var(--primary-blue-soft)] flex items-center justify-center text-[var(--primary-blue)] shadow-lg shadow-blue-500/20">
                        <Warehouse className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Warehouse Network</h1>
                        <p className="text-[var(--text-muted)] text-sm">Manage fulfillment centers and inventory distribution</p>
                    </div>
                </div>
                <Button className="bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white shadow-lg shadow-blue-500/25 border-0">
                    <Plus className="h-4 w-4 mr-2" /> Add Warehouse
                </Button>
            </div>

            {/* Network Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 rounded-lg bg-[var(--primary-blue-soft)] text-[var(--primary-blue)]">
                            <Warehouse className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold px-2 py-1 rounded-full bg-[var(--success-bg)] text-[var(--success)]">Active</span>
                    </div>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</p>
                    <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wide mt-1">Total Hubs</p>
                </div>

                <div className="p-5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 rounded-lg bg-[var(--primary-blue-soft)] text-[var(--primary-blue)]">
                            <Package className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.utilized.toLocaleString()}</p>
                    <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wide mt-1">Units Stored</p>
                </div>

                <div className="p-5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 rounded-lg bg-[var(--warning-bg)] text-[var(--warning)]">
                            <BarChart3 className="w-5 h-5" />
                        </div>
                        <span className={cn(
                            "text-xs font-bold px-2 py-1 rounded-full",
                            overallUtilization > 80 ? "bg-[var(--warning-bg)] text-[var(--warning)]" : "bg-[var(--success-bg)] text-[var(--success)]"
                        )}>
                            {overallUtilization}%
                        </span>
                    </div>
                    <div className="w-full h-2 bg-[var(--bg-tertiary)] rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-[var(--warning)] rounded-full" style={{ width: `${overallUtilization}%` }} />
                    </div>
                    <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wide mt-2">Space Utilized</p>
                </div>

                <div className="p-5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] overflow-hidden relative group cursor-pointer hover:border-[var(--primary-blue)]/50 transition-colors">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-[var(--primary-blue)]/10 blur-2xl rounded-full -mr-10 -mt-10" />
                    <div className="flex items-center gap-3 relative z-10 h-full">
                        <div className="p-3 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] group-hover:bg-[var(--primary-blue)] group-hover:text-white transition-colors">
                            <Globe className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="font-bold text-[var(--text-primary)] group-hover:text-[var(--primary-blue)] transition-colors">Interactive Map</p>
                            <p className="text-xs text-[var(--text-muted)]">View network topology</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Warehouses Grid */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[var(--text-primary)]">Fulfillment Centers</h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            placeholder="Find warehouse..."
                            className="pl-9 pr-4 py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-sm focus:ring-[var(--primary-blue)]/20"
                        />
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {MOCK_WAREHOUSES.map((wh, i) => (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            key={wh.id}
                            className="group relative p-6 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] hover:border-[var(--primary-blue)]/50 hover:shadow-lg transition-all"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 rounded-xl bg-[var(--bg-secondary)] group-hover:bg-[var(--bg-tertiary)] transition-colors">
                                    <Warehouse className="h-6 w-6 text-[var(--text-secondary)] group-hover:text-[var(--primary-blue)] transition-colors" />
                                </div>
                                <span className={cn(
                                    "px-2.5 py-1 rounded-full text-xs font-bold",
                                    wh.status === 'Active' ? "bg-[var(--success-bg)] text-[var(--success)]" : "bg-gray-500/10 text-gray-500"
                                )}>
                                    {wh.status}
                                </span>
                            </div>

                            <h3 className="font-bold text-[var(--text-primary)] text-lg mb-1">{wh.name}</h3>
                            <div className="flex items-center text-xs text-[var(--text-muted)] mb-4">
                                <MapPin className="h-3.5 w-3.5 mr-1" />
                                {wh.location}
                            </div>

                            <div className="space-y-3 p-4 rounded-xl bg-[var(--bg-secondary)]/50 border border-[var(--border-subtle)]">
                                <div>
                                    <div className="flex justify-between text-xs mb-1.5">
                                        <span className="text-[var(--text-muted)] font-medium">Capacity Used</span>
                                        <span className={cn(
                                            "font-bold",
                                            (wh.utilized / wh.capacity) > 0.9 ? "text-[var(--error)]" :
                                                (wh.utilized / wh.capacity) > 0.7 ? "text-[var(--warning)]" : "text-[var(--success)]"
                                        )}>{Math.round((wh.utilized / wh.capacity) * 100)}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                                        <div
                                            className={cn(
                                                "h-full rounded-full transition-all duration-500",
                                                (wh.utilized / wh.capacity) > 0.9 ? "bg-[var(--error)]" :
                                                    (wh.utilized / wh.capacity) > 0.7 ? "bg-[var(--warning)]" : "bg-[var(--success)]"
                                            )}
                                            style={{ width: `${(wh.utilized / wh.capacity) * 100}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[10px] mt-1.5 text-[var(--text-muted)]">
                                        <span>{wh.utilized.toLocaleString()} units</span>
                                        <span>{wh.capacity.toLocaleString()} max</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--border-subtle)]">
                                <Button variant="outline" size="sm" className="flex-1 h-8 text-xs bg-transparent border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]">
                                    Manage
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <Settings className="w-4 h-4 text-[var(--text-muted)]" />
                                </Button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Inventory Overview */}
            <div className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between">
                    <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <Package className="h-5 w-5 text-[var(--primary-blue)]" />
                        Inventory Snapshot
                    </h3>
                    <Button variant="ghost" size="sm" className="text-xs text-[var(--primary-blue)] hover:bg-[var(--primary-blue-soft)]/10">
                        View All Inventory <ArrowUpRight className="w-3 h-3 ml-1" />
                    </Button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[var(--bg-secondary)] text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                            <tr>
                                <th className="px-6 py-4 font-medium uppercase text-xs tracking-wider">SKU</th>
                                <th className="px-6 py-4 font-medium uppercase text-xs tracking-wider">Product</th>
                                <th className="px-6 py-4 font-medium uppercase text-xs tracking-wider">Warehouse</th>
                                <th className="px-6 py-4 font-medium uppercase text-xs tracking-wider">Quantity</th>
                                <th className="px-6 py-4 font-medium uppercase text-xs tracking-wider">Status</th>
                                <th className="px-6 py-4 font-medium uppercase text-xs tracking-wider text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-subtle)]">
                            {MOCK_INVENTORY.map((item, idx) => (
                                <tr key={idx} className="hover:bg-[var(--bg-secondary)]/50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-xs text-[var(--text-muted)]">{item.sku}</td>
                                    <td className="px-6 py-4 font-medium text-[var(--text-primary)]">{item.name}</td>
                                    <td className="px-6 py-4 text-[var(--text-secondary)]">{item.warehouse}</td>
                                    <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{item.quantity}</td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
                                            item.status === 'In Stock' ? "bg-[var(--success-bg)] text-[var(--success)]" :
                                                item.status === 'Low Stock' ? "bg-[var(--warning-bg)] text-[var(--warning)]" : "bg-gray-500/10 text-gray-500"
                                        )}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-xs font-medium text-[var(--primary-blue)] hover:underline">
                                            Restock
                                        </button>
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
