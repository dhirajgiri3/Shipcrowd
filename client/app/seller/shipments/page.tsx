"use client";

import { useMemo, useState } from 'react';
import { MOCK_SHIPMENTS } from '@/lib/mockData';
import { DataTable } from '@/components/ui/DataTable';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Search, Eye, FileText, Plus, Upload } from 'lucide-react';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Badge } from '@/components/ui/Badge';
import { getCourierLogo } from '@/lib/constants';
import { FilterBar } from '@/components/admin/FilterBar';
import { Button } from '@/components/ui/Button';
import { ShipmentDetailModal } from '@/components/admin/ShipmentDetailModal';
import { CreateShipmentModal } from '@/components/admin/CreateShipmentModal';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Shipment } from '@/types/admin';
import { useToast } from '@/components/ui/Toast';

export default function ShipmentsPage() {
    const [search, setSearch] = useState('');
    const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
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
        accessorKey: keyof Shipment | ((row: Shipment) => React.ReactNode);
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

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Shipment Detail Modal */}
            <ShipmentDetailModal
                isOpen={!!selectedShipment}
                onClose={() => setSelectedShipment(null)}
                shipment={selectedShipment}
            />

            {/* Create Shipment Modal */}
            <CreateShipmentModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />

            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Shipments</h2>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => addToast('Bulk import coming soon!', 'info')}>
                        <Upload className="h-4 w-4 mr-2" />
                        Bulk Import
                    </Button>
                    <Button onClick={() => setIsCreateModalOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Shipment
                    </Button>
                </div>
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
