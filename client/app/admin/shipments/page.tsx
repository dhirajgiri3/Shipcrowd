"use client";
export const dynamic = "force-dynamic";

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MOCK_SHIPMENTS } from '@/lib/mockData';
import { DataTable } from '@/components/ui/data/DataTable';
import { Button } from '@/components/ui/core/Button';
import { Input } from '@/components/ui/core/Input';
import { Badge } from '@/components/ui/core/Badge';
import { DateRangePicker } from '@/components/ui/form/DateRangePicker';
import { useToast } from '@/components/ui/feedback/Toast';
import { formatCurrency, cn } from '@/src/shared/utils';
import { ShipmentDetailModal } from '@/components/admin/ShipmentDetailModal';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { getCourierLogo } from '@/lib/constants';
import {
    Search,
    Eye,
    FileText,
    Package,
    Truck,
    CheckCircle,
    Clock,
    AlertTriangle,
    RotateCcw,
    Filter,
    Download,
    ArrowUpRight,
    MapPin,
    Calendar
} from 'lucide-react';
import { Shipment } from '@/types/admin';

export default function ShipmentsPage() {
    const [search, setSearch] = useState('');
    const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const { addToast } = useToast();

    // Derived Data
    const filteredData = useMemo(() => {
        return MOCK_SHIPMENTS.filter(item => {
            const matchesSearch =
                item.awb.toLowerCase().includes(search.toLowerCase()) ||
                item.customer.name.toLowerCase().includes(search.toLowerCase()) ||
                item.orderNumber.toLowerCase().includes(search.toLowerCase());

            const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [search, statusFilter]);

    // Status Cards Data
    const statusGrid = [
        { id: 'all', label: 'Total Shipments', icon: Package, color: 'blue' },
        { id: 'pending', label: 'Pending Pickup', icon: Clock, color: 'amber' },
        { id: 'in-transit', label: 'In Transit', icon: Truck, color: 'violet' },
        { id: 'delivered', label: 'Delivered', icon: CheckCircle, color: 'emerald' },
        { id: 'ndr', label: 'NDR / Issues', icon: AlertTriangle, color: 'orange' },
        { id: 'rto', label: 'RTO / Returned', icon: RotateCcw, color: 'rose' },
    ];

    const getStatusCount = (id: string) => {
        if (id === 'all') return MOCK_SHIPMENTS.length;
        return MOCK_SHIPMENTS.filter(s => s.status === id).length;
    };

    // Columns
    const columns = [
        {
            header: 'Shipment Details',
            accessorKey: 'awb',
            cell: (row: Shipment) => (
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                        <Package className="w-4 h-4 text-[var(--text-muted)]" />
                    </div>
                    <div>
                        <div className="font-bold text-[var(--text-primary)] text-sm">{row.awb}</div>
                        <div className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                            Order #{row.orderNumber}
                        </div>
                    </div>
                </div>
            )
        },
        {
            header: 'Customer',
            accessorKey: 'customer',
            cell: (row: Shipment) => (
                <div>
                    <div className="font-semibold text-[var(--text-primary)] text-sm">{row.customer.name}</div>
                    <div className="text-xs text-[var(--text-muted)]">{row.customer.phone}</div>
                </div>
            )
        },
        {
            header: 'Route',
            accessorKey: 'origin',
            cell: (row: Shipment) => (
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-[var(--text-secondary)] font-medium">{row.origin.city}</span>
                    <span className="text-[var(--text-muted)]">→</span>
                    <span className="text-[var(--text-primary)] font-bold">{row.destination.city}</span>
                </div>
            )
        },
        {
            header: 'Courier',
            accessorKey: 'courier',
            cell: (row: Shipment) => (
                <div className="flex items-center gap-2">
                    <img
                        src={getCourierLogo(row.courier)}
                        className="w-5 h-5 object-contain opacity-80"
                        alt={row.courier}
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${row.courier}&background=random&color=fff&size=20`;
                        }}
                    />
                    <span className="text-sm font-medium text-[var(--text-secondary)]">{row.courier}</span>
                </div>
            )
        },
        {
            header: 'Status',
            accessorKey: 'status',
            cell: (row: Shipment) => <StatusBadge status={row.status} />
        },
        {
            header: 'Amount',
            accessorKey: 'codAmount',
            cell: (row: Shipment) => (
                <div>
                    <div className="font-bold text-[var(--text-primary)] text-sm">{formatCurrency(row.codAmount)}</div>
                    <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase",
                        row.paymentMode === 'prepaid' ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500"
                    )}>
                        {row.paymentMode}
                    </span>
                </div>
            )
        },
        {
            header: 'Actions',
            accessorKey: 'id',
            cell: (row: Shipment) => (
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedShipment(row)}>
                        <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                        <FileText className="w-4 h-4" />
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-[var(--primary-blue-soft)] flex items-center justify-center text-[var(--primary-blue)] shadow-lg shadow-blue-500/20">
                        <Truck className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Shipments</h1>
                        <p className="text-[var(--text-muted)] text-sm">Track and manage all deliveries</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <DateRangePicker />
                    <Button className="bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white shadow-lg shadow-blue-500/25 border-0">
                        <Download className="h-4 w-4 mr-1.5" /> Export
                    </Button>
                </div>
            </div>

            {/* Status Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {statusGrid.map((status, i) => {
                    const count = getStatusCount(status.id);
                    const isActive = statusFilter === status.id;
                    return (
                        <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            key={status.id}
                            onClick={() => setStatusFilter(status.id)}
                            className={cn(
                                "relative p-4 rounded-2xl border transition-all text-left group overflow-hidden",
                                isActive
                                    ? "bg-[var(--bg-primary)] border-[var(--primary-blue)] ring-1 ring-[var(--primary-blue)] shadow-lg"
                                    : "bg-[var(--bg-primary)] border-[var(--border-subtle)] hover:border-[var(--primary-blue)]/50 hover:shadow-md"
                            )}
                        >
                            <div className="flex flex-col h-full justify-between">
                                <div className="flex items-start justify-between mb-2">
                                    <div className={cn(
                                        "p-2 rounded-lg",
                                        status.color === 'blue' ? "bg-blue-500/10 text-blue-500" :
                                            status.color === 'amber' ? "bg-amber-500/10 text-amber-500" :
                                                status.color === 'violet' ? "bg-violet-500/10 text-violet-500" :
                                                    status.color === 'emerald' ? "bg-emerald-500/10 text-emerald-500" :
                                                        status.color === 'orange' ? "bg-orange-500/10 text-orange-500" :
                                                            "bg-rose-500/10 text-rose-500"
                                    )}>
                                        <status.icon className="w-4 h-4" />
                                    </div>
                                    {isActive && <div className="w-2 h-2 rounded-full bg-[var(--primary-blue)]" />}
                                </div>
                                <div>
                                    <p className="text-xl font-bold text-[var(--text-primary)]">{count}</p>
                                    <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">{status.label}</p>
                                </div>
                            </div>
                        </motion.button>
                    );
                })}
            </div>

            {/* Filters & Table */}
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4 justify-between bg-[var(--bg-primary)] p-1.5 rounded-2xl border border-[var(--border-subtle)]">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            placeholder="Search by AWB, Order ID, or Customer..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border-transparent focus:bg-[var(--bg-primary)] focus:border-[var(--primary-blue)] focus:ring-0 text-sm transition-all"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-full">
                            <Filter className="w-4 h-4 mr-2" /> More Filters
                        </Button>
                    </div>
                </div>

                <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden shadow-sm">
                    <DataTable
                        columns={columns}
                        data={filteredData}
                        onRowClick={(row) => setSelectedShipment(row)}
                    />
                </div>
            </div>

            {/* Detail Modal */}
            <ShipmentDetailModal
                isOpen={!!selectedShipment}
                onClose={() => setSelectedShipment(null)}
                shipment={selectedShipment}
            />
        </div>
    );
}
