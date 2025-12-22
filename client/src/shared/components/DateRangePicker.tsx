'use client';

import * as React from 'react';
import { cn } from '../utils/cn';
import { Calendar, ChevronDown } from 'lucide-react';

export interface DateRange {
    from: Date | null;
    to: Date | null;
}

interface DateRangePickerProps {
    value?: DateRange;
    onChange?: (range: DateRange) => void;
    className?: string;
    placeholder?: string;
}

const presets = [
    { label: 'Today', days: 0 },
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 90 days', days: 90 },
];

export function DateRangePicker({
    value,
    onChange,
    className,
    placeholder = 'Select date range',
}: DateRangePickerProps) {
    const [isOpen, setIsOpen] = React.useState(false);

    const formatDate = (date: Date | null) => {
        if (!date) return '';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const displayValue = React.useMemo(() => {
        if (!value?.from && !value?.to) return placeholder;
        if (value.from && value.to) {
            return `${formatDate(value.from)} - ${formatDate(value.to)}`;
        }
        return formatDate(value.from || value.to);
    }, [value, placeholder]);

    const handlePresetClick = (days: number) => {
        const to = new Date();
        const from = new Date();
        from.setDate(from.getDate() - days);
        onChange?.({ from, to });
        setIsOpen(false);
    };

    return (
        <div className={cn("relative", className)}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 h-10 px-3 rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
                <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
                <span className={cn(!value?.from && "text-[var(--text-muted)]")}>
                    {displayValue}
                </span>
                <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 z-50 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg shadow-lg p-3 min-w-[200px]">
                        <div className="space-y-1">
                            {presets.map((preset) => (
                                <button
                                    key={preset.label}
                                    onClick={() => handlePresetClick(preset.days)}
                                    className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] transition-colors"
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
