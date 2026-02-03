"use client";

import { useMemo, useState } from 'react';
import { useDebouncedValue } from '@/src/hooks/data';
import { motion } from 'framer-motion';
import { DataTable } from '@/src/components/ui/data/DataTable';
import { Button } from '@/src/components/ui/core/Button';
import { DateRangePicker } from '@/src/components/ui/form/DateRangePicker';
import { formatCurrency, cn } from '@/src/lib/utils';
import { apiClient } from '@/src/core/api/http';
import { handleApiError, showInfoToast } from '@/src/lib/error';
import { ShipmentDetailModal } from '@/src/components/admin/ShipmentDetailModal';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { getCourierLogo, isUsingMockData } from '@/src/constants';
import {
    Search,
    Eye,
    FileText,
    ClipboardCheck,
    Package,
    Truck,
    CheckCircle,
    Clock,
    AlertTriangle,
    RotateCcw,
    Filter,
    Download,
    BarChart3
} from 'lucide-react';
import { Shipment } from '@/src/types/domain/admin';
import { useShipments, useGenerateBulkLabels } from '@/src/core/api/hooks/orders/useShipments';

export function ShipmentsClient() {
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedValue(search, 300);
    const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(1);
    const limit = 20;

    // Bulk Actions State
    const [selectedShipmentIds, setSelectedShipmentIds] = useState<Set<string>>(new Set());

    // --- REAL API INTEGRATION ---
    const {
        data: shipmentsResponse,
        isLoading,
        error
    } = useShipments({
        page,
        limit,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: debouncedSearch || undefined
    });

    const generateBulkLabels = useGenerateBulkLabels();

    // Use real data from API
    const shipmentsData: any[] = shipmentsResponse?.shipments || [];

    // Filtering is done server-side via API
    const filteredData = shipmentsData;

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const allIds = new Set(filteredData.map((s: any) => s._id || s.id));
            setSelectedShipmentIds(allIds);
        } else {
            setSelectedShipmentIds(new Set());
        }
    };

    const handleSelectRow = (id: string, checked: boolean) => {
        const newSelected = new Set(selectedShipmentIds);
        if (checked) {
            newSelected.add(id);
        } else {
            newSelected.delete(id);
        }
        setSelectedShipmentIds(newSelected);
    };

    const handleBulkPrint = () => {
        if (selectedShipmentIds.size === 0) return;
        generateBulkLabels.mutate(Array.from(selectedShipmentIds));
    };

    const handleViewPOD = async (shipmentId: string) => {
        try {
            const response = await apiClient.get(`/shipments/${shipmentId}/pod`);
            const podUrl = response?.data?.data?.podUrl;

            if (podUrl) {
                window.open(podUrl, '_blank');
            } else {
                showInfoToast('POD not available yet');
            }
        } catch (error) {
            handleApiError(error, 'POD not available');
        }
    };

    // Status Cards Data
    const statusGrid = [
        { id: 'all', label: 'Total Shipments', icon: Package, color: 'blue', count: shipmentsData.length },
        { id: 'pending', label: 'Pending Pickup', icon: Clock, color: 'amber', count: shipmentsData.filter((s: any) => (s.status || s.currentStatus) === 'pending' || (s.status || s.currentStatus) === 'created').length },
        { id: 'in-transit', label: 'In Transit', icon: Truck, color: 'violet', count: shipmentsData.filter((s: any) => (s.status || s.currentStatus) === 'in-transit' || (s.status || s.currentStatus) === 'in_transit').length },
        { id: 'delivered', label: 'Delivered', icon: CheckCircle, color: 'emerald', count: shipmentsData.filter((s: any) => (s.status || s.currentStatus) === 'delivered').length },
        { id: 'ndr', label: 'NDR / Issues', icon: AlertTriangle, color: 'orange', count: shipmentsData.filter((s: any) => (s.status || s.currentStatus) === 'ndr').length },
        { id: 'rto', label: 'RTO / Returned', icon: RotateCcw, color: 'rose', count: shipmentsData.filter((s: any) => (s.status || s.currentStatus) === 'rto').length },
    ];

    // Helper to get color classes based on status color ID
    const getStatusColorClasses = (color: string) => {
        switch (color) {
            case 'blue': return "bg-[var(--primary-blue-soft)] text-[var(--primary-blue)]";
            case 'amber': return "bg-[var(--warning-bg)] text-[var(--warning)]";
            case 'emerald': return "bg-[var(--success-bg)] text-[var(--success)]";
            case 'rose': return "bg-[var(--error-bg)] text-[var(--error)]";
            case 'violet': return "bg-[var(--primary-blue-soft)] text-[var(--primary-blue)]"; // Mapped to primary blue for consistency
            case 'orange': return "bg-[var(--warning-bg)] text-[var(--warning)]"; // Mapped to warning for consistency
            default: return "bg-[var(--bg-secondary)] text-[var(--text-muted)]";
        }
    };

    // Columns
    const columns = [
        {
            header: '',
            accessorKey: 'select',
            width: 'w-10',
            cell: (row: Shipment) => (
                <div className="flex items-center justify-center -ml-2" onClick={(e) => e.stopPropagation()}>
                    <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--primary-blue)] focus:ring-[var(--primary-blue)]"
                        checked={selectedShipmentIds.has((row as any)._id || (row as any).id)}
                        onChange={(e) => handleSelectRow((row as any)._id || (row as any).id, e.target.checked)}
                    />
                </div>
            )
        },
        {
            header: 'Shipment Details',
            accessorKey: 'awb',
            cell: (row: Shipment) => (
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                        <Package className="w-4 h-4 text-[var(--text-muted)]" />
                    </div>
                    <div>
                        <div className="font-bold text-[var(--text-primary)] text-sm">{row.awb}</div>
                        <div className="text-xs text-[var(--text-muted)] flex items-center gap-1 font-medium">
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
                        row.paymentMode === 'prepaid' ? "bg-[var(--success-bg)] text-[var(--success)]" : "bg-[var(--primary-blue-soft)] text-[var(--primary-blue)]"
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
                    <Button variant="ghost" size="sm" onClick={() => setSelectedShipment(row)} className="hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                        <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                        <FileText className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
                        onClick={() => handleViewPOD((row as any)._id || (row as any).id)}
                        title="View POD"
                    >
                        <ClipboardCheck className="w-4 h-4" />
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="min-h-screen space-y-8 pb-20">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 text-sm font-medium text-[var(--primary-blue)] mb-2"
                    >
                        <div className="px-2.5 py-1 rounded-lg bg-[var(--primary-blue-soft)] border border-[var(--primary-blue-light)]/20 flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--primary-blue)] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--primary-blue)]"></span>
                            </span>
                            Tracking Live
                        </div>
                    </motion.div>
                    <div className="flex items-center gap-3">
                        <motion.h1
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-4xl font-bold text-[var(--text-primary)] tracking-tight"
                        >
                            Shipments
                        </motion.h1>
                        {isUsingMockData && (
                            <span className="px-2 py-1 text-xs font-semibold rounded-lg bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning)]/20">
                                ⚠️ Mock Data
                            </span>
                        )}
                    </div>
                    <p className="text-[var(--text-muted)] mt-1 font-medium">Track and manage all your deliveries</p>
                </div>

                <div className="flex items-center gap-3">
                    <DateRangePicker />
                    <button className="h-10 w-10 flex items-center justify-center rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors shadow-sm">
                        <Filter className="w-5 h-5" />
                    </button>
                    <button className="h-10 px-6 rounded-xl bg-[var(--primary-blue)] text-white hover:bg-[var(--primary-blue-deep)] transition-all flex items-center gap-2 font-semibold shadow-lg shadow-blue-500/20 active:scale-95">
                        <Download className="w-4 h-4" />
                        <span>Export</span>
                    </button>
                </div>
            </header>

            {/* Status Grid */}
            <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {statusGrid.map((status, i) => {
                    const isActive = statusFilter === status.id;
                    const colorClass = getStatusColorClasses(status.color);

                    return (
                        <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            key={status.id}
                            onClick={() => setStatusFilter(status.id)}
                            className={cn(
                                "relative p-4 rounded-[var(--radius-xl)] border transition-all text-left group overflow-hidden h-full flex flex-col justify-between",
                                isActive
                                    ? "bg-[var(--bg-primary)] border-[var(--primary-blue)] ring-1 ring-[var(--primary-blue)] shadow-md"
                                    : "bg-[var(--bg-primary)] border-[var(--border-subtle)] hover:border-[var(--primary-blue)]/50 hover:shadow-sm"
                            )}
                        >
                            <div className="flex items-start justify-between mb-3 w-full">
                                <div className={cn(
                                    "p-2.5 rounded-xl transition-colors",
                                    colorClass
                                )}>
                                    <status.icon className="w-4 h-4" />
                                </div>
                                {isActive && (
                                    <div className="w-2 h-2 rounded-full bg-[var(--primary-blue)] animate-pulse" />
                                )}
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-[var(--text-primary)]">{status.count}</p>
                                <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wide mt-1 line-clamp-1">{status.label}</p>
                            </div>
                        </motion.button>
                    );
                })}
            </section>

            {/* Search & Filters */}
            <div className="bg-[var(--bg-primary)] p-4 rounded-[var(--radius-xl)] border border-[var(--border-subtle)] shadow-sm">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                    <input
                        type="text"
                        placeholder="Search by AWB, Order ID, or Customer..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-transparent focus:bg-[var(--bg-primary)] focus:border-[var(--primary-blue)] focus:ring-1 focus:ring-[var(--primary-blue)] text-base transition-all text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                    />
                </div>
            </div>

            {/* Bulk Action Bar */}
            {selectedShipmentIds.size > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center justify-between p-4 bg-[var(--primary-blue-soft)] border border-[var(--primary-blue-light)]/30 rounded-[var(--radius-xl)]"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-[var(--primary-blue)] text-white text-sm font-bold">
                            {selectedShipmentIds.size}
                        </div>
                        <span className="text-[var(--primary-blue-deep)] font-medium">Shipments Selected</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedShipmentIds(new Set())}
                            className="text-[var(--primary-blue)] hover:bg-[var(--primary-blue)]/5"
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleBulkPrint}
                            disabled={generateBulkLabels.isPending}
                            className="bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white gap-2"
                        >
                            {generateBulkLabels.isPending ? (
                                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Download className="w-4 h-4" />
                            )}
                            Print Bulk Labels
                        </Button>
                    </div>
                </motion.div>
            )}

            {/* Shipments Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-[var(--bg-primary)] rounded-[var(--radius-xl)] border border-[var(--border-subtle)] overflow-hidden shadow-sm"
            >
                <div className="p-6 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-[var(--text-primary)]">All Shipments</h3>
                            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                                {filteredData.length} {filteredData.length === 1 ? 'shipment' : 'shipments'} found
                            </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)] bg-[var(--bg-secondary)] px-3 py-1.5 rounded-lg border border-[var(--border-subtle)]">
                            <BarChart3 className="w-3.5 h-3.5" />
                            <span>Real-time updates enabled</span>
                        </div>
                    </div>
                </div>

                <div className='relative'>
                    <div className='absolute top-3 left-6 z-10' onClick={(e) => e.stopPropagation()}>
                        <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--primary-blue)] focus:ring-[var(--primary-blue)]"
                            checked={filteredData.length > 0 && selectedShipmentIds.size === filteredData.length}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                        />
                    </div>
                    <DataTable
                        columns={columns}
                        data={filteredData}
                        onRowClick={(row) => setSelectedShipment(row)}
                    />
                </div>
            </motion.div>

            {/* Detail Modal */}
            <ShipmentDetailModal
                isOpen={!!selectedShipment}
                onClose={() => setSelectedShipment(null)}
                shipment={selectedShipment}
            />
        </div>
    );
}
