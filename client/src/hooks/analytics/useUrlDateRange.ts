'use client';

import { endOfDay, startOfDay, subDays } from 'date-fns';
import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { DateRange } from '@/src/lib/data';
import { parseUrlDateParam, toEndOfDayIso, toStartOfDayIso } from '@/src/lib/utils/date';

interface UseUrlDateRangeOptions {
    startKey?: string;
    endKey?: string;
    defaultDays?: number;
}

function getDefaultRange(defaultDays: number): DateRange {
    const to = endOfDay(new Date());
    const from = startOfDay(subDays(to, Math.max(1, defaultDays) - 1));

    return {
        from,
        to,
        label: `Last ${Math.max(1, defaultDays)} Days`,
    };
}

export function useUrlDateRange(options: UseUrlDateRangeOptions = {}) {
    const {
        startKey = 'startDate',
        endKey = 'endDate',
        defaultDays = 30,
    } = options;

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const range = useMemo<DateRange>(() => {
        const startParam = searchParams.get(startKey);
        const endParam = searchParams.get(endKey);

        const startParsed = parseUrlDateParam(startParam);
        const endParsed = parseUrlDateParam(endParam);

        if (!startParsed || !endParsed) {
            return getDefaultRange(defaultDays);
        }

        const from = startOfDay(startParsed);
        const to = endOfDay(endParsed);

        return {
            from,
            to,
            label: 'Custom Range',
        };
    }, [defaultDays, endKey, searchParams, startKey]);

    const setRange = useCallback((nextRange: DateRange) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set(startKey, toStartOfDayIso(nextRange.from));
        params.set(endKey, toEndOfDayIso(nextRange.to));
        params.set('page', '1');
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, [endKey, pathname, router, searchParams, startKey]);

    const resetToDefault = useCallback(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete(startKey);
        params.delete(endKey);
        params.set('page', '1');
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, [endKey, pathname, router, searchParams, startKey]);

    return {
        range,
        startDateIso: toStartOfDayIso(range.from),
        endDateIso: toEndOfDayIso(range.to),
        setRange,
        resetToDefault,
    };
}
