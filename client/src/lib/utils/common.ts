import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility Functions
 * 
 * Core utilities for the Shipcrowd application.
 * Uses design tokens from design-tokens.ts for consistency.
 */

// ═══════════════════════════════════════════════════════════════════════════
// CLASS NAME UTILITY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Merge Tailwind CSS classes with proper precedence
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// ═══════════════════════════════════════════════════════════════════════════
// FORMATTING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Format number as currency with optional currency code
 * @param amount - The amount to format
 * @param currency - Currency code (default: 'INR')
 * @param options - Additional formatting options
 */
export function formatCurrency(
    amount: number,
    currency: string = 'INR',
    options?: { compact?: boolean; decimals?: number }
): string {
    const decimals = options?.decimals ?? (currency === 'INR' ? 0 : 2);

    if (options?.compact) {
        return formatCompactCurrency(amount, currency);
    }

    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(amount);
}

/**
 * Format currency with compact notation (K, L, Cr)
 * Useful for displaying large amounts in limited space
 */
export function formatCompactCurrency(amount: number, currency: string = 'INR'): string {
    const absAmount = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';
    const symbol = currency === 'INR' ? '₹' : new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency
    }).format(0).replace(/[\d.,\s]/g, '');

    // Indian number system
    if (currency === 'INR') {
        if (absAmount >= 10000000) { // >= 1 Crore
            return `${sign}${symbol}${(absAmount / 10000000).toFixed(2)}Cr`;
        } else if (absAmount >= 100000) { // >= 1 Lakh
            return `${sign}${symbol}${(absAmount / 100000).toFixed(2)}L`;
        } else if (absAmount >= 1000) { // >= 1 Thousand
            return `${sign}${symbol}${(absAmount / 1000).toFixed(1)}K`;
        }
    } else {
        // International number system (K, M, B)
        if (absAmount >= 1000000000) {
            return `${sign}${symbol}${(absAmount / 1000000000).toFixed(2)}B`;
        } else if (absAmount >= 1000000) {
            return `${sign}${symbol}${(absAmount / 1000000).toFixed(2)}M`;
        } else if (absAmount >= 1000) {
            return `${sign}${symbol}${(absAmount / 1000).toFixed(1)}K`;
        }
    }

    return formatCurrency(amount, currency);
}

/**
 * Format date string to readable format
 */
export function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

/**
 * Format date with time
 */
export function formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
}

// ═══════════════════════════════════════════════════════════════════════════
// STATUS COLOR UTILITIES
// Uses CSS custom properties from design system
// ═══════════════════════════════════════════════════════════════════════════

type StatusColorType = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary';

/**
 * Get status type from status string
 */
export function getStatusType(status: string): StatusColorType {
    const statusLower = status.toLowerCase();

    // Success states
    if (['delivered', 'active', 'paid', 'shipped', 'completed', 'verified', 'approved'].includes(statusLower)) {
        return 'success';
    }

    // Info/In-progress states
    if (['in-transit', 'processing', 'pending review', 'in progress'].includes(statusLower)) {
        return 'info';
    }

    // Warning states
    if (['pending', 'ndr', 'starter', 'awaiting', 'incomplete'].includes(statusLower)) {
        return 'warning';
    }

    // Error states
    if (['rto', 'cancelled', 'failed', 'suspended', 'inactive', 'rejected', 'issue'].includes(statusLower)) {
        return 'error';
    }

    return 'neutral';
}

/**
 * Get CSS classes for status using design tokens
 * @deprecated Use Badge component with variant prop instead
 */
export const getStatusColor = (status: string): string => {
    const type = getStatusType(status);

    const colorMap: Record<StatusColorType, string> = {
        success: 'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success)]/20',
        warning: 'bg-[var(--warning-bg)] text-[var(--warning)] border-[var(--warning)]/20',
        error: 'bg-[var(--error-bg)] text-[var(--error)] border-[var(--error)]/20',
        info: 'bg-[var(--info-bg)] text-[var(--info)] border-[var(--info)]/20',
        neutral: 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-subtle)]',
        primary: 'bg-[var(--primary-blue-soft)] text-[var(--primary-blue)] border-[var(--primary-blue)]/20',
    };

    return colorMap[type];
};

// ═══════════════════════════════════════════════════════════════════════════
// OTHER UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Truncate text with ellipsis
 */
export function truncate(str: string, length: number, suffix: string = '...'): string {
    if (str.length <= length) return str;
    return str.slice(0, length - suffix.length) + suffix;
}

/**
 * Capitalize first letter of a string
 */
export function capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Format file size in human-readable format
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

/**
 * Generate initials from name
 */
export function getInitials(name: string): string {
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: unknown[]) => void>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

/**
 * Format bytes to human-readable format (for memory usage)
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format duration in seconds to human-readable format
 */
export function formatDuration(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts: string[] = [];

    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
}
