'use client';

import React from 'react';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { Activity, Package, Clock, Wifi } from 'lucide-react';
import { formatDate } from '@/src/lib/utils';
import type { EcommerceIntegration } from '@/src/types/api/integrations';
import type { PlatformMeta } from './platformConfig';

interface IntegrationStatsGridProps {
    store: EcommerceIntegration;
    platformMeta: PlatformMeta;
}

export function IntegrationStatsGrid({ store, platformMeta }: IntegrationStatsGridProps) {
    const syncRate = store.stats?.syncSuccessRate ?? 100;
    const syncVariant = syncRate > 90 ? 'success' : 'warning';

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
                title="Sync Health"
                value={`${syncRate}%`}
                icon={Activity}
                variant={syncVariant}
                description="Success rate (24h)"
                delay={0}
            />
            <StatsCard
                title="Total Orders"
                value={store.stats?.totalOrdersSynced ?? 0}
                icon={Package}
                iconColor="text-[var(--primary-blue)] bg-[var(--primary-blue-soft)]"
                description="Synced to Shipcrowd"
                delay={1}
            />
            <StatsCard
                title="Last Sync"
                value={store.stats?.lastSyncAt ? formatDate(store.stats.lastSyncAt) : 'Never'}
                icon={Clock}
                iconColor="text-[var(--primary-blue)] bg-[var(--primary-blue-soft)]"
                description="Latest synchronization"
                delay={2}
            />
            <StatsCard
                title="Connection"
                value={store.isActive ? 'Connected' : 'Inactive'}
                icon={Wifi}
                variant={store.isActive ? 'success' : 'default'}
                iconColor={store.isActive ? undefined : 'text-[var(--text-muted)] bg-[var(--bg-tertiary)]'}
                description="Integration status"
                delay={3}
                isActive={store.isActive}
            />
        </div>
    );
}
