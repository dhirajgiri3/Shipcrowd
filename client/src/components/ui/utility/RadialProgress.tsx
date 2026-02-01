import { cn } from '@/src/lib/utils';

interface RadialProgressProps {
    value: number;
    max?: number;
    size?: number;
    strokeWidth?: number;
    className?: string;
    showValue?: boolean;
    color?: 'success' | 'warning' | 'error' | 'primary';
    animated?: boolean;
}

export function RadialProgress({
    value,
    max = 100,
    size = 80,
    strokeWidth = 8,
    className = '',
    showValue = true,
    color = 'primary',
    animated = true
}: RadialProgressProps) {
    const percentage = Math.min((value / max) * 100, 100);
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    // Determine color based on value and color prop
    const getColor = () => {
        if (color === 'success') return 'var(--success)';
        if (color === 'warning') return 'var(--warning)';
        if (color === 'error') return 'var(--error)';
        if (color === 'primary') return 'var(--primary-blue)';

        // Auto color based on percentage
        if (percentage >= 90) return 'var(--success)';
        if (percentage >= 70) return 'var(--warning)';
        return 'var(--error)';
    };

    const getGlow = () => {
        if (percentage >= 95) return 'drop-shadow-[0_0_8px_var(--success)]';
        if (percentage >= 90) return 'drop-shadow-[0_0_6px_var(--success)]';
        return '';
    };

    return (
        <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="var(--border-subtle)"
                    strokeWidth={strokeWidth}
                    opacity={0.2}
                />

                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={getColor()}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className={cn(
                        animated && 'transition-all duration-1000 ease-out',
                        getGlow()
                    )}
                    style={{
                        filter: percentage >= 95 ? `drop-shadow(0 0 8px ${getColor()})` : undefined
                    }}
                />
            </svg>

            {/* Center text */}
            {showValue && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={cn(
                        'text-xl font-bold tabular-nums',
                        percentage >= 90 ? 'text-[var(--success)]' :
                            percentage >= 70 ? 'text-[var(--warning)]' :
                                'text-[var(--error)]'
                    )}>
                        {Math.round(percentage)}%
                    </span>
                </div>
            )}
        </div>
    );
}
