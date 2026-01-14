/**
 * NDR Analytics Page
 * 
 * Route: /seller/ndr/analytics
 */

'use client';

import React from 'react';
import { NDRAnalytics } from '@/src/features/ndr/components/NDRAnalytics';

export default function NDRAnalyticsPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-7xl mx-auto">
                <NDRAnalytics />
            </div>
        </div>
    );
}
