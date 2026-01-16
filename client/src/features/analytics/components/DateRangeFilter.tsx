/**
 * DateRangeFilter Component
 * 
 * Reusable component for selecting date ranges in analytics views.
 * Supports presets: 7d, 30d, 90d, MTD, YTD.
 */

'use client';

import { Button } from '@/components/ui';
import { cn } from '@/src/lib/utils';
import { TimeRange } from '@/src/types/analytics.types';
import { Calendar } from 'lucide-react';

interface DateRangeFilterProps {
    value: TimeRange;
    onChange: (range: TimeRange) => void;
    className?: string;
}

export function DateRangeFilter({
    value,
    onChange,
    className
}: DateRangeFilterProps) {
    const presets: { label: string; value: TimeRange }[] = [
        { label: 'Last 7 Days', value: '7d' },
        { label: 'Last 30 Days', value: '30d' },
        { label: 'Last 90 Days', value: '90d' },
        { label: 'Month to Date', value: 'mtd' },
        { label: 'Year to Date', value: 'ytd' },
    ];

    return (
        <div className={cn("flex items-center gap-2 p-1 bg-[var(--bg-secondary)] rounded-lg", className)}>
            <div className="flex items-center gap-1 px-2 text-[var(--text-muted)]">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">Period:</span>
            </div>
            <div className="flex items-center gap-1">
                {presets.map((preset) => (
                    <Button
                        key={preset.value}
                        variant={value === preset.value ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => onChange(preset.value)}
                        className={cn(
                            "text-xs h-8 px-3 rounded-md",
                            value === preset.value
                                ? "shadow-sm"
                                : "hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
                        )}
                    >
                        {preset.label}
                    </Button>
                ))}
            </div>
        </div>
    );
}
