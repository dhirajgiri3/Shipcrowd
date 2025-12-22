"use client";
export const dynamic = "force-dynamic";

import { useMemo, useState } from 'react';
import { MOCK_SHIPMENTS } from '@/lib/mockData';
import { DataTable } from '@/src/shared/components/DataTable';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/shared/components/card';
import { Input } from '@/src/shared/components/Input';
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
    XCircle,
    PackageX
} from 'lucide-react';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Badge } from '@/src/shared/components/badge';
import { getCourierLogo } from '@/lib/constants';
import { FilterBar } from '@/components/admin/FilterBar';
import { Button } from '@/src/shared/components/button';
import { ShipmentDetailModal } from '@/components/admin/ShipmentDetailModal';
import { formatCurrency, formatDate, cn } from '@/src/shared/utils';
import { Shipment } from '@/types/admin';
import { useToast } from '@/src/shared/components/Toast';
import { DateRangePicker } from '@/src/shared/components/DateRangePicker';

export default function ShipmentsPage() {
    const [search, setSearch] = useState('');
    const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
    const [filters, setFilters] = useState({
        status: 'all',
        courier: 'all',
        paymentMode: 'all'
    });
    const { addToast } = useToast();

    const filteredData = useMemo(() => {
        return MOCK_SHIPMENTS.filter(item => {
            const matchesSearch =
                item.awb.toLowerCase().includes(search.toLowerCase()) ||
                item.customer.name.toLowerCase().includes(search.toLowerCase()) ||
                item.orderNumber.toLowerCase().includes(search.toLowerCase());

            const matchesStatus = filters.status === 'all' || item.status === filters.status;
            const matchesCourier = filters.courier === 'all' || item.courier === filters.courier;
            const matchesPayment = filters.paymentMode === 'all' || item.paymentMode === filters.paymentMode;

            return matchesSearch && matchesStatus && matchesCourier && matchesPayment;
        });
    }, [search, filters]);

    const columns: {
        header: string;
        accessorKey: keyof Shipment | string;
        cell?: (row: Shipment) => React.ReactNode;
        width?: string;
    }[] = [
            {
                header: 'AWB / Order',
                accessorKey: 'awb',
                width: 'w-48',
                cell: (row: Shipment) => (
                    <div>
                        <div className="font-medium text-[var(--text-primary)]">{row.awb}</div>
                        <div className="text-xs text-[var(--text-muted)]">{row.orderNumber}</div>
                    </div>
                )
            },
            {
                header: 'Customer',
                accessorKey: 'customer',
                cell: (row: Shipment) => (
                    <div>
                        <div className="font-medium text-[var(--text-primary)]">{row.customer.name}</div>
                        <div className="text-xs text-[var(--text-muted)]">{row.customer.phone}</div>
                    </div>
                )
            },
            {
                header: 'Origin / Dest',
                accessorKey: 'origin',
                cell: (row: Shipment) => (
                    <div className="max-w-[150px]">
                        <div className="text-xs text-[var(--text-muted)] truncate" title={row.origin.city}>{row.origin.city} →</div>
                        <div className="font-medium text-[var(--text-primary)] truncate" title={row.destination.city}>{row.destination.city}</div>
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
                            className="w-6 h-6 object-contain"
                            alt={row.courier}
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + row.courier + '&background=random&color=fff&size=24';
                            }}
                        />
                        <span className="font-medium text-gray-700">{row.courier}</span>
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
                        <div className="font-medium text-[var(--text-primary)]">{formatCurrency(row.codAmount)}</div>
                        <Badge variant="secondary" className="text-[10px] py-0 h-4">{row.paymentMode.toUpperCase()}</Badge>
                    </div>
                )
            },
            {
                header: 'Actions',
                accessorKey: 'id',
                width: 'w-20',
                cell: (row: Shipment) => (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-blue-600"
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedShipment(row);
                            }}
                        >
                            <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-[var(--text-primary)]"
                            onClick={(e) => {
                                e.stopPropagation();
                                addToast('Generating label...', 'info');
                            }}
                        >
                            <FileText className="h-4 w-4" />
                        </Button>
                    </div>
                )
            }
        ];

    const filterOptions = [
        {
            label: 'Status',
            value: 'status',
            options: [
                { label: 'All Statuses', value: 'all' },
                { label: 'Delivered', value: 'delivered' },
                { label: 'In Transit', value: 'in-transit' },
                { label: 'Pending', value: 'pending' },
                { label: 'NDR', value: 'ndr' },
                { label: 'RTO', value: 'rto' },
            ]
        },
        {
            label: 'Courier',
            value: 'courier',
            options: [
                { label: 'All Couriers', value: 'all' },
                { label: 'Delhivery', value: 'Delhivery' },
                { label: 'Xpressbees', value: 'Xpressbees' },
                { label: 'DTDC', value: 'DTDC' },
                { label: 'Bluedart', value: 'Bluedart' },
            ]

        },
        {
            label: 'Payment',
            value: 'paymentMode',
            options: [
                { label: 'All Modes', value: 'all' },
                { label: 'COD', value: 'cod' },
                { label: 'Prepaid', value: 'prepaid' },
            ]

        }
    ];

    // Status grid configuration
    const statusGrid = [
        { id: 'all', label: 'Total', icon: Package, color: 'bg-[#2525FF]/10', textColor: 'text-[#2525FF]' },
        { id: 'pending', label: 'Pending', icon: Clock, color: 'bg-amber-100', textColor: 'text-amber-600' },
        { id: 'in-transit', label: 'In Transit', icon: Truck, color: 'bg-cyan-100', textColor: 'text-cyan-600' },
        { id: 'delivered', label: 'Delivered', icon: CheckCircle, color: 'bg-emerald-100', textColor: 'text-emerald-600' },
        { id: 'ndr', label: 'NDR', icon: AlertTriangle, color: 'bg-orange-100', textColor: 'text-orange-600' },
        { id: 'rto', label: 'RTO', icon: RotateCcw, color: 'bg-rose-100', textColor: 'text-rose-600' },
    ];

    const getStatusCount = (status: string) => {
        if (status === 'all') return MOCK_SHIPMENTS.length;
        return MOCK_SHIPMENTS.filter(s => s.status === status).length;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Shipment Detail Modal */}
            <ShipmentDetailModal
                isOpen={!!selectedShipment}
                onClose={() => setSelectedShipment(null)}
                shipment={selectedShipment}
            />

            {/* Header with Date Range Picker */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Shipments</h2>
                <div className="flex items-center gap-3">
                    <DateRangePicker />
                    <Button onClick={() => addToast('Bulk shipment feature coming soon!', 'info')}>
                        + Create Bulk Shipment
                    </Button>
                </div>
            </div>

            {/* Status Grid Navigation */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {statusGrid.map((status) => {
                    const count = getStatusCount(status.id);
                    const isActive = filters.status === status.id;
                    return (
                        <button
                            key={status.id}
                            onClick={() => setFilters(prev => ({ ...prev, status: status.id }))}
                            className={cn(
                                "relative p-4 rounded-xl border transition-all",
                                isActive
                                    ? "border-[var(--primary-blue)] ring-2 ring-[var(--primary-blue)]/20 bg-[var(--bg-primary)]"
                                    : "border-[var(--border-default)] bg-[var(--bg-primary)] hover:border-[var(--border-strong)]"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "flex items-center justify-center h-10 w-10 rounded-lg",
                                    status.color
                                )}>
                                    <status.icon className={cn("h-5 w-5", status.textColor)} />
                                </div>
                                <div className="text-left">
                                    <p className="text-2xl font-bold text-[var(--text-primary)]">{count}</p>
                                    <p className="text-xs text-[var(--text-muted)]">{status.label}</p>
                                </div>
                            </div>
                            {isActive && (
                                <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#2525FF]" />
                            )}
                        </button>
                    );
                })}
            </div>

            <Card>
                <CardHeader className="pb-4">
                    <div className="relative">
                        <Input
                            placeholder="Search by AWB, Order ID, or Customer"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            icon={<Search className="h-4 w-4" />}
                            className="max-w-md"
                        />
                    </div>
                    <FilterBar
                        filters={filterOptions}
                        activeFilters={filters}
                        onFilterChange={(key, val) => setFilters(prev => ({ ...prev, [key]: val }))}
                        onClearFilters={() => setFilters({ status: 'all', courier: 'all', paymentMode: 'all' })}
                    />
                </CardHeader>
                <CardContent>
                    <DataTable
                        columns={columns}
                        data={filteredData}
                        onRowClick={(row) => setSelectedShipment(row)}
                    />
                </CardContent>
            </Card>
        </div>
    );
}

