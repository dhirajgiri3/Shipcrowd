/**
 * ChartTypeSelector Component
 * 
 * Selector for choosing chart visualization types.
 */

'use client';

import { Button } from '@/src/components/ui';
import { cn } from '@/src/lib/utils';
import { ChartType } from '@/src/types/analytics.types';
import { BarChart3, LineChart, PieChart, ScatterChart, TrendingUp } from 'lucide-react';

interface ChartTypeSelectorProps {
    value: ChartType;
    onChange: (type: ChartType) => void;
}

export function ChartTypeSelector({ value, onChange }: ChartTypeSelectorProps) {
    const types: { value: ChartType; icon: React.ReactNode; label: string }[] = [
        { value: 'line', icon: <LineChart className="w-4 h-4" />, label: 'Line' },
        { value: 'bar', icon: <BarChart3 className="w-4 h-4" />, label: 'Bar' },
        { value: 'area', icon: <TrendingUp className="w-4 h-4" />, label: 'Area' },
        { value: 'pie', icon: <PieChart className="w-4 h-4" />, label: 'Pie' },
        { value: 'scatter', icon: <ScatterChart className="w-4 h-4" />, label: 'Scatter' },
    ];

    return (
        <div className="flex items-center gap-1 bg-[var(--bg-secondary)] p-1 rounded-lg">
            {types.map((type) => (
                <Button
                    key={type.value}
                    variant={value === type.value ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => onChange(type.value)}
                    className={cn(
                        "h-8 px-2.5",
                        value === type.value
                            ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm"
                            : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    )}
                    title={type.label}
                >
                    {type.icon}
                </Button>
            ))}
        </div>
    );
}
