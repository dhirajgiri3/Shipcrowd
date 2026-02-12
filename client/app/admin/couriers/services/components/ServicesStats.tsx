"use client";

import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { CourierServiceItem } from '@/src/core/api/hooks/admin';
import { Package, CheckCircle, Truck, Zap } from 'lucide-react';

interface ServicesStatsProps {
    services: CourierServiceItem[];
}

export function ServicesStats({ services = [] }: ServicesStatsProps) {
    const totalServices = services.length;
    const activeServices = services.filter(s => s.status === 'active').length;
    const activeRate = totalServices > 0 ? Math.round((activeServices / totalServices) * 100) : 0;

    // Count providers
    const providers = new Set(services.map(s => s.provider));
    const providerCount = providers.size;

    // Count express/air services
    const fastServices = services.filter(s => s.serviceType === 'express' || s.serviceType === 'air').length;
    const fastServicesRate = totalServices > 0 ? Math.round((fastServices / totalServices) * 100) : 0;

    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
                title="Total Services"
                value={totalServices}
                icon={Package}
                variant="default"
                description="Total configured courier services"
                delay={0}
            />
            <StatsCard
                title="Active Rate"
                value={`${activeRate}%`}
                icon={CheckCircle}
                variant={activeRate > 80 ? 'success' : 'warning'}
                trend={{
                    value: activeRate,
                    label: "of services active",
                    positive: activeRate > 50
                }}
                delay={1}
            />
            <StatsCard
                title="Providers"
                value={providerCount}
                icon={Truck}
                variant="info"
                description="Integrated carrier partners"
                delay={2}
            />
            <StatsCard
                title="Express Options"
                value={fastServices}
                icon={Zap}
                variant="default"
                trend={{
                    value: fastServicesRate,
                    label: "share of total",
                    positive: true
                }}
                delay={3}
            />
        </div>
    );
}
