'use client';

import { useState } from 'react';
import { useAnalytics } from '@/src/core/api/hooks';
import { AnalyticsSection } from '@/src/components/seller/dashboard/AnalyticsSection';
import { SpinnerLoader, Alert } from '@/src/components/ui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// Mock data for fallback
const MOCK_ANALYTICS_DATA = {
    orderTrend: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        values: [120, 145, 165, 180, 195, 210]
    },
    topCouriers: [
        { name: 'Delhivery', orders: 450, avgCost: 45 },
        { name: 'BlueDart', orders: 320, avgCost: 65 },
        { name: 'Ecom Express', orders: 280, avgCost: 40 }
    ],
    zoneDistribution: [
        { zone: 'North', percentage: 35, orders: 420 },
        { zone: 'South', percentage: 30, orders: 360 },
        { zone: 'West', percentage: 20, orders: 240 },
        { zone: 'East', percentage: 15, orders: 180 }
    ]
};

export function AnalyticsClient() {
    const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

    // Using real API with mock fallback
    const { data: analyticsData, isLoading } = useAnalytics({ period });
    const isUsingMockData = !analyticsData;

    const displayData = analyticsData || MOCK_ANALYTICS_DATA;

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header with back button */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/seller"
                            className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                                Detailed Analytics
                            </h1>
                            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                                Deep dive into your business metrics
                            </p>
                        </div>
                    </div>

                    {/* Period Selector */}
                    <div className="flex gap-2">
                        {(['7d', '30d', '90d', '1y'] as const).map(p => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${period === p
                                    ? 'bg-[var(--primary-blue)] text-white'
                                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                            >
                                {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : p === '90d' ? '90 Days' : '1 Year'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Mock Data Indicator */}
                {isUsingMockData && (
                    <Alert variant="warning">
                        ⚠️ Using mock data (API data not available)
                    </Alert>
                )}

                {/* Loading State */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <SpinnerLoader size="lg" />
                    </div>
                ) : (
                    <AnalyticsSection data={displayData as any} />
                )}
            </div>
        </div>
    );
}
