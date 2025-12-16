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
                    "flex items-center gap-2 px-4 py-2.5 rounded-[--radius-xl] border",
                    "bg-[--card-background] border-[--color-gray-200] text-[--color-gray-700]",
                    "transition-all duration-[--transition-fast]",
                    "hover:border-[--color-gray-300]",
                    isOpen && "border-[--color-primary] ring-2 ring-[--color-primary-light]"
                )}
            >
                <Calendar className="h-4 w-4 text-[--color-gray-400]" />
                <span className="text-sm font-medium">
                    {dateRange.label === 'Custom Range'
                        ? `${formatDate(dateRange.from)} - ${formatDate(dateRange.to)}`
                        : dateRange.label
                    }
                </span>
                <ChevronDown className={cn(
                    "h-4 w-4 text-[--color-gray-400] transition-transform duration-[--transition-fast]",
                    isOpen && "rotate-180"
                )} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div
                    className={cn(
                        "absolute top-full left-0 mt-2 w-80 z-[--z-dropdown]",
                        "bg-[--card-background] rounded-[--radius-xl] border border-[--color-gray-200]",
                        "shadow-[--shadow-lg] overflow-hidden",
                        "animate-fade-in"
                    )}
                >
                    {/* Presets */}
                    <div className="p-2 border-b border-[--color-gray-100]">
                        <p className="text-xs font-medium text-[--color-gray-500] uppercase px-2 py-1">
                            Quick Select
                        </p>
                        <div className="grid grid-cols-2 gap-1 mt-1">
                            {presets.map((preset, index) => (
                                <button
                                    key={index}
                                    onClick={() => handlePresetClick(preset)}
                                    className={cn(
                                        "flex items-center justify-between px-3 py-2 rounded-[--radius-lg] text-sm text-left",
                                        "transition-all duration-[--transition-fast]",
                                        dateRange.label === preset.label
                                            ? "bg-[--color-primary-light] text-[--color-primary] font-medium"
                                            : "hover:bg-[--color-gray-50] text-[--color-gray-700]"
                                    )}
                                >
                                    <span>{preset.label}</span>
                                    {dateRange.label === preset.label && (
                                        <Check className="h-4 w-4" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Range */}
                    <div className="p-3">
                        <p className="text-xs font-medium text-[--color-gray-500] uppercase mb-2">
                            Custom Range
                        </p>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="date"
                                value={customFrom}
                                onChange={(e) => setCustomFrom(e.target.value)}
                                className={cn(
                                    "flex-1 h-9 px-3 text-sm rounded-[--radius-lg]",
                                    "border border-[--color-gray-200] text-[--color-gray-900]",
                                    "focus:outline-none focus:border-[--color-primary]",
                                    "transition-colors duration-[--transition-fast]"
                                )}
                            />
                            <span className="self-center text-[--color-gray-400] text-sm">to</span>
                            <input
                                type="date"
                                value={customTo}
                                onChange={(e) => setCustomTo(e.target.value)}
                                className={cn(
                                    "flex-1 h-9 px-3 text-sm rounded-[--radius-lg]",
                                    "border border-[--color-gray-200] text-[--color-gray-900]",
                                    "focus:outline-none focus:border-[--color-primary]",
                                    "transition-colors duration-[--transition-fast]"
                                )}
                            />
                        </div>
                        <button
                            onClick={handleCustomApply}
                            disabled={!customFrom || !customTo}
                            className={cn(
                                "w-full h-9 rounded-[--radius-lg] text-sm font-medium",
                                "transition-all duration-[--transition-fast]",
                                customFrom && customTo
                                    ? "bg-[--color-primary] text-white hover:bg-[--color-primary-hover]"
                                    : "bg-[--color-gray-100] text-[--color-gray-400] cursor-not-allowed"
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
