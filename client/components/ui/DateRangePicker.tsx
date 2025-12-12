"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDateRange, DateRange } from '@/lib/dateRangeContext';

interface DateRangePickerProps {
    className?: string;
    onRangeChange?: (range: DateRange) => void;
}

export function DateRangePicker({ className, onRangeChange }: DateRangePickerProps) {
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
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all",
                    "bg-white border-gray-200 hover:border-gray-300 text-gray-700",
                    isOpen && "border-[#2525FF] ring-2 ring-[#2525FF]/20"
                )}
            >
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium">
                    {dateRange.label === 'Custom Range'
                        ? `${formatDate(dateRange.from)} - ${formatDate(dateRange.to)}`
                        : dateRange.label
                    }
                </span>
                <ChevronDown className={cn(
                    "h-4 w-4 text-gray-400 transition-transform",
                    isOpen && "transform rotate-180"
                )} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Presets */}
                    <div className="p-2 border-b border-gray-100">
                        <p className="text-xs font-medium text-gray-500 uppercase px-2 py-1">Quick Select</p>
                        <div className="grid grid-cols-2 gap-1 mt-1">
                            {presets.map((preset, index) => (
                                <button
                                    key={index}
                                    onClick={() => handlePresetClick(preset)}
                                    className={cn(
                                        "flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all text-left",
                                        dateRange.label === preset.label
                                            ? "bg-[#2525FF]/10 text-[#2525FF] font-medium"
                                            : "hover:bg-gray-50 text-gray-700"
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
                        <p className="text-xs font-medium text-gray-500 uppercase mb-2">Custom Range</p>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="date"
                                value={customFrom}
                                onChange={(e) => setCustomFrom(e.target.value)}
                                className="flex-1 h-9 px-3 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-[#2525FF] text-gray-900"
                            />
                            <span className="self-center text-gray-400 text-sm">to</span>
                            <input
                                type="date"
                                value={customTo}
                                onChange={(e) => setCustomTo(e.target.value)}
                                className="flex-1 h-9 px-3 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-[#2525FF] text-gray-900"
                            />
                        </div>
                        <button
                            onClick={handleCustomApply}
                            disabled={!customFrom || !customTo}
                            className={cn(
                                "w-full h-9 rounded-lg text-sm font-medium transition-all",
                                customFrom && customTo
                                    ? "bg-[#2525FF] text-white hover:bg-[#1e1ecc]"
                                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                            )}
                        >
                            Apply Custom Range
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
