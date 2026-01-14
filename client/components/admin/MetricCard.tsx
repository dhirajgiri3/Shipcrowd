"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/core/Card';
import { cn } from '@/src/lib/utils';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface MetricCardProps {
    title: string;
    value: string;
    change?: number;
    trend?: 'up' | 'down' | 'neutral';
    icon: any;
    trendLabel?: string;
    className?: string;
}

// Animated counter hook
function useAnimatedCounter(end: number, duration: number = 1000) {
    const [count, setCount] = useState(0);
    const countRef = useRef(0);
    const startTimeRef = useRef<number | null>(null);

    useEffect(() => {
        const animate = (timestamp: number) => {
            if (!startTimeRef.current) startTimeRef.current = timestamp;
            const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);

            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentCount = Math.floor(easeOutQuart * end);

            if (currentCount !== countRef.current) {
                countRef.current = currentCount;
                setCount(currentCount);
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setCount(end);
            }
        };

        startTimeRef.current = null;
        requestAnimationFrame(animate);
    }, [end, duration]);

    return count;
}

export function MetricCard({ title, value, change, trend, icon: Icon, trendLabel = "from last month", className }: MetricCardProps) {
    // Parse numeric value for animation
    const numericValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
    const isNumeric = !isNaN(numericValue);
    const animatedValue = useAnimatedCounter(isNumeric ? numericValue : 0, 1200);

    // Format the animated value to match original format
    const formatValue = (num: number) => {
        if (value.includes('₹')) {
            return `₹${num.toLocaleString('en-IN')}`;
        }
        if (value.includes('%')) {
            return `${num.toFixed(1)}%`;
        }
        if (value.includes(',')) {
            return num.toLocaleString('en-IN');
        }
        return num.toString();
    };

    const displayValue = isNumeric ? formatValue(animatedValue) : value;

    return (
        <Card className={cn("hover:shadow-md transition-all duration-300 hover:-translate-y-1", className)}>
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div className="p-2 bg-[#2525FF]/5 rounded-lg">
                        <Icon className="h-5 w-5 text-[#2525FF]" />
                    </div>
                    {trend && change !== undefined && (
                        <div className={cn(
                            "flex items-center text-xs font-medium px-2 py-0.5 rounded-full",
                            trend === 'up' ? "bg-emerald-50 text-emerald-700" :
                                trend === 'down' ? "bg-rose-50 text-rose-700" : "bg-gray-100 text-gray-700"
                        )}>
                            {trend === 'up' && <ArrowUpRight className="h-3 w-3 mr-1" />}
                            {trend === 'down' && <ArrowDownRight className="h-3 w-3 mr-1" />}
                            {trend === 'neutral' && <Minus className="h-3 w-3 mr-1" />}
                            {change}%
                        </div>
                    )}
                </div>
                <div className="mt-4">
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1 tracking-tight tabular-nums">
                        {displayValue}
                    </h3>
                    {trend && <p className="text-xs text-gray-400 mt-1">{trendLabel}</p>}
                </div>
            </CardContent>
        </Card>
    );
}
