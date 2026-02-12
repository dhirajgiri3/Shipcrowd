'use client';

import { use, useState } from 'react';
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
} from '@/src/core/api/hooks/admin/couriers/useCouriers';
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
    Settings,
} from 'lucide-react';
import Link from 'next/link';
import { Loader, StatusBadge } from '@/src/components/ui';
import { EmptyState } from '@/src/components/ui/feedback/EmptyState';
import { CourierCredentialsModal } from '../components/CourierCredentialsModal';

export default function CourierDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
    const [editForm, setEditForm] = useState<UpdateCourierRequest>({});

    const { data: courier, isLoading } = useCourier(id);
    const updateCourier = useUpdateCourier();
    const toggleStatus = useToggleCourierStatus();

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
            await updateCourier.mutateAsync({ id, data: editForm });
            setIsEditing(false);
        } catch (error) {
            // Error handled by mutation
        }
    };

    const handleToggleStatus = async () => {
        try {
            await toggleStatus.mutateAsync(id);
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

    const getOperationalStatusBadge = (status: string) => {
        const config = {
            OPERATIONAL: { variant: 'success' as const, icon: CheckCircle2, text: 'Operational' },
            DEGRADED: { variant: 'warning' as const, icon: AlertCircle, text: 'Degraded' },
            DOWN: { variant: 'error' as const, icon: XCircle, text: 'Down' },
            UNKNOWN: { variant: 'secondary' as const, icon: AlertCircle, text: 'Unknown' },
        };
        const { variant, icon: Icon, text } =
            config[status as keyof typeof config] || config.UNKNOWN;
        return (
            <Badge variant={variant} className="flex items-center gap-1">
                <Icon className="h-3 w-3" />
                {text}
            </Badge>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
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
                            <StatusBadge
                                domain="courier"
                                status={courier.isActive ? 'active' : 'inactive'}
                            />
                            {getOperationalStatusBadge(courier.operationalStatus)}
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Code: <span className="font-mono">{courier.code}</span>
                        </p>
                        {courier.operationalStatus === 'DEGRADED' && (
                            <p className="text-xs text-amber-500 mt-1">
                                Courier is enabled but not fully configured. Add live credentials in Configure API.
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsSetupModalOpen(true)}>
                        <Settings className="h-4 w-4 mr-2" />
                        Configure API
                    </Button>
                    {!isEditing ? (
                        <>
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

            <CourierCredentialsModal
                isOpen={isSetupModalOpen}
                onClose={() => setIsSetupModalOpen(false)}
                courier={courier}
            />

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
                            {courier.slaCompliance.today === null ? 'N/A' : `${courier.slaCompliance.today}%`}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>SLA (Week)</CardDescription>
                        <CardTitle className="text-3xl">
                            {courier.slaCompliance.week === null ? 'N/A' : `${courier.slaCompliance.week}%`}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>SLA (Month)</CardDescription>
                        <CardTitle className="text-3xl">
                            {courier.slaCompliance.month === null ? 'N/A' : `${courier.slaCompliance.month}%`}
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
                                    <p className="text-xs text-muted-foreground">
                                        Update secure credentials from <span className="font-medium">Configure API</span>.
                                    </p>
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
                                    href={`/admin/couriers/${id}/performance`}
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
                                            className="border border-[var(--border-subtle)] rounded-lg p-4 space-y-2 bg-[var(--bg-primary)] hover:border-[var(--border-default)] transition-colors"
                                        >
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-medium text-[var(--text-primary)]">{service.name}</h4>
                                                <StatusBadge
                                                    domain="courier"
                                                    status={service.isActive ? 'active' : 'inactive'}
                                                />
                                            </div>
                                            <p className="text-sm text-[var(--text-secondary)]">
                                                Code: <span className="font-mono text-[var(--text-primary)]">{service.code}</span>
                                            </p>
                                            <p className="text-sm text-[var(--text-secondary)]">
                                                Type: <span className="font-medium text-[var(--text-primary)]">{service.type}</span>
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState
                                    variant="noData"
                                    title="No services configured"
                                    description="There are no services currently configured for this courier."
                                    compact
                                />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
