'use client';
export const dynamic = "force-dynamic";

import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { DateRangePicker } from '@/src/components/ui/form/DateRangePicker';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { formatCurrency, cn, parsePaginationQuery } from '@/src/lib/utils';
import { ShipmentDetailModal } from '@/src/components/admin/ShipmentDetailModal';
import { ShipmentTable } from './ShipmentTable';
import {
    Search,
    Package,
    Truck,
    CheckCircle,
    Clock,
    AlertTriangle,
    RotateCcw,
    Filter,
    FileOutput,
    RefreshCw,
    Loader2,
    Info
} from 'lucide-react';

import { useShipments, useShipmentStats, Shipment as ApiShipment } from '@/src/core/api/hooks/orders/useShipments';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { useUrlDateRange } from '@/src/hooks/analytics/useUrlDateRange';
const DEFAULT_LIMIT = 10;

export function ShipmentsClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { addToast } = useToast();

    // -- State from URL & Local --
    const { page, limit } = parsePaginationQuery(searchParams, { defaultLimit: DEFAULT_LIMIT });
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';
    const {
        range: dateRange,
        startDateIso,
        endDateIso,
        setRange,
    } = useUrlDateRange();

    const [searchTerm, setSearchTerm] = useState(search);
    const [debouncedSearch, setDebouncedSearch] = useState(search);
    const [selectedShipment, setSelectedShipment] = useState<any | null>(null);

    // -- Debounce Search --
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Keep local search in sync with URL (back/forward/share links)
    useEffect(() => {
        setSearchTerm((current) => (current === search ? current : search));
        setDebouncedSearch((current) => (current === search ? current : search));
    }, [search]);

    // Sync debounced search to URL
    useEffect(() => {
        if (debouncedSearch !== search) {
            updateUrl({ search: debouncedSearch, page: 1 });
        }
    }, [debouncedSearch]);

    // -- Update URL Helper --
    const updateUrl = (updates: Record<string, string | number | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        searchParams.forEach((value, key) => {
            if (!(key in updates)) params.set(key, value);
        });

        Object.entries(updates).forEach(([key, value]) => {
            if (value === null || value === undefined || value === '') {
                params.delete(key);
            } else {
                params.set(key, String(value));
            }
        });
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const handleTabChange = (newStatus: string) => {
        updateUrl({ status: newStatus, page: 1 });
    };

    const handlePageChange = (newPage: number) => {
        updateUrl({ page: newPage });
    };

    const handleDateRangeChange = setRange;

    const handleRefresh = () => {
        refetch();
        addToast('Shipments refreshed', 'success');
    };

    // Fetch shipments
    const { data: shipmentsResponse, isLoading, refetch, isFetching } = useShipments({
        status: status !== 'all' ? status : undefined,
        search: debouncedSearch || undefined,
        startDate: startDateIso,
        endDate: endDateIso,
        page,
        limit
    });

    // Fetch stats
    const { data: stats } = useShipmentStats({ startDate: startDateIso, endDate: endDateIso });

    const shipmentsData = shipmentsResponse?.shipments || [];
    const pagination = shipmentsResponse?.pagination;

    // Reset to page 1 when current page is out of range (e.g. after filters reduce total)
    useEffect(() => {
        const total = pagination?.total ?? 0;
        const pages = pagination?.pages ?? 1;
        if (total > 0 && page > pages && shipmentsData.length === 0) {
            updateUrl({ page: 1 });
        }
    }, [pagination?.total, pagination?.pages, page, shipmentsData.length]);

    // Helper to extract order number
    const getOrderNumber = (orderId: any) => {
        if (typeof orderId === 'object' && orderId?.orderNumber) {
            return orderId.orderNumber;
        }
        return 'N/A';
    };

    const handleShipmentClick = (row: ApiShipment) => {
        const domainShipment = {
            id: row._id,
            awb: row.trackingNumber,
            orderNumber: getOrderNumber(row.orderId),
            status: row.currentStatus,
            customer: {
                name: (row as any).deliveryDetails?.recipientName || 'Unknown',
                phone: (row as any).deliveryDetails?.recipientPhone || 'N/A',
                email: (row as any).deliveryDetails?.recipientEmail || ''
            },
            origin: {
                city: 'Warehouse',
                state: '',
                pincode: ''
            },
            destination: {
                city: (row as any).deliveryDetails?.address?.city || '',
                state: (row as any).deliveryDetails?.address?.state || '',
                pincode: (row as any).deliveryDetails?.address?.postalCode || ''
            },
            courier: row.carrier,
            paymentMode: (row as any).paymentDetails?.type || 'prepaid',
            codAmount: (row as any).paymentDetails?.codAmount || 0,
            weight: (row as any).packageDetails?.weight || 0,
            createdAt: row.createdAt,
            quoteSnapshot: {
                provider: (row as any)?.pricingDetails?.selectedQuote?.provider,
                serviceName: (row as any)?.pricingDetails?.selectedQuote?.serviceName,
                quotedSellAmount: (row as any)?.pricingDetails?.selectedQuote?.quotedSellAmount,
                expectedCostAmount: (row as any)?.pricingDetails?.selectedQuote?.expectedCostAmount,
                expectedMarginAmount: (row as any)?.pricingDetails?.selectedQuote?.expectedMarginAmount,
                confidence: (row as any)?.pricingDetails?.selectedQuote?.confidence,
            },
        };
        setSelectedShipment(domainShipment);
    };

    const handleExport = () => {
        addToast('Export started. You will receive an email shortly.', 'success');
    };

    const statsConfig = [
        {
            title: 'Total Shipments',
            value: stats?.total || 0,
            icon: Package,
            iconColor: "bg-blue-600 text-white",
            trend: { value: 0, label: 'vs last week', positive: true },
            delay: 0,
            filter: 'all'
        },
        {
            title: 'Pending Pickup',
            value: stats?.pending || 0,
            icon: Clock,
            iconColor: "bg-yellow-500 text-white",
            trend: { value: 0, label: 'waiting', positive: false },
            delay: 1,
            filter: 'pending'
        },
        {
            title: 'In Transit',
            value: stats?.in_transit || 0,
            icon: Truck,
            iconColor: "bg-orange-500 text-white",
            trend: { value: 0, label: 'active now', positive: true },
            delay: 2,
            filter: 'in_transit'
        },
        {
            title: 'Delivered',
            value: stats?.delivered || 0,
            icon: CheckCircle,
            iconColor: "bg-emerald-500 text-white",
            trend: { value: 0, label: 'completed', positive: true },
            delay: 3,
            filter: 'delivered'
        },
        {
            title: 'NDR / Issues',
            value: stats?.ndr || 0,
            icon: AlertTriangle,
            iconColor: "bg-purple-500 text-white",
            trend: { value: 0, label: 'action needed', positive: false },
            delay: 4,
            filter: 'ndr'
        },
        {
            title: 'RTO / Returned',
            value: stats?.rto || 0,
            icon: RotateCcw,
            iconColor: "bg-red-500 text-white",
            trend: { value: 0, label: 'attention needed', positive: false },
            delay: 5,
            filter: 'rto'
        }
    ];

    const TABS = [
        { id: 'all', label: 'All' },
        { id: 'pending', label: 'Pending Pickup' },
        { id: 'in_transit', label: 'In Transit' },
        { id: 'delivered', label: 'Delivered' },
        { id: 'ndr', label: 'NDR' },
        { id: 'rto', label: 'RTO' },
    ];

    return (
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-fade-in bg-[var(--bg-secondary)] min-h-screen">
            {/* Header Section - Matched to OrdersClient */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Shipments</h1>
                    <p className="text-[var(--text-secondary)] mt-1">Track and manage all deliveries across the platform.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRefresh}
                        disabled={isFetching}
                        className="px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-2 text-sm font-medium shadow-sm disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
                        Refresh Data
                    </button>
                    <button
                        onClick={handleExport}
                        className="px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-2 text-sm font-medium shadow-sm disabled:opacity-50"
                    >
                        <FileOutput size={16} />
                        Export Data
                    </button>
                </div>
            </div>

            {/* Stats Grid - Flat Design matching Orders */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {statsConfig.map((stat, i) => (
                    <StatsCard
                        key={i}
                        title={stat.title}
                        value={stat.value}
                        icon={stat.icon}
                        iconColor={stat.iconColor}
                        trend={stat.trend as any}
                        delay={stat.delay}
                    />
                ))}
            </div>

            {/* Filters & Table */}
            <div className="space-y-4">
                {/* Controls - Matched with Orders */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[var(--bg-primary)] p-1 rounded-xl border border-[var(--border-default)]">
                    {/* Search */}
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" size={18} />
                        <input
                            type="text"
                            placeholder="Search by AWB, Order ID, or Customer..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-transparent text-sm focus:outline-none placeholder:text-[var(--text-muted)] text-[var(--text-primary)]"
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Date Picker */}
                        <div className="hidden md:block">
                            <DateRangePicker value={dateRange} onRangeChange={handleDateRangeChange} />
                        </div>

                        {/* Filter Tabs */}
                        <div className="flex items-center gap-1 bg-[var(--bg-tertiary)] p-1 rounded-lg overflow-x-auto scrollbar-hide">
                            {TABS.map((tab) => {
                                const isActive = status === tab.id;
                                let count = 0;
                                if (tab.id === 'all') count = stats?.total || 0;
                                else count = (stats as any)?.[tab.id] || 0;

                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => handleTabChange(tab.id)}
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${isActive
                                            ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                                            : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                                            }`}
                                    >
                                        {tab.label}
                                        {count > 0 && (
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)]' : 'bg-[var(--bg-primary)]/50'}`}>
                                                {count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <ShipmentTable
                        data={shipmentsData}
                        isLoading={isLoading}
                        onRefresh={handleRefresh}
                        pagination={pagination ? {
                            total: pagination.total,
                            page: pagination.page,
                            limit: pagination.limit,
                            totalPages: pagination.pages
                        } : undefined}
                        onPageChange={handlePageChange}
                        onRowClick={handleShipmentClick}
                    />
                </motion.div>
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
