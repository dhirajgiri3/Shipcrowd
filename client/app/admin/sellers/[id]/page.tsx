'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/src/components/ui/core/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/core/Card';
import { Badge } from '@/src/components/ui/core/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/core/Tabs';
import {
    ChevronLeft,
    Building2,
    Package,
    DollarSign,
    UserCheck,
    UserX,
    Mail,
    Phone,
    MapPin,
    Calendar,
    TrendingUp,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/src/core/api/config/client';
import { toast } from 'sonner';

interface SellerDetail {
    _id: string;
    companyName: string;
    email: string;
    phone: string;
    address: {
        line1: string;
        city: string;
        state: string;
        country: string;
        pincode: string;
    };
    kycStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
    isActive: boolean;
    walletBalance: number;
    assignedRateCard?: string;
    stats: {
        totalShipments: number;
        totalRevenue: number;
        activeOrders: number;
        completedOrders: number;
    };
    createdAt: string;
    lastActiveAt: string;
}

export default function SellerDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('overview');

    const { data: seller, isLoading } = useQuery({
        queryKey: ['admin', 'sellers', params.id],
        queryFn: async () => {
            const response = await apiClient.get<{ success: boolean; data: SellerDetail }>(
                `/admin/sellers/${params.id}`
            );
            return response.data.data;
        },
    });

    const handleToggleStatus = async () => {
        try {
            await apiClient.post(`/admin/sellers/${params.id}/toggle-status`);
            toast.success(`Seller ${seller?.isActive ? 'deactivated' : 'activated'} successfully`);
            // Refetch data
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to toggle status');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">Loading seller details...</p>
            </div>
        );
    }

    if (!seller) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <p className="text-muted-foreground mb-4">Seller not found</p>
                    <Button onClick={() => router.push('/admin/sellers')}>Back to Sellers</Button>
                </div>
            </div>
        );
    }

    const getKycBadge = (status: string) => {
        const variants = {
            PENDING: 'outline' as const,
            VERIFIED: 'default' as const,
            REJECTED: 'destructive' as const,
        };
        return <Badge variant={variants[status as keyof typeof variants]}>{status}</Badge>;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/admin/sellers')}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            {seller.companyName}
                            <Badge variant={seller.isActive ? 'default' : 'outline'}>
                                {seller.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                        </h1>
                        <p className="text-muted-foreground mt-1">Seller Details</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant={seller.isActive ? 'danger' : 'primary'} onClick={handleToggleStatus}>
                        {seller.isActive ? (
                            <>
                                <UserX className="h-4 w-4 mr-2" />
                                Suspend
                            </>
                        ) : (
                            <>
                                <UserCheck className="h-4 w-4 mr-2" />
                                Activate
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>Total Shipments</CardDescription>
                        <CardTitle className="text-3xl flex items-center gap-2">
                            <Package className="h-6 w-6 text-muted-foreground" />
                            {seller.stats.totalShipments.toLocaleString()}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>Total Revenue</CardDescription>
                        <CardTitle className="text-3xl flex items-center gap-2">
                            <TrendingUp className="h-6 w-6 text-muted-foreground" />
                            ₹{seller.stats.totalRevenue.toLocaleString()}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>Wallet Balance</CardDescription>
                        <CardTitle className="text-3xl flex items-center gap-2">
                            <DollarSign className="h-6 w-6 text-muted-foreground" />
                            ₹{seller.walletBalance.toLocaleString()}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>Active Orders</CardDescription>
                        <CardTitle className="text-3xl">{seller.stats.activeOrders}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="shipments">Shipments</TabsTrigger>
                    <TabsTrigger value="transactions">Transactions</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Building2 className="h-5 w-5" />
                                    Company Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <dl className="space-y-3">
                                    <div>
                                        <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                            <Mail className="h-4 w-4" />
                                            Email
                                        </dt>
                                        <dd className="mt-1">{seller.email}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                            <Phone className="h-4 w-4" />
                                            Phone
                                        </dt>
                                        <dd className="mt-1">{seller.phone}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                            <MapPin className="h-4 w-4" />
                                            Address
                                        </dt>
                                        <dd className="mt-1">
                                            {seller.address.line1}, {seller.address.city}, {seller.address.state},{' '}
                                            {seller.address.pincode}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-muted-foreground">KYC Status</dt>
                                        <dd className="mt-1">{getKycBadge(seller.kycStatus)}</dd>
                                    </div>
                                </dl>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Account Details</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <dl className="space-y-3">
                                    <div>
                                        <dt className="text-sm font-medium text-muted-foreground">Seller ID</dt>
                                        <dd className="mt-1 font-mono text-sm">{seller._id}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-muted-foreground">Assigned Rate Card</dt>
                                        <dd className="mt-1">{seller.assignedRateCard || 'Default'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            Member Since
                                        </dt>
                                        <dd className="mt-1">
                                            {new Date(seller.createdAt).toLocaleDateString('en-IN', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                            })}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-muted-foreground">Last Active</dt>
                                        <dd className="mt-1">
                                            {new Date(seller.lastActiveAt).toLocaleDateString('en-IN', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                            })}
                                        </dd>
                                    </div>
                                </dl>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Shipments Tab */}
                <TabsContent value="shipments">
                    <Card>
                        <CardHeader>
                            <CardTitle>Seller Shipments</CardTitle>
                            <CardDescription>View all shipments for this seller</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Link href={`/admin/sellers/${params.id}/shipments`}>
                                <Button variant="outline">View Full Shipment History →</Button>
                            </Link>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Transactions Tab */}
                <TabsContent value="transactions">
                    <Card>
                        <CardHeader>
                            <CardTitle>Financial Transactions</CardTitle>
                            <CardDescription>View all transactions for this seller</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Link href={`/admin/sellers/${params.id}/transactions`}>
                                <Button variant="outline">View Full Transaction History →</Button>
                            </Link>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
