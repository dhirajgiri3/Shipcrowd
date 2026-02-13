"use client";

import * as React from "react";
import { cn } from "@/src/lib/utils";

interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
    value: number;
    onValueChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    label?: string;
    suffix?: string;
}

export function Slider({
    className,
    value,
    onValueChange,
    min = 0,
    max = 100,
    step = 1,
    label,
    suffix = "%",
    ...props
}: SliderProps) {
    const percentage = ((value - min) / (max - min)) * 100;

    return (
        <div className={cn("w-full space-y-2", className)}>
            {(label || suffix) && (
                <div className="flex justify-between items-center text-sm">
                    {label && <label className="font-medium text-[var(--text-primary)]">{label}</label>}
                    <span className="font-bold text-[var(--primary-blue)]">
                        {value}{suffix}
                    </span>
                </div>
            )}
            <div className="relative h-6 flex items-center">
                {/* Track background */}
                <div className="absolute w-full h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                    {/* Active track */}
                    <div
                        className="h-full bg-[var(--primary-blue)] transition-all duration-150 ease-out"
                        style={{ width: `${percentage}%` }}
                    />
                </div>

                {/* Actual Range Input (Invisible but interactive) */}
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onValueChange(Number(e.target.value))}
                    className="absolute w-full h-full opacity-0 cursor-pointer z-10"
                    {...props}
                />

                {/* Thumb Visual (positioned by percentage) */}
                <div
                    className="absolute h-5 w-5 bg-white border-2 border-[var(--primary-blue)] rounded-full shadow-md z-0 pointer-events-none transition-all duration-150 ease-out transform -translate-x-1/2"
                    style={{ left: `${percentage}%` }}
                />
            </div>
        </div>
    );
}
