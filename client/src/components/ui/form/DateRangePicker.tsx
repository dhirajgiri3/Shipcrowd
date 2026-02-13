"use client";

import React, { useState, useRef, useEffect, memo } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useDateRange, DateRange } from '@/src/lib/data';

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
                    "flex items-center gap-2 h-10 px-3.5 rounded-xl border shadow-sm",
                    "bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-primary)] font-medium text-sm",
                    "transition-all duration-200",
                    "hover:bg-[var(--bg-tertiary)]",
                    isOpen && "bg-[var(--bg-tertiary)]"
                )}
            >
                <Calendar className="h-4 w-4 text-[var(--text-secondary)]" />
                <span className="text-sm font-medium whitespace-nowrap">
                    {dateRange.label === 'Custom Range'
                        ? `${formatDate(dateRange.from)} - ${formatDate(dateRange.to)}`
                        : dateRange.label
                    }
                </span>
                <ChevronDown className={cn(
                    "h-4 w-4 text-[var(--text-secondary)] transition-transform duration-200",
                    isOpen && "rotate-180"
                )} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div
                    className={cn(
                        "absolute top-full right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 z-[var(--z-dropdown-page)]",
                        "bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)]",
                        "overflow-hidden",
                        "animate-fade-in"
                    )}
                >
                    {/* Presets */}
                    <div className="p-3 border-b border-[var(--border-default)]">
                        <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide px-2 mb-2">
                            Quick Select
                        </p>
                        <div className="grid grid-cols-2 gap-1.5">
                            {presets.map((preset, index) => (
                                <button
                                    key={index}
                                    onClick={() => handlePresetClick(preset)}
                                    className={cn(
                                        "flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left",
                                        "transition-all duration-200",
                                        dateRange.label === preset.label
                                            ? "bg-[var(--primary-blue)] text-white font-medium"
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
                        <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-3">
                            Custom Range
                        </p>
                        <div className="flex gap-2 mb-3">
                            <input
                                type="date"
                                value={customFrom}
                                onChange={(e) => setCustomFrom(e.target.value)}
                                className={cn(
                                    "flex-1 h-9 px-3 text-sm rounded-lg",
                                    "bg-[var(--bg-tertiary)]",
                                    "border border-[var(--border-default)] text-[var(--text-primary)]",
                                    "focus:outline-none focus:border-[var(--primary-blue)]",
                                    "transition-colors duration-200"
                                )}
                            />
                            <span className="self-center text-[var(--text-muted)] text-sm font-medium">to</span>
                            <input
                                type="date"
                                value={customTo}
                                onChange={(e) => setCustomTo(e.target.value)}
                                className={cn(
                                    "flex-1 h-9 px-3 text-sm rounded-lg",
                                    "bg-[var(--bg-tertiary)]",
                                    "border border-[var(--border-default)] text-[var(--text-primary)]",
                                    "focus:outline-none focus:border-[var(--primary-blue)]",
                                    "transition-colors duration-200"
                                )}
                            />
                        </div>
                        <button
                            onClick={handleCustomApply}
                            disabled={!customFrom || !customTo}
                            className={cn(
                                "w-full h-9 rounded-lg text-sm font-medium",
                                "transition-all duration-200",
                                customFrom && customTo
                                    ? "bg-[var(--primary-blue)] text-white hover:bg-[var(--primary-blue-deep)]"
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
