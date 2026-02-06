
import React from 'react';
import { motion } from 'framer-motion';

interface HealthGaugeProps {
    score: number;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
}

export function HealthGauge({ score, size = 'md', showLabel = true }: HealthGaugeProps) {
    // Size configuration
    const config = {
        sm: { size: 32, stroke: 3, fontSize: 'text-[10px]' },
        md: { size: 48, stroke: 4, fontSize: 'text-xs' },
        lg: { size: 80, stroke: 6, fontSize: 'text-lg' }
    }[size];

    const radius = (config.size - config.stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    // Color logic based on score
    const getColor = (s: number) => {
        if (s >= 80) return { text: 'text-[var(--success)]', stroke: 'stroke-[var(--success)]', bg: 'stroke-[var(--success-bg)]' };
        if (s >= 50) return { text: 'text-[var(--warning)]', stroke: 'stroke-[var(--warning)]', bg: 'stroke-[var(--warning-bg)]' };
        return { text: 'text-[var(--error)]', stroke: 'stroke-[var(--error)]', bg: 'stroke-[var(--error-bg)]', animate: true };
    };

    const colors = getColor(score);

    return (
        <div className="relative inline-flex items-center justify-center" style={{ width: config.size, height: config.size }}>
            {/* Background Circle */}
            <svg className="transform -rotate-90 w-full h-full">
                <circle
                    className={colors.bg}
                    strokeWidth={config.stroke}
                    fill="transparent"
                    r={radius}
                    cx={config.size / 2}
                    cy={config.size / 2}
                />
                {/* Progress Circle */}
                <motion.circle
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`${colors.stroke} ${colors.animate ? 'animate-pulse' : ''}`}
                    strokeWidth={config.stroke}
                    strokeLinecap="round"
                    fill="transparent"
                    r={radius}
                    cx={config.size / 2}
                    cy={config.size / 2}
                    style={{ strokeDasharray: circumference }}
                />
            </svg>

            {/* Score Label */}
            {showLabel && (
                <div className={`absolute inset-0 flex items-center justify-center font-bold ${colors.text} ${config.fontSize}`}>
                    {Math.round(score)}
                </div>
            )}
        </div>
    );
}
