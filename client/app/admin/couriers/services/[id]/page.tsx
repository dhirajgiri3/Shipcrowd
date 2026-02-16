'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Edit2 } from 'lucide-react';
import { Button } from '@/src/components/ui/core/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/core/Card';
import { Badge } from '@/src/components/ui/core/Badge';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { Loader } from '@/src/components/ui';
import { EmptyState } from '@/src/components/ui/feedback/EmptyState';
import { useCourierService } from '@/src/core/api/hooks/admin/couriers/useCourierServices';

export default function CourierServiceDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const { data: service, isLoading, isError } = useCourierService(id);

    if (isLoading) {
        return <Loader variant="spinner" size="lg" message="Loading service details..." centered />;
    }

    if (isError || !service) {
        return (
            <EmptyState
                variant="error"
                title="Service not found"
                description="The courier service could not be loaded."
                action={{
                    label: 'Back to Courier Services',
                    onClick: () => window.location.assign('/admin/couriers/services'),
                    variant: 'primary',
                    icon: <ArrowLeft className="h-4 w-4" />,
                }}
                className="h-[60vh]"
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                    <Link href="/admin/couriers/services" className="inline-flex">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">{service.displayName}</h1>
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="uppercase">{service.provider}</Badge>
                        <Badge variant="secondary" className="uppercase">{service.serviceType}</Badge>
                        <Badge variant="outline" className="uppercase">{service.flowType || 'forward'}</Badge>
                        <StatusBadge domain="courier" status={service.status} size="sm" />
                    </div>
                </div>
                <Link href="/admin/couriers/services" className="inline-flex">
                    <Button>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit In Services
                    </Button>
                </Link>
            </div>

            <Card className="border-[var(--border-default)]">
                <CardHeader>
                    <CardTitle>Service Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-[var(--text-muted)]">Service Code</p>
                        <p className="font-medium">{service.serviceCode}</p>
                    </div>
                    <div>
                        <p className="text-[var(--text-muted)]">Provider Service ID</p>
                        <p className="font-medium">{service.providerServiceId || '-'}</p>
                    </div>
                    <div>
                        <p className="text-[var(--text-muted)]">Zone Support</p>
                        <p className="font-medium">{service.zoneSupport?.join(', ') || '-'}</p>
                    </div>
                    <div>
                        <p className="text-[var(--text-muted)]">SLA</p>
                        <p className="font-medium">
                            {service.sla?.eddMinDays ?? '-'} - {service.sla?.eddMaxDays ?? '-'} days
                        </p>
                    </div>
                    <div>
                        <p className="text-[var(--text-muted)]">Min Weight</p>
                        <p className="font-medium">{service.constraints?.minWeightKg ?? '-'} kg</p>
                    </div>
                    <div>
                        <p className="text-[var(--text-muted)]">Max Weight</p>
                        <p className="font-medium">{service.constraints?.maxWeightKg ?? '-'} kg</p>
                    </div>
                    <div>
                        <p className="text-[var(--text-muted)]">Max COD Value</p>
                        <p className="font-medium">
                            {service.constraints?.maxCodValue ? `₹${service.constraints.maxCodValue}` : '-'}
                        </p>
                    </div>
                    <div>
                        <p className="text-[var(--text-muted)]">Max Prepaid Value</p>
                        <p className="font-medium">
                            {service.constraints?.maxPrepaidValue ? `₹${service.constraints.maxPrepaidValue}` : '-'}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
