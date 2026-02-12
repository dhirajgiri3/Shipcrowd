"use client";

import Link from 'next/link';
import { Button } from '@/src/components/ui/core/Button';
import { useCourierServices } from '@/src/core/api/hooks/admin';
import { CreditCard } from 'lucide-react';
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

            <RateCardsTab services={services} autoStartCreate={autoStartCreate} />
        </div>
    );
}
