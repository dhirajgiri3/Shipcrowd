'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/core/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/core/Card';
import { Input } from '@/components/ui/core/Input';
import { Badge } from '@/components/ui/core/Badge';
import { ChevronLeft, Search, Download, Package } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/src/core/api/client';

interface Shipment {
    _id: string;
    awb: string;
    status: string;
    recipientName: string;
    destination: string;
    weight: number;
    courierPartner: string;
    createdAt: string;
    deliveredAt?: string;
}

export default function SellerShipmentsPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(1);

    const { data, isLoading } = useQuery({
        queryKey: ['admin', 'sellers', params.id, 'shipments', { search, status: statusFilter, page }],
        queryFn: async () => {
            const queryParams = new URLSearchParams();
            if (search) queryParams.append('search', search);
            if (statusFilter !== 'all') queryParams.append('status', statusFilter);
            queryParams.append('page', String(page));
            queryParams.append('limit', '50');

            const response = await apiClient.get(
                `/admin/sellers/${params.id}/shipments?${queryParams.toString()}`
            );
            return response.data;
        },
    });

    const handleExport = async () => {
        // Export CSV functionality
        window.open(
            `/api/admin/sellers/${params.id}/shipments/export?status=${statusFilter}`,
            '_blank'
        );
    };

    const statusColors: Record<string, string> = {
        PENDING: 'bg-yellow-100 text-yellow-800',
        IN_TRANSIT: 'bg-blue-100 text-blue-800',
        OUT_FOR_DELIVERY: 'bg-purple-100 text-purple-800',
        DELIVERED: 'bg-green-100 text-green-800',
        RTO: 'bg-red-100 text-red-800',
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push(`/admin/sellers/${params.id}`)}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">Seller Shipments</h1>
                        <p className="text-muted-foreground mt-1">All shipments for this seller</p>
                    </div>
                </div>
                <Button variant="outline" onClick={handleExport}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by AWB or recipient name..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="w-full md:w-[200px]">
                            <select
                                className="w-full h-10 px-3 py-2 text-sm border rounded-md"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="all">All Statuses</option>
                                <option value="PENDING">Pending</option>
                                <option value="IN_TRANSIT">In Transit</option>
                                <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                                <option value="DELIVERED">Delivered</option>
                                <option value="RTO">RTO</option>
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Shipments Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Shipments</CardTitle>
                    <CardDescription>
                        {data?.pagination?.total || 0} total shipments
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-12 text-muted-foreground">Loading shipments...</div>
                    ) : !data?.data?.length ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>No shipments found</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="border-b">
                                        <tr className="text-left text-sm text-muted-foreground">
                                            <th className="pb-3 font-medium">AWB</th>
                                            <th className="pb-3 font-medium">Recipient</th>
                                            <th className="pb-3 font-medium">Destination</th>
                                            <th className="pb-3 font-medium">Weight</th>
                                            <th className="pb-3 font-medium">Courier</th>
                                            <th className="pb-3 font-medium">Status</th>
                                            <th className="pb-3 font-medium">Created</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {data.data.map((shipment: Shipment) => (
                                            <tr key={shipment._id} className="text-sm">
                                                <td className="py-4 font-mono">{shipment.awb}</td>
                                                <td className="py-4">{shipment.recipientName}</td>
                                                <td className="py-4">{shipment.destination}</td>
                                                <td className="py-4">{shipment.weight} kg</td>
                                                <td className="py-4">{shipment.courierPartner}</td>
                                                <td className="py-4">
                                                    <Badge className={statusColors[shipment.status] || ''}>
                                                        {shipment.status.replace('_', ' ')}
                                                    </Badge>
                                                </td>
                                                <td className="py-4">
                                                    {new Date(shipment.createdAt).toLocaleDateString('en-IN')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {data.pagination.totalPages > 1 && (
                                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                                    <p className="text-sm text-muted-foreground">
                                        Page {data.pagination.page} of {data.pagination.totalPages}
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={page === 1}
                                            onClick={() => setPage((p) => p - 1)}
                                        >
                                            Previous
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={page === data.pagination.totalPages}
                                            onClick={() => setPage((p) => p + 1)}
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
