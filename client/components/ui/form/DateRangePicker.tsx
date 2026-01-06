"use client";

import React, { useState, useRef, useEffect, memo } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDateRange, DateRange } from '@/lib/dateRangeContext';

/**
 * DateRangePicker Component
 * 
 * Date range selector using design system tokens.
 * Provides presets and custom date range selection.
 */

interface DateRangePickerProps {
    className?: string;
    onRangeChange?: (range: DateRange) => void;
}

export const DateRangePicker = memo(function DateRangePicker({ className, onRangeChange }: DateRangePickerProps) {
    const { dateRange, setDateRange, presets } = useDateRange();
    const [isOpen, setIsOpen] = useState(false);
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handlePresetClick = (preset: DateRange) => {
        setDateRange(preset);
        onRangeChange?.(preset);
        setIsOpen(false);
    };

    const handleCustomApply = () => {
        if (customFrom && customTo) {
            const range: DateRange = {
                from: new Date(customFrom),
                to: new Date(customTo),
                label: 'Custom Range'
            };
            setDateRange(range);
            onRangeChange?.(range);
            setIsOpen(false);
        }
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <div ref={dropdownRef} className={cn("relative", className)}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-xl)] border",
                    "bg-[var(--bg-primary)] border-[var(--border-default)] text-[var(--text-secondary)]",
                    "transition-all duration-[var(--duration-fast)]",
                    "hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]",
                    isOpen && "border-[var(--primary-blue)] ring-2 ring-[var(--primary-blue-soft)]"
                )}
            >
                <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
                <span className="text-sm font-medium">
                    {dateRange.label === 'Custom Range'
                        ? `${formatDate(dateRange.from)} - ${formatDate(dateRange.to)}`
                        : dateRange.label
                    }
                </span>
                <ChevronDown className={cn(
                    "h-4 w-4 text-[var(--text-muted)] transition-transform duration-[var(--duration-fast)]",
                    isOpen && "rotate-180"
                )} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div
                    className={cn(
                        "absolute top-full right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 z-[var(--z-dropdown-page)]",
                        "bg-[var(--bg-elevated)] rounded-[var(--radius-xl)] border border-[var(--border-subtle)]",
                        "shadow-[var(--shadow-dropdown)] overflow-hidden",
                        "animate-fade-in"
                    )}
                >
                    {/* Presets */}
                    <div className="p-2 border-b border-[var(--border-subtle)]">
                        <p className="text-xs font-medium text-[var(--text-muted)] uppercase px-2 py-2 mb-1">
                            Quick Select
                        </p>
                        <div className="grid grid-cols-2 gap-1">
                            {presets.map((preset, index) => (
                                <button
                                    key={index}
                                    onClick={() => handlePresetClick(preset)}
                                    className={cn(
                                        "flex items-center justify-between px-3 py-2 rounded-[var(--radius-lg)] text-sm text-left",
                                        "transition-all duration-[var(--duration-fast)]",
                                        dateRange.label === preset.label
                                            ? "bg-[var(--primary-blue-soft)] text-[var(--primary-blue)] font-medium"
                                            : "hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                    )}
                                >
                                    <span>{preset.label}</span>
                                    {dateRange.label === preset.label && (
                                        <Check className="h-3.5 w-3.5" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Range */}
                    <div className="p-3">
                        <p className="text-xs font-medium text-[var(--text-muted)] uppercase mb-2">
                            Custom Range
                        </p>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="date"
                                value={customFrom}
                                onChange={(e) => setCustomFrom(e.target.value)}
                                className={cn(
                                    "flex-1 h-9 px-3 text-sm rounded-[var(--radius-lg)]",
                                    "bg-[var(--bg-tertiary)]",
                                    "border border-[var(--border-default)] text-[var(--text-primary)]",
                                    "focus:outline-none focus:border-[var(--primary-blue)] focus:ring-1 focus:ring-[var(--primary-blue-soft)]",
                                    "transition-colors duration-[var(--duration-fast)]"
                                )}
                            />
                            <span className="self-center text-[var(--text-muted)] text-sm">to</span>
                            <input
                                type="date"
                                value={customTo}
                                onChange={(e) => setCustomTo(e.target.value)}
                                className={cn(
                                    "flex-1 h-9 px-3 text-sm rounded-[var(--radius-lg)]",
                                    "bg-[var(--bg-tertiary)]",
                                    "border border-[var(--border-default)] text-[var(--text-primary)]",
                                    "focus:outline-none focus:border-[var(--primary-blue)] focus:ring-1 focus:ring-[var(--primary-blue-soft)]",
                                    "transition-colors duration-[var(--duration-fast)]"
                                )}
                            />
                        </div>
                        <button
                            onClick={handleCustomApply}
                            disabled={!customFrom || !customTo}
                            className={cn(
                                "w-full h-9 rounded-[var(--radius-lg)] text-sm font-medium",
                                "transition-all duration-[var(--duration-fast)]",
                                customFrom && customTo
                                    ? "bg-[var(--primary-blue)] text-white hover:bg-[var(--primary-blue-hover)] shadow-[var(--shadow-brand-sm)]"
                                    : "bg-[var(--bg-tertiary)] text-[var(--text-muted)] cursor-not-allowed"
                            )}
                        >
                            Apply Custom Range
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});
