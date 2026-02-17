"use client";

import Link from 'next/link';
import { Button } from '@/src/components/ui/core/Button';
import { useCourierServices } from '@/src/core/api/hooks/admin';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/core/Tabs';
import { CreditCard, FlaskConical, Settings2 } from 'lucide-react';
import { RateCardsTab } from '../../couriers/services/components/RateCardsTab';

export function RateCardsClient({ autoStartCreate = false }: { autoStartCreate?: boolean }) {
    const { data: services = [] } = useCourierServices();

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <CreditCard className="h-6 w-6 text-[var(--primary-blue)]" />
                        Rate Cards
                    </h1>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                        Manage service-level pricing cards for cost and sell flows.
                    </p>
                </div>
                <Link href="/admin/pricing-studio">
                    <Button variant="outline">Open Pricing Studio</Button>
                </Link>
            </div>

            <Tabs defaultValue="service" className="space-y-4">
                <TabsList className="h-auto p-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                    <TabsTrigger value="service" className="gap-2">
                        <Settings2 className="h-4 w-4" />
                        Service Rate Cards
                    </TabsTrigger>
                    <TabsTrigger value="simulator" className="gap-2">
                        <FlaskConical className="h-4 w-4" />
                        Simulator
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="service" className="mt-0">
                    <RateCardsTab services={services} autoStartCreate={autoStartCreate} />
                </TabsContent>

                <TabsContent value="simulator" className="mt-0">
                    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4">
                        <p className="text-sm text-[var(--text-secondary)] mb-3">
                            Open Pricing Studio in a full workspace for scenario simulation and margin analysis.
                        </p>
                        <Link href="/admin/pricing-studio">
                            <Button>Open Pricing Studio</Button>
                        </Link>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
