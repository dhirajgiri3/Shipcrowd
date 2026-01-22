'use client';

import { AnalyticsSection } from '@/src/components/seller/dashboard/AnalyticsSection';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

/**
 * Dedicated Analytics Page
 * 
 * Moved from inline dashboard for:
 * - Cleaner dashboard (overview vs deep-dive)
 * - Better performance (heavy charts not loaded on main view)
 * - Dedicated space for power users
 */

// Mock data matching AnalyticsData interface
const mockAnalyticsData = {
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

export default function AnalyticsPage() {
    return (
        <div className="min-h-screen bg-[var(--bg-primary)] p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header with back button */}
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

                {/* Analytics Section */}
                <AnalyticsSection data={mockAnalyticsData} />
            </div>
        </div>
    );
}
