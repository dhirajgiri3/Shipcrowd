'use client';

import { Card, CardHeader, CardDescription, CardTitle } from '@/src/components/ui/core/Card';
import type { ShippingZone as Zone } from '@/src/types/api/logistics';

interface ZoneStatsCardsProps {
    data?: {
        data: Zone[];
        pagination: { total: number };
    };
}

export function ZoneStatsCards({ data }: ZoneStatsCardsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
                <CardHeader className="pb-3">
                    <CardDescription>Total Zones</CardDescription>
                    <CardTitle className="text-3xl">{data?.pagination.total || 0}</CardTitle>
                </CardHeader>
            </Card>
            <Card>
                <CardHeader className="pb-3">
                    <CardDescription>Local Zones</CardDescription>
                    <CardTitle className="text-3xl">
                        {data?.data.filter((z: Zone) => z.type === 'LOCAL').length || 0}
                    </CardTitle>
                </CardHeader>
            </Card>
            <Card>
                <CardHeader className="pb-3">
                    <CardDescription>Regional Zones</CardDescription>
                    <CardTitle className="text-3xl">
                        {data?.data.filter((z: Zone) => z.type === 'REGIONAL').length || 0}
                    </CardTitle>
                </CardHeader>
            </Card>
            <Card>
                <CardHeader className="pb-3">
                    <CardDescription>National Zones</CardDescription>
                    <CardTitle className="text-3xl">
                        {data?.data.filter((z: Zone) => z.type === 'NATIONAL').length || 0}
                    </CardTitle>
                </CardHeader>
            </Card>
        </div>
    );
}
