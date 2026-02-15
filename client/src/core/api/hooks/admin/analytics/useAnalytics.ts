import { useMemo } from 'react';
import { useUrlDateRange } from '@/src/hooks/analytics/useUrlDateRange';
import { useAdminDashboard } from '@/src/core/api/hooks/analytics/useAnalytics';

export function useAnalyticsPage() {
    const { range: dateRange, startDateIso, endDateIso, setRange } = useUrlDateRange();
    const { data: adminDashboard, isLoading } = useAdminDashboard({
        startDate: startDateIso,
        endDate: endDateIso,
    });

    const trendData = useMemo(
        () =>
            (adminDashboard?.revenueGraph || []).map((point) => ({
                date: point._id,
                orders: point.orders || 0,
                revenue: point.revenue || 0,
            })),
        [adminDashboard?.revenueGraph]
    );

    const sellerDistribution = useMemo(
        () =>
            (adminDashboard?.companiesStats || []).map((seller) => ({
                name: seller.companyName || 'Unknown',
                value: seller.totalOrders || 0,
            })),
        [adminDashboard?.companiesStats]
    );

    const summary = useMemo(
        () => ({
            totalRevenue: adminDashboard?.totalRevenue || 0,
            totalOrders: adminDashboard?.totalOrders || 0,
            totalShipments: adminDashboard?.totalShipments || 0,
            successRate: adminDashboard?.globalSuccessRate || 0,
        }),
        [adminDashboard]
    );

    return {
        dateRange,
        setDateRange: setRange,
        trendData,
        sellerDistribution,
        summary,
        isLoading,
    };
}
