"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

export interface DateRange {
    from: Date;
    to: Date;
    label: string;
}

interface DateRangeContextType {
    dateRange: DateRange;
    setDateRange: (range: DateRange) => void;
    presets: DateRange[];
}

const defaultDateRange: DateRange = {
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
    label: 'Last 30 Days'
};

const presets: DateRange[] = [
    {
        from: new Date(),
        to: new Date(),
        label: 'Today'
    },
    {
        from: new Date(new Date().setDate(new Date().getDate() - 7)),
        to: new Date(),
        label: 'Last 7 Days'
    },
    {
        from: new Date(new Date().setDate(new Date().getDate() - 30)),
        to: new Date(),
        label: 'Last 30 Days'
    },
    {
        from: new Date(new Date().setDate(new Date().getDate() - 90)),
        to: new Date(),
        label: 'Last 90 Days'
    },
    {
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        to: new Date(),
        label: 'This Month'
    },
    {
        from: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
        to: new Date(new Date().getFullYear(), new Date().getMonth(), 0),
        label: 'Last Month'
    },
    {
        from: new Date(new Date().getFullYear(), 0, 1),
        to: new Date(),
        label: 'This Year'
    }
];

const DateRangeContext = createContext<DateRangeContextType | undefined>(undefined);

export function DateRangeProvider({ children }: { children: React.ReactNode }) {
    const [dateRange, setDateRangeState] = useState<DateRange>(defaultDateRange);

    const setDateRange = useCallback((range: DateRange) => {
        setDateRangeState(range);
    }, []);

    return (
        <DateRangeContext.Provider value={{ dateRange, setDateRange, presets }}>
            {children}
        </DateRangeContext.Provider>
    );
}

export function useDateRange() {
    const context = useContext(DateRangeContext);
    if (context === undefined) {
        // Return default values if not in provider
        return {
            dateRange: defaultDateRange,
            setDateRange: () => { },
            presets
        };
    }
    return context;
}
