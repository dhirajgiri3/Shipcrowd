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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-7xl mx-auto">
                <DisputeAnalytics />
            </div>
        </div>
    );
}
