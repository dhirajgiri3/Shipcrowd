'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/src/components/ui/core/Button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/src/components/ui/core/Card';
import { Input } from '@/src/components/ui/core/Input';
import { Label } from '@/src/components/ui/core/Label';
import { Badge } from '@/src/components/ui/core/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/core/Tabs';
import {
    useCourier,
    useUpdateCourier,
    useToggleCourierStatus,
    useTestCourierIntegration,
} from '@/src/core/api/hooks/logistics/useCouriers';
import type { UpdateCourierRequest } from '@/src/types/api/logistics';
import {
    ChevronLeft,
    Edit,
    Save,
    X,
    Truck,
    Activity,
    CheckCircle2,
    XCircle,
    AlertCircle,
    TestTube,
} from 'lucide-react';
import Link from 'next/link';
import { Loader } from '@/src/components/ui';

export default function CourierDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<UpdateCourierRequest>({});

    const { data: courier, isLoading } = useCourier(params.id);
    const updateCourier = useUpdateCourier();
    const toggleStatus = useToggleCourierStatus();
    const testIntegration = useTestCourierIntegration();

    const handleEdit = () => {
        if (courier) {
            setEditForm({
                name: courier.name,
                apiEndpoint: courier.apiEndpoint,
                isActive: courier.isActive,
            });
            setIsEditing(true);
        }
    };

    const handleSave = async () => {
        try {
            await updateCourier.mutateAsync({ id: params.id, data: editForm });
            setIsEditing(false);
        } catch (error) {
            // Error handled by mutation
        }
    };

    const handleToggleStatus = async () => {
        try {
            await toggleStatus.mutateAsync(params.id);
        } catch (error) {
            // Error handled by mutation
        }
    };

    const handleTestIntegration = async () => {
        try {
            await testIntegration.mutateAsync(params.id);
        } catch (error) {
            // Error handled by mutation
        }
    };

    if (isLoading) {
        return <Loader variant="spinner" size="lg" message="Loading courier details..." centered />;
    }

    if (!courier) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <p className="text-muted-foreground mb-4">Courier not found</p>
                    <Button onClick={() => router.push('/admin/couriers')}>
                        Back to Couriers
                    </Button>
                </div>
            </div>
        );
    }

    const getIntegrationStatusBadge = (status: string) => {
        const config = {
            HEALTHY: {
                variant: 'success' as const,
                icon: CheckCircle2,
                text: 'Healthy',
            },
            WARNING: {
                variant: 'warning' as const,
                icon: AlertCircle,
                text: 'Warning',
            },
            ERROR: {
                variant: 'error' as const,
                icon: XCircle,
                text: 'Error',
            },
        };
        const { variant, icon: Icon, text } = config[status as keyof typeof config] || config.ERROR;
        return (
            <Badge variant={variant} className="flex items-center gap-1">
                <Icon className="h-3 w-3" />
                {text}
            </Badge>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push('/admin/couriers')}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            {courier.name}
                            <Badge variant={courier.isActive ? 'success' : 'outline'}>
                                {courier.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            {getIntegrationStatusBadge(courier.integrationStatus)}
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Code: <span className="font-mono">{courier.code}</span>
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {!isEditing ? (
                        <>
                            <Button variant="outline" onClick={handleTestIntegration}>
                                <TestTube className="h-4 w-4 mr-2" />
                                Test Connection
                            </Button>
                            <Button
                                variant={courier.isActive ? 'danger' : 'primary'}
                                onClick={handleToggleStatus}
                            >
                                {courier.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button variant="outline" onClick={handleEdit}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => setIsEditing(false)}>
                                <X className="h-4 w-4 mr-2" />
                                Cancel
                            </Button>
                            <Button onClick={handleSave}>
                                <Save className="h-4 w-4 mr-2" />
                                Save Changes
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>Active Shipments</CardDescription>
                        <CardTitle className="text-3xl">
                            {courier.activeShipments.toLocaleString()}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>SLA (Today)</CardDescription>
                        <CardTitle className="text-3xl">
                            {courier.slaCompliance.today}%
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>SLA (Week)</CardDescription>
                        <CardTitle className="text-3xl">
                            {courier.slaCompliance.week}%
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>SLA (Month)</CardDescription>
                        <CardTitle className="text-3xl">
                            {courier.slaCompliance.month}%
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                    <TabsTrigger value="services">Services</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Courier Details</CardTitle>
                            <CardDescription>Basic information and settings</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {isEditing ? (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Courier Name</Label>
                                        <Input
                                            id="name"
                                            value={editForm.name || ''}
                                            onChange={(e) =>
                                                setEditForm({ ...editForm, name: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="apiEndpoint">API Endpoint</Label>
                                        <Input
                                            id="apiEndpoint"
                                            value={editForm.apiEndpoint || ''}
                                            onChange={(e) =>
                                                setEditForm({
                                                    ...editForm,
                                                    apiEndpoint: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="apiKey">API Key (Optional)</Label>
                                        <Input
                                            id="apiKey"
                                            type="password"
                                            placeholder="Enter new API key to update"
                                            value={editForm.apiKey || ''}
                                            onChange={(e) =>
                                                setEditForm({ ...editForm, apiKey: e.target.value })
                                            }
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Leave blank to keep existing key
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <dt className="text-sm font-medium text-muted-foreground">
                                            Courier Code
                                        </dt>
                                        <dd className="mt-1 font-mono">{courier.code}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-muted-foreground">
                                            API Endpoint
                                        </dt>
                                        <dd className="mt-1 font-mono text-sm break-all">
                                            {courier.apiEndpoint}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-muted-foreground">
                                            Created At
                                        </dt>
                                        <dd className="mt-1">
                                            {new Date(courier.createdAt).toLocaleDateString('en-IN', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                            })}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-muted-foreground">
                                            Last Updated
                                        </dt>
                                        <dd className="mt-1">
                                            {new Date(courier.updatedAt).toLocaleDateString('en-IN', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                            })}
                                        </dd>
                                    </div>
                                </dl>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Performance Tab */}
                <TabsContent value="performance">
                    <Card>
                        <CardHeader>
                            <CardTitle>Performance Analytics</CardTitle>
                            <CardDescription>
                                View detailed performance metrics{' '}
                                <Link
                                    href={`/admin/couriers/${params.id}/performance`}
                                    className="text-primary hover:underline"
                                >
                                    View Full Report →
                                </Link>
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </TabsContent>

                {/* Services Tab */}
                <TabsContent value="services">
                    <Card>
                        <CardHeader>
                            <CardTitle>Available Services</CardTitle>
                            <CardDescription>
                                Services offered by {courier.name}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {courier.services.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {courier.services.map((service) => (
                                        <div
                                            key={service._id}
                                            className="border rounded-lg p-4 space-y-2"
                                        >
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-medium">{service.name}</h4>
                                                <Badge
                                                    variant={
                                                        service.isActive ? 'success' : 'outline'
                                                    }
                                                >
                                                    {service.isActive ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                Code: <span className="font-mono">{service.code}</span>
                                            </p>
                                            <p className="text-sm">
                                                Type: <span className="font-medium">{service.type}</span>
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-center py-8">
                                    No services configured
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
