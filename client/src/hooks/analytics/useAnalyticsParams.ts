'use client';

import { endOfDay, startOfDay, startOfMonth, startOfYear, subDays } from 'date-fns';
import { useMemo, useState } from 'react';
import type { AnalyticsFilters } from '@/src/types/api/analytics';
import { ClientTimeRange as TimeRange, DateRange } from '@/src/types/analytics/client-analytics.types';

const toRange = (timeRange: TimeRange): DateRange => {
    const now = new Date();

    if (timeRange === '7d') {
        return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    }

    if (timeRange === '90d') {
        return { from: startOfDay(subDays(now, 89)), to: endOfDay(now) };
    }

    if (timeRange === 'mtd') {
        return { from: startOfMonth(now), to: endOfDay(now) };
    }

    if (timeRange === 'ytd') {
        return { from: startOfYear(now), to: endOfDay(now) };
    }

    return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
};

export function useAnalyticsParams() {
    const [timeRange, setTimeRange] = useState<TimeRange>('30d');
    const dateRange = useMemo(() => toRange(timeRange), [timeRange]);

    const apiFilters = useMemo<AnalyticsFilters>(() => ({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
    }), [dateRange]);

    return {
        timeRange,
        setTimeRange,
        dateRange,
        apiFilters,
    };
}
