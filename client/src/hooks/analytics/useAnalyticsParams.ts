'use client';

import { differenceInCalendarDays, endOfDay, isSameDay, startOfDay, startOfMonth, startOfYear, subDays } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AnalyticsFilters } from '@/src/types/api/analytics';
import { ClientTimeRange as TimeRange, DateRange } from '@/src/types/analytics/client-analytics.types';
import { useUrlDateRange } from './useUrlDateRange';

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
    const {
        range,
        startDateIso,
        endDateIso,
        setRange,
    } = useUrlDateRange();
    const [timeRange, setTimeRangeState] = useState<TimeRange>('30d');

    useEffect(() => {
        const today = endOfDay(new Date());
        const days = differenceInCalendarDays(endOfDay(range.to), startOfDay(range.from)) + 1;
        const current = isSameDay(endOfDay(range.to), today);

        if (current && days === 7) {
            setTimeRangeState('7d');
            return;
        }
        if (current && days === 30) {
            setTimeRangeState('30d');
            return;
        }
        if (current && days === 90) {
            setTimeRangeState('90d');
            return;
        }

        const monthStart = startOfMonth(today);
        if (isSameDay(startOfDay(range.from), monthStart)) {
            setTimeRangeState('mtd');
            return;
        }

        const yearStart = startOfYear(today);
        if (isSameDay(startOfDay(range.from), yearStart)) {
            setTimeRangeState('ytd');
            return;
        }

        setTimeRangeState('30d');
    }, [range.from, range.to]);

    const setTimeRange = useCallback((nextRange: TimeRange) => {
        setTimeRangeState(nextRange);
        const target = toRange(nextRange);
        setRange({
            from: target.from,
            to: target.to,
            label: nextRange,
        });
    }, [setRange]);

    const dateRange = useMemo<DateRange>(() => ({
        from: startOfDay(range.from),
        to: endOfDay(range.to),
    }), [range.from, range.to]);

    const apiFilters = useMemo<AnalyticsFilters>(() => ({
        startDate: startDateIso,
        endDate: endDateIso,
    }), [endDateIso, startDateIso]);

    return {
        timeRange,
        setTimeRange,
        dateRange,
        apiFilters,
    };
}
