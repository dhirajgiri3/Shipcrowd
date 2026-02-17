"use client";

import { ShieldCheck } from 'lucide-react';
import { PoliciesTab } from '../../couriers/services/components/PoliciesTab';

export function CourierAssignmentClient() {
    return (
        <div className="space-y-6 pb-20">
            <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <ShieldCheck className="h-6 w-6 text-[var(--primary-blue)]" />
                    Courier Assignment
                </h1>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                    Manage seller-level provider and service assignment rules.
                </p>
            </div>
            <PoliciesTab />
        </div>
    );
}
