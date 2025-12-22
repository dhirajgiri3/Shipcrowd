import * as React from 'react';
import { cn } from '../utils/cn';

interface RadialProgressProps {
    value: number;
    max?: number;
    size?: number;
    strokeWidth?: number;
    className?: string;
    children?: React.ReactNode;
    color?: string;
    showValue?: boolean;
    animated?: boolean;
}

export function RadialProgress({
    value,
    max = 100,
    size = 80,
    strokeWidth = 8,
    className,
    children,
    color = 'var(--primary-blue)',
    showValue = false,
    animated = true,
}: RadialProgressProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const percentage = Math.min(Math.max(value / max, 0), 1);
    const strokeDashoffset = circumference - percentage * circumference;

    return (
        <div className={cn("relative inline-flex items-center justify-center", className)}>
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="transform -rotate-90"
            >
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-gray-200"
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    style={{
                        transition: animated ? 'stroke-dashoffset 0.5s ease-in-out' : 'none'
                    }}
                />
            </svg>
            {(children || showValue) && (
                <div className="absolute inset-0 flex items-center justify-center">
                    {children || (showValue && (
                        <span className="text-sm font-medium">{Math.round(percentage * 100)}%</span>
                    ))}
                </div>
            )}
        </div>
    );
}
