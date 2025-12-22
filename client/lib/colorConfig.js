/**
 * Centralized color configuration for MetricCard variants.
 * Each key corresponds to a theme color used in the dashboard.
 */
export const METRIC_COLOR_CONFIG = {
    blue: {
        bg: 'bg-[var(--primary-blue-soft)]',
        text: 'text-[var(--primary-blue)]',
        glow: 'bg-blue-500',
        gradient: 'rgba(37, 99, 235, 0.1)',
        chart: 'var(--primary-blue)'
    },
    emerald: {
        bg: 'bg-[var(--success-bg)]',
        text: 'text-[var(--success)]',
        glow: 'bg-emerald-500',
        gradient: 'rgba(16, 185, 129, 0.1)',
        chart: 'var(--success)'
    },
    violet: {
        bg: 'bg-violet-500/10',
        text: 'text-violet-600 dark:text-violet-400',
        glow: 'bg-violet-500',
        gradient: 'rgba(139, 92, 246, 0.1)',
        chart: '#8b5cf6'
    },
    amber: {
        bg: 'bg-[var(--warning-bg)]',
        text: 'text-[var(--warning)]',
        glow: 'bg-amber-500',
        gradient: 'rgba(245, 158, 11, 0.1)',
        chart: 'var(--warning)'
    }
};
