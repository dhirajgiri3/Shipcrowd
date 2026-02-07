
import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: React.ComponentType<{ className?: string }>;
    iconColor?: string; // e.g. "text-blue-500 bg-blue-500"
    variant?: 'default' | 'success' | 'warning' | 'critical' | 'info';
    trend?: {
        value: number;
        label: string;
        positive: boolean;
    };
    description?: string;
    delay?: number;
    onClick?: () => void;
    isActive?: boolean;
}

const variantStyles = {
    default: {
        bg: 'bg-[var(--bg-primary)]',
        border: 'border-[var(--border-subtle)]',
        activeBorder: 'border-[var(--primary-blue)]',
        activeShadow: 'shadow-[0_0_20px_var(--primary-blue-soft)]',
        iconBg: 'bg-[var(--bg-tertiary)]',
        iconColor: 'text-[var(--text-muted)]',
    },
    success: {
        bg: 'bg-[var(--success-bg)]',
        border: 'border-[var(--success)]/20',
        activeBorder: 'border-[var(--success)]',
        activeShadow: 'shadow-[0_0_20px_var(--success-bg)]',
        iconBg: 'bg-[var(--success)]/10',
        iconColor: 'text-[var(--success)]',
    },
    warning: {
        bg: 'bg-[var(--warning-bg)]',
        border: 'border-[var(--warning)]/20',
        activeBorder: 'border-[var(--warning)]',
        activeShadow: 'shadow-[0_0_20px_var(--warning-bg)]',
        iconBg: 'bg-[var(--warning)]/10',
        iconColor: 'text-[var(--warning)]',
    },
    critical: {
        bg: 'bg-[var(--error-bg)]', // Using error var for critical
        border: 'border-[var(--error)]/20',
        activeBorder: 'border-[var(--error)]',
        activeShadow: 'shadow-[0_0_20px_var(--error-bg)]',
        iconBg: 'bg-[var(--error)]/10',
        iconColor: 'text-[var(--error)]',
    },
    info: {
        bg: 'bg-[var(--info-bg)]',
        border: 'border-[var(--info)]/20',
        activeBorder: 'border-[var(--info)]',
        activeShadow: 'shadow-[0_0_20px_var(--info-bg)]',
        iconBg: 'bg-[var(--info)]/10',
        iconColor: 'text-[var(--info)]',
    }
};

export function StatsCard({
    title,
    value,
    icon: Icon,
    iconColor,
    variant = 'default',
    trend,
    description,
    delay = 0,
    onClick,
    isActive = false
}: StatsCardProps) {
    const divRef = useRef<HTMLButtonElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [opacity, setOpacity] = useState(0);

    const styles = variantStyles[variant] || variantStyles.default;

    const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!divRef.current) return;
        const rect = divRef.current.getBoundingClientRect();
        setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        setOpacity(1);
    };

    const handleMouseLeave = () => {
        setOpacity(0);
    };

    return (
        <motion.button
            ref={divRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: delay * 0.1 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={onClick}
            className={`
                group relative overflow-hidden rounded-2xl text-left w-full h-full
                transition-all duration-300
                ${isActive ? `${styles.bg} ${styles.activeBorder} ring-1 ring-current ${styles.activeShadow}` : `${styles.bg} ${styles.border} hover:border-[var(--border-strong)] hover:shadow-md`}
            `}
        >
            {/* Spotlight Effect */}
            <div
                className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 group-hover:opacity-100 z-10"
                style={{
                    background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, var(--primary-blue-soft), transparent 40%)`
                }}
            />

            {/* Active Glow Background */}
            {isActive && (
                <div className="absolute inset-0 bg-gradient-to-br from-current to-transparent opacity-5 pointer-events-none" />
            )}

            <div className="relative z-20 p-5 flex flex-col h-full justify-between">
                <div className="flex justify-between items-start mb-3">
                    <div className={`
                        p-2.5 rounded-xl transition-transform group-hover:scale-110
                        ${iconColor ? '' : styles.iconBg}
                        ${iconColor ? '' : styles.iconColor}
                        ${iconColor ? iconColor : ''}
                    `}>
                        <Icon className={`w-5 h-5`} />
                    </div>
                    {trend && (
                        <div
                            className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${trend.positive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}
                            title={trend.label}
                        >
                            {trend.positive ? '+' : ''}{trend.value}%
                        </div>
                    )}
                </div>

                <div>
                    <h3 className={`text-sm font-medium mb-1 transition-colors ${isActive ? 'text-[var(--primary-blue)]' : 'text-[var(--text-secondary)]'}`}>
                        {title}
                    </h3>
                    <div className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">{value}</div>
                    {description && (
                        <p className="text-[var(--text-tertiary)] text-xs mt-1 line-clamp-1">{description}</p>
                    )}
                </div>
            </div>
        </motion.button>
    );
}
