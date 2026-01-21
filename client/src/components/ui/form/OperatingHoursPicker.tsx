"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Calendar, Check } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export interface OperatingHours {
    weekdays: { start: string; end: string } | null;
    saturday: { start: string; end: string } | null;
    sunday: { start: string; end: string } | null;
}

interface OperatingHoursPickerProps {
    value: OperatingHours;
    onChange: (hours: OperatingHours) => void;
    disabled?: boolean;
}

const PRESETS = [
    { label: '24/7', value: { weekdays: { start: '00:00', end: '23:59' }, saturday: { start: '00:00', end: '23:59' }, sunday: { start: '00:00', end: '23:59' } } },
    { label: '9-6 Mon-Sat', value: { weekdays: { start: '09:00', end: '18:00' }, saturday: { start: '09:00', end: '18:00' }, sunday: null } },
    { label: '9-9 Daily', value: { weekdays: { start: '09:00', end: '21:00' }, saturday: { start: '09:00', end: '21:00' }, sunday: { start: '09:00', end: '21:00' } } },
    { label: '10-7 Mon-Fri', value: { weekdays: { start: '10:00', end: '19:00' }, saturday: null, sunday: null } },
];

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return [
        { label: `${hour}:00`, value: `${hour}:00` },
        { label: `${hour}:30`, value: `${hour}:30` },
    ];
}).flat();

export function OperatingHoursPicker({ value, onChange, disabled = false }: OperatingHoursPickerProps) {
    const applyPreset = (preset: typeof PRESETS[0]) => {
        onChange(preset.value);
    };

    const updateDayHours = (day: 'weekdays' | 'saturday' | 'sunday', hours: { start: string; end: string } | null) => {
        onChange({
            ...value,
            [day]: hours,
        });
    };

    const toggleDay = (day: 'weekdays' | 'saturday' | 'sunday') => {
        if (value[day]) {
            updateDayHours(day, null);
        } else {
            updateDayHours(day, { start: '09:00', end: '18:00' });
        }
    };

    const renderDayPicker = (day: 'weekdays' | 'saturday' | 'sunday', label: string) => {
        const hours = value[day];
        const isActive = !!hours;

        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] transition-colors hover:border-[var(--border-focus)]">
                    <div className="flex items-center gap-3 flex-1">
                        <Calendar className={cn(
                            "w-4 h-4 flex-shrink-0",
                            isActive ? "text-[var(--primary-blue)]" : "text-[var(--text-muted)]"
                        )} />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
                            {isActive && hours && (
                                <p className="text-xs text-[var(--text-muted)] mt-0.5 font-mono">
                                    {hours.start} - {hours.end}
                                </p>
                            )}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => toggleDay(day)}
                        disabled={disabled}
                        className={cn(
                            "relative w-11 h-6 rounded-full transition-all duration-200 flex-shrink-0",
                            "focus:outline-none focus:ring-1 focus:ring-[var(--primary-blue)]/30",
                            isActive ? "bg-[var(--primary-blue)]" : "bg-[var(--bg-secondary)] border border-[var(--border-default)]"
                        )}
                    >
                        <motion.div
                            className={cn(
                                "absolute top-0.5 w-5 h-5 rounded-full shadow-sm",
                                isActive ? "bg-white" : "bg-[var(--text-muted)]"
                            )}
                            animate={{ x: isActive ? 22 : 2 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                    </button>
                </div>

                <AnimatePresence>
                    {isActive && hours && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.15 }}
                            className="overflow-hidden"
                        >
                            <div className="grid grid-cols-2 gap-3 pl-7">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
                                        Start
                                    </label>
                                    <select
                                        value={hours.start}
                                        onChange={(e) => updateDayHours(day, { ...hours, start: e.target.value })}
                                        disabled={disabled}
                                        className="w-full px-3 py-2 text-sm font-mono border border-[var(--border-default)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-blue)]/30 focus:border-[var(--primary-blue)] cursor-pointer"
                                    >
                                        {TIME_OPTIONS.map((time) => (
                                            <option key={time.value} value={time.value}>
                                                {time.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
                                        End
                                    </label>
                                    <select
                                        value={hours.end}
                                        onChange={(e) => updateDayHours(day, { ...hours, end: e.target.value })}
                                        disabled={disabled}
                                        className="w-full px-3 py-2 text-sm font-mono border border-[var(--border-default)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-blue)]/30 focus:border-[var(--primary-blue)] cursor-pointer"
                                    >
                                        {TIME_OPTIONS.map((time) => (
                                            <option key={time.value} value={time.value}>
                                                {time.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            {/* Quick Presets */}
            <div className="space-y-2.5">
                <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
                    Quick Presets
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {PRESETS.map((preset) => (
                        <button
                            key={preset.label}
                            type="button"
                            onClick={() => applyPreset(preset)}
                            disabled={disabled}
                            className={cn(
                                "px-3 py-2 text-xs font-medium rounded-lg transition-all",
                                "border border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-primary)]",
                                "hover:border-[var(--primary-blue)] hover:bg-[var(--primary-blue-soft)]/10",
                                "focus:outline-none focus:ring-1 focus:ring-[var(--primary-blue)]/30"
                            )}
                        >
                            <Clock className="w-3 h-3 inline-block mr-1.5" />
                            {preset.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Day-wise Hours */}
            <div className="space-y-2.5">
                {renderDayPicker('weekdays', 'Monday - Friday')}
                {renderDayPicker('saturday', 'Saturday')}
                {renderDayPicker('sunday', 'Sunday')}
            </div>

            {/* Summary */}
            <AnimatePresence>
                {(value.weekdays || value.saturday || value.sunday) && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                        className="p-3.5 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-default)]"
                    >
                        <div className="flex items-center gap-2 mb-2.5">
                            <Check className="w-3.5 h-3.5 text-[var(--success)]" />
                            <p className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wide">
                                Hours Configured
                            </p>
                        </div>
                        <div className="space-y-1.5 text-sm">
                            {value.weekdays && (
                                <div className="flex justify-between items-center text-[var(--text-secondary)]">
                                    <span className="font-medium">Mon-Fri</span>
                                    <span className="font-mono text-xs">
                                        {value.weekdays.start} - {value.weekdays.end}
                                    </span>
                                </div>
                            )}
                            {value.saturday && (
                                <div className="flex justify-between items-center text-[var(--text-secondary)]">
                                    <span className="font-medium">Saturday</span>
                                    <span className="font-mono text-xs">
                                        {value.saturday.start} - {value.saturday.end}
                                    </span>
                                </div>
                            )}
                            {value.sunday && (
                                <div className="flex justify-between items-center text-[var(--text-secondary)]">
                                    <span className="font-medium">Sunday</span>
                                    <span className="font-mono text-xs">
                                        {value.sunday.start} - {value.sunday.end}
                                    </span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
