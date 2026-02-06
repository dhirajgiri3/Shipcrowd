
import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface BentoSummaryCardProps {
    title: string;
    value: string | number;
    icon: React.ComponentType<{ className?: string }>;
    iconColor: string;
    trend?: {
        value: number;
        label: string;
        positive: boolean;
    };
    description?: string;
    delay?: number;
}

export function BentoSummaryCard({ title, value, icon: Icon, iconColor, trend, description, delay = 0 }: BentoSummaryCardProps) {
    const divRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [opacity, setOpacity] = useState(0);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!divRef.current) return;
        const rect = divRef.current.getBoundingClientRect();
        setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        setOpacity(1);
    };

    const handleMouseLeave = () => {
        setOpacity(0);
    };

    return (
        <motion.div
            ref={divRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: delay * 0.1 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="group relative overflow-hidden rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-default)] shadow-sm hover:shadow-lg transition-all duration-500"
        >
            {/* Spotlight Effect */}
            <div
                className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 group-hover:opacity-100 z-10"
                style={{
                    background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, var(--primary-blue-soft), transparent 40%)`
                }}
            />

            <div className="relative z-20 p-6 flex flex-col h-full justify-between">
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-2.5 rounded-xl ${iconColor} bg-opacity-10 transition-transform group-hover:scale-110`}>
                        <Icon className={`w-5 h-5 ${iconColor.replace('bg-', 'text-')}`} />
                    </div>
                    {trend && (
                        <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${trend.positive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                            {trend.positive ? '+' : ''}{trend.value}%
                            <span className="hidden group-hover:inline ml-1 transition-all">{trend.label}</span>
                        </div>
                    )}
                </div>

                <div>
                    <h3 className="text-[var(--text-secondary)] text-sm font-medium mb-1">{title}</h3>
                    <div className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">{value}</div>
                    {description && (
                        <p className="text-[var(--text-tertiary)] text-xs mt-2 line-clamp-1">{description}</p>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
