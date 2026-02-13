/**
 * Dashboard Date Range Context
 * 
 * Centralized date filtering for the entire dashboard with:
 * - URL parameter synchronization (shareable links)
 * - Preset date ranges (Today, Last 7 Days, Last 30 Days, Custom)
 * - Type-safe API
 * - Automatic cache invalidation on date change
 */

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

export type DatePreset = 'today' | 'last7days' | 'last30days' | 'custom';

export interface DateRange {
    startDate: Date;
    endDate: Date;
}

export interface DashboardDateContextType {
    dateRange: DateRange;
    preset: DatePreset;
    setDateRange: (range: DateRange, preset?: DatePreset) => void;
    setPreset: (preset: Exclude<DatePreset, 'custom'>) => void;
    isCustomRange: boolean;
    // Formatted strings for API calls
    getAPIParams: () => { startDate: string; endDate: string };
}

const DashboardDateContext = createContext<DashboardDateContextType | undefined>(undefined);

// Helper: Get date range for a preset
function getPresetRange(preset: Exclude<DatePreset, 'custom'>): DateRange {
    const now = new Date();
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    switch (preset) {
        case 'today':
            return {
                startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
                endDate
            };
        case 'last7days':
            const start7 = new Date(endDate);
            start7.setDate(start7.getDate() - 6); // Last 7 days including today
            start7.setHours(0, 0, 0, 0);
            return { startDate: start7, endDate };
        case 'last30days':
            const start30 = new Date(endDate);
            start30.setDate(start30.getDate() - 29); // Last 30 days including today
            start30.setHours(0, 0, 0, 0);
            return { startDate: start30, endDate };
    }
}

// Helper: Format date for URL params (YYYY-MM-DD)
function formatDateForURL(date: Date): string {
    return date.toISOString().split('T')[0];
}

// Helper: Parse date from URL param
function parseDateFromURL(dateStr: string | null): Date | null {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
}

export function DashboardDateProvider({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Initialize from URL params or default to 'last30days'
    const [preset, setPresetState] = useState<DatePreset>(() => {
        const urlPreset = searchParams.get('period') as DatePreset;
        if (urlPreset && ['today', 'last7days', 'last30days'].includes(urlPreset)) {
            return urlPreset;
        }
        // Check if custom dates in URL
        if (searchParams.get('startDate') && searchParams.get('endDate')) {
            return 'custom';
        }
        return 'last30days'; // Default
    });

    const [dateRange, setDateRangeState] = useState<DateRange>(() => {
        // Try to get from URL first
        const urlStart = parseDateFromURL(searchParams.get('startDate'));
        const urlEnd = parseDateFromURL(searchParams.get('endDate'));

        if (urlStart && urlEnd) {
            // Normalize URL date-only values to full-day boundaries.
            // Prevents custom ranges from collapsing to midnight on reload.
            const start = new Date(urlStart);
            start.setHours(0, 0, 0, 0);
            const end = new Date(urlEnd);
            end.setHours(23, 59, 59, 999);
            return { startDate: start, endDate: end };
        }

        // Otherwise use preset
        const urlPreset = searchParams.get('period') as DatePreset;
        if (urlPreset && urlPreset !== 'custom') {
            return getPresetRange(urlPreset);
        }

        return getPresetRange('last30days');
    });

    // Sync to URL whenever date range or preset changes
    const syncToURL = useCallback((range: DateRange, currentPreset: DatePreset) => {
        const params = new URLSearchParams(searchParams.toString());

        if (currentPreset === 'custom') {
            params.set('startDate', formatDateForURL(range.startDate));
            params.set('endDate', formatDateForURL(range.endDate));
            params.delete('period');
        } else {
            params.set('period', currentPreset);
            params.delete('startDate');
            params.delete('endDate');
        }

        // Update URL without page reload
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, [pathname, router, searchParams]);

    // Set date range (with optional preset)
    const setDateRange = useCallback((range: DateRange, newPreset: DatePreset = 'custom') => {
        setDateRangeState(range);
        setPresetState(newPreset);
        syncToURL(range, newPreset);
    }, [syncToURL]);

    // Set preset (auto-calculates date range)
    const setPreset = useCallback((newPreset: Exclude<DatePreset, 'custom'>) => {
        const range = getPresetRange(newPreset);
        setDateRangeState(range);
        setPresetState(newPreset);
        syncToURL(range, newPreset);
    }, [syncToURL]);

    // Get formatted params for API calls
    const getAPIParams = useCallback(() => ({
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
    }), [dateRange]);

    return (
        <DashboardDateContext.Provider
            value={{
                dateRange,
                preset,
                setDateRange,
                setPreset,
                isCustomRange: preset === 'custom',
                getAPIParams,
            }}
        >
            {children}
        </DashboardDateContext.Provider>
    );
}

export function useDashboardDate() {
    const context = useContext(DashboardDateContext);
    if (!context) {
        throw new Error('useDashboardDate must be used within DashboardDateProvider');
    }
    return context;
}
