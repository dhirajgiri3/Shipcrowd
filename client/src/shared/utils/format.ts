/**
 * Format a number as currency
 */
export function formatCurrency(amount: number, currency: string = 'INR'): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount);
}

/**
 * Format a date
 */
export function formatDate(date: Date | string, format: 'short' | 'long' | 'full' = 'short'): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    const formats: Record<typeof format, Intl.DateTimeFormatOptions> = {
        short: { month: 'short', day: 'numeric', year: 'numeric' },
        long: { month: 'long', day: 'numeric', year: 'numeric' },
        full: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
    };

    return new Intl.DateTimeFormat('en-IN', formats[format]).format(dateObj);
}

/**
 * Format a relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

    const units: [string, number][] = [
        ['year', 31536000],
        ['month', 2592000],
        ['week', 604800],
        ['day', 86400],
        ['hour', 3600],
        ['minute', 60],
        ['second', 1],
    ];

    for (const [unit, secondsInUnit] of units) {
        const amount = Math.floor(diffInSeconds / secondsInUnit);
        if (amount >= 1) {
            return `${amount} ${unit}${amount > 1 ? 's' : ''} ago`;
        }
    }

    return 'just now';
}

/**
 * Truncate text to a maximum length
 */
export function truncate(text: string, maxLength: number, suffix: string = '...'): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Capitalize first letter
 */
export function capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
}
