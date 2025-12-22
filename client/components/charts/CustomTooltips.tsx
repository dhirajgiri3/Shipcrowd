/**
 * Custom tooltip for Recharts with rich data display
 */
export function CustomChartTooltip({ active, payload, label }: any) {
    if (!active || !payload || !payload.length) return null;

    return (
        <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-xl shadow-2xl p-4 backdrop-blur-md animate-fade-in">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                {label || 'Value'}
            </p>
            {payload.map((entry: any, index: number) => (
                <div key={index} className="flex items-center justify-between gap-4 mb-1">
                    <div className="flex items-center gap-2">
                        <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-[var(--text-secondary)] text-sm font-medium">
                            {entry.name}
                        </span>
                    </div>
                    <span className="text-[var(--text-primary)] font-bold tabular-nums">
                        {entry.value?.toLocaleString()}
                    </span>
                </div>
            ))}
        </div>
    );
}

/**
 * Tooltip for SLA/Performance metrics
 */
interface PerformanceTooltipProps {
    active?: boolean;
    payload?: any[];
    label?: string;
    showComparison?: boolean;
    previousValue?: number;
}

export function PerformanceTooltip({
    active,
    payload,
    label,
    showComparison = false,
    previousValue
}: PerformanceTooltipProps) {
    if (!active || !payload || !payload.length) return null;

    const value = payload[0].value as number;
    const change = previousValue ? ((value - previousValue) / previousValue) * 100 : 0;

    return (
        <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-xl shadow-2xl p-4 min-w-[180px]">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                {label}
            </p>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-secondary)]">Current</span>
                    <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
                        {value}%
                    </span>
                </div>

                {showComparison && previousValue && (
                    <>
                        <div className="h-px bg-[var(--border-subtle)]" />
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-[var(--text-muted)]">vs Previous</span>
                            <span className={`text-sm font-bold tabular-nums ${change >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'
                                }`}>
                                {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                            </span>
                        </div>
                    </>
                )}

                <div className="pt-2 mt-2 border-t border-[var(--border-subtle)]">
                    <div className="flex items-center gap-2 text-xs">
                        <div className={`h-2 w-2 rounded-full ${value >= 90 ? 'bg-[var(--success)]' :
                            value >= 70 ? 'bg-[var(--warning)]' :
                                'bg-[var(--error)]'
                            }`} />
                        <span className="text-[var(--text-muted)]">
                            {value >= 90 ? 'Excellent' : value >= 70 ? 'Good' : 'Needs Attention'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
