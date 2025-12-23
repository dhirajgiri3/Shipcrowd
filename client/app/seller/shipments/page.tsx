"use client";
export const dynamic = "force-dynamic";

import { useState } from 'react';
import { useShipments } from '@/src/core/api/hooks/useShipments';
import { DataTable } from '@/src/shared/components/DataTable';
import { Card, CardHeader, CardContent } from '@/src/shared/components/card';
import { Input } from '@/src/shared/components/Input';
import { Search, Eye, FileText, Plus, Upload, RefreshCw } from 'lucide-react';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Badge } from '@/src/shared/components/badge';
import { getCourierLogo } from '@/lib/constants';
import { FilterBar } from '@/components/admin/FilterBar';
import { Button } from '@/src/shared/components/button';
import { ShipmentDetailModal } from '@/components/admin/ShipmentDetailModal';
import { CreateShipmentModal } from '@/components/admin/CreateShipmentModal';
import { formatCurrency, formatDate } from '@/src/shared/utils';
import { useToast } from '@/src/shared/components/Toast';

// Map API shipment to UI Shipment type for modal compatibility
const mapApiShipmentToUI = (apiShipment: any) => ({
    id: apiShipment._id,
    awb: apiShipment.trackingNumber,
    orderNumber: apiShipment.orderId?.orderNumber || 'N/A',
    customer: {
        name: apiShipment.deliveryDetails?.recipientName || 'N/A',
        phone: apiShipment.deliveryDetails?.recipientPhone || 'N/A',
    },
    origin: {
        city: apiShipment.pickupDetails?.warehouseId?.address?.city || 'Origin',
    },
    destination: {
        city: apiShipment.deliveryDetails?.address?.city || 'Destination',
    },
    courier: apiShipment.carrier,
    status: apiShipment.currentStatus,
    codAmount: apiShipment.paymentDetails?.codAmount || 0,
    paymentMode: apiShipment.paymentDetails?.type || 'prepaid',
});

export default function ShipmentsPage() {
    const [search, setSearch] = useState('');
    const [selectedShipment, setSelectedShipment] = useState<any>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({
        status: 'all',
        courier: 'all',
        paymentMode: 'all'
    });
    const { addToast } = useToast();

    // Use the real API hook
    const {
        data: shipmentsData,
        isLoading,
        error,
        refetch
    } = useShipments({
        page,
        limit: 20,
        status: filters.status !== 'all' ? filters.status : undefined,
        carrier: filters.courier !== 'all' ? filters.courier : undefined,
        search: search || undefined,
    });

    const shipments = shipmentsData?.shipments || [];
    const pagination = shipmentsData?.pagination;

    // Map to UI format for table
    const displayShipments = shipments.map(mapApiShipmentToUI);

    const columns: {
        header: string;
        accessorKey: string;
        cell?: (row: any) => React.ReactNode;
        width?: string;
    }[] = [
            {
                header: 'AWB / Order',
                accessorKey: 'awb',
                width: 'w-48',
                cell: (row: any) => (
                    <div>
                        <div className="font-medium text-[var(--text-primary)]">{row.awb}</div>
                        <div className="text-xs text-[var(--text-muted)]">{row.orderNumber}</div>
                    </div>
                )
            },
            {
                header: 'Customer',
                accessorKey: 'customer',
                cell: (row: any) => (
                    <div>
                        <div className="font-medium text-[var(--text-primary)]">{row.customer.name}</div>
                        <div className="text-xs text-[var(--text-muted)]">{row.customer.phone}</div>
                    </div>
                )
            },
            {
                header: 'Origin / Dest',
                accessorKey: 'origin',
                cell: (row: any) => (
                    <div className="max-w-[150px]">
                        <div className="text-xs text-[var(--text-muted)] truncate" title={row.origin.city}>{row.origin.city} →</div>
                        <div className="font-medium text-[var(--text-primary)] truncate" title={row.destination.city}>{row.destination.city}</div>
                    </div>
                )
            },
            {
                header: 'Courier',
                accessorKey: 'courier',
                cell: (row: any) => (
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
                cell: (row: any) => <StatusBadge status={row.status} />
            },
            {
                header: 'Amount',
                accessorKey: 'codAmount',
                cell: (row: any) => (
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
                cell: (row: any) => (
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
                                // TODO: Implement PDF label generation
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
                { label: 'Created', value: 'created' },
                { label: 'Picked', value: 'picked' },
                { label: 'In Transit', value: 'in_transit' },
                { label: 'Out for Delivery', value: 'out_for_delivery' },
                { label: 'Delivered', value: 'delivered' },
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

    // Loading state
    if (isLoading && !shipments.length) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Shipments</h2>
                </div>
                <Card>
                    <CardContent className="p-8">
                        <div className="flex flex-col items-center justify-center py-12">
                            <RefreshCw className="h-8 w-8 animate-spin text-[var(--primary-blue)] mb-4" />
                            <p className="text-[var(--text-muted)]">Loading shipments...</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Shipments</h2>
                </div>
                <Card>
                    <CardContent className="p-8">
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="text-red-500 mb-4">
                                <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className="text-[var(--text-primary)] font-semibold mb-2">Failed to load shipments</p>
                            <p className="text-[var(--text-muted)] text-sm mb-4">{error.message || 'An error occurred'}</p>
                            <Button onClick={() => refetch()}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Retry
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

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
                onSuccess={() => {
                    setIsCreateModalOpen(false);
                    refetch();
                }}
            />

            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Shipments</h2>
                    {pagination && (
                        <p className="text-sm text-[var(--text-muted)] mt-1">
                            Showing {shipments.length} of {pagination.total} shipments
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => refetch()}
                        disabled={isLoading}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
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
                        onFilterChange={(key, val) => {
                            setFilters(prev => ({ ...prev, [key]: val }));
                            setPage(1); // Reset to page 1 when filters change
                        }}
                        onClearFilters={() => {
                            setFilters({ status: 'all', courier: 'all', paymentMode: 'all' });
                            setPage(1);
                        }}
                    />
                </CardHeader>
                <CardContent>
                    {displayShipments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <svg className="h-12 w-12 text-[var(--text-muted)] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            <p className="text-[var(--text-primary)] font-semibold mb-1">No shipments found</p>
                            <p className="text-[var(--text-muted)] text-sm">Try adjusting your filters or create a new shipment</p>
                        </div>
                    ) : (
                        <>
                            <DataTable
                                columns={columns}
                                data={displayShipments}
                                onRowClick={(row) => setSelectedShipment(row)}
                            />

                            {/* Pagination */}
                            {pagination && pagination.pages > 1 && (
                                <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border-default)]">
                                    <p className="text-sm text-[var(--text-muted)]">
                                        Page {pagination.page} of {pagination.pages}
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1 || isLoading}
                                        >
                                            Previous
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                                            disabled={page === pagination.pages || isLoading}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
