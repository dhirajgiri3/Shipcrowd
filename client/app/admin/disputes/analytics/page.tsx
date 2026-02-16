/**
 * Dispute Analytics Page
 * 
 * Admin-only analytics dashboard for weight disputes
 * 
 * Route: /admin/disputes/analytics
 */

'use client';

import React from 'react';
import { DisputeAnalytics } from '@/src/features/disputes/components/DisputeAnalytics';

export default function DisputeAnalyticsPage() {
    return (
        <div className="min-h-screen bg-[var(--bg-secondary)] p-6 md:p-8 max-w-[1600px] mx-auto pb-20 animate-in fade-in duration-500">
            <DisputeAnalytics />
        </div>
    );
}
